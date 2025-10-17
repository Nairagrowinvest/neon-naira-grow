import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Users, DollarSign, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { StatsCard } from "@/components/StatsCard";
import { toast as sonnerToast } from "sonner";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*, profiles!withdrawal_requests_user_id_fkey(email, full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: pendingInvestments, isLoading: investmentsLoading } = useQuery({
    queryKey: ["admin-pending-investments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*, profiles!investments_user_id_fkey(email, full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data: totalUsers } = await supabase
        .from("profiles")
        .select("id", { count: "exact" });
      
      const { data: pendingWithdrawals } = await supabase
        .from("withdrawal_requests")
        .select("amount", { count: "exact" })
        .eq("status", "pending");

      const { data: totalInvestments } = await supabase
        .from("investments")
        .select("amount");

      const totalInvestedAmount = totalInvestments?.reduce(
        (sum, inv) => sum + parseFloat(inv.amount.toString()),
        0
      ) || 0;

      // Get referral data for each withdrawal user
      const { data: referrals } = await supabase
        .from("referrals")
        .select("referred_id, referrer_id");

      return {
        totalUsers: totalUsers?.length || 0,
        pendingWithdrawals: pendingWithdrawals?.length || 0,
        totalInvested: totalInvestedAmount,
        referrals: referrals || [],
      };
    },
  });

  // Check if user has invited someone
  const hasInvited = (userId: string) => {
    return stats?.referrals?.some((r) => r.referrer_id === userId) || false;
  };

  const updateWithdrawal = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({ 
          status,
          processed_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `Withdrawal ${variables.status}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveInvestment = useMutation({
    mutationFn: async ({ id, userId, amount }: { id: string; userId: string; amount: number }) => {
      // Update investment status to active
      const { error: investError } = await supabase
        .from("investments")
        .update({ 
          status: "active",
          start_date: new Date().toISOString()
        })
        .eq("id", id);

      if (investError) throw investError;

      // Deduct amount from user's balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_balance")
        .eq("id", userId)
        .single();

      const currentBalance = profile?.total_balance || 0;
      
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ total_balance: currentBalance - amount })
        .eq("id", userId);

      if (balanceError) throw balanceError;

      // Create notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "Investment Approved",
          message: `Your investment of ₦${amount.toLocaleString()} has been approved and is now active!`
        });

      if (notifError) throw notifError;
    },
    onSuccess: () => {
      sonnerToast.success("Investment approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-pending-investments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => {
      sonnerToast.error("Failed to approve investment: " + error.message);
    },
  });

  const rejectInvestment = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      // Update investment status to rejected
      const { error: investError } = await supabase
        .from("investments")
        .update({ status: "rejected" })
        .eq("id", id);

      if (investError) throw investError;

      // Create notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "Investment Rejected",
          message: "Your investment request has been rejected. Please contact support for more information."
        });

      if (notifError) throw notifError;
    },
    onSuccess: () => {
      sonnerToast.success("Investment rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-pending-investments"] });
    },
    onError: (error: Error) => {
      sonnerToast.error("Failed to reject investment: " + error.message);
    },
  });

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "approved":
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Admin Dashboard
      </h1>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers.toString() || "0"}
          icon={Users}
          glowColor="purple"
        />
        <StatsCard
          title="Pending Withdrawals"
          value={stats?.pendingWithdrawals.toString() || "0"}
          icon={XCircle}
          glowColor="cyan"
        />
        <StatsCard
          title="Total Invested"
          value={`₦${stats?.totalInvested.toLocaleString() || "0"}`}
          icon={DollarSign}
          glowColor="pink"
        />
      </div>

      <Card className="gradient-card border-glow-cyan glow-cyan">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Investments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {investmentsLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : !pendingInvestments || pendingInvestments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending investments</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Expected Return</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvestments.map((investment: any) => (
                    <TableRow key={investment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{investment.profiles?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{investment.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₦{parseFloat(investment.amount.toString()).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-secondary font-medium">
                        ₦{(parseFloat(investment.amount.toString()) * 1.7).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(investment.created_at), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveInvestment.mutate({ 
                              id: investment.id, 
                              userId: investment.user_id,
                              amount: parseFloat(investment.amount.toString())
                            })}
                            disabled={approveInvestment.isPending}
                            className="gradient-primary"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectInvestment.mutate({ 
                              id: investment.id,
                              userId: investment.user_id
                            })}
                            disabled={rejectInvestment.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gradient-card border-glow-purple glow-purple">
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : !withdrawals || withdrawals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No withdrawal requests</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Referred</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal: any) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.profiles?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₦{parseFloat(withdrawal.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{withdrawal.bank_name}</p>
                          <p className="text-sm">{withdrawal.account_name}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.account_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={hasInvited(withdrawal.user_id) ? "default" : "secondary"}>
                          {hasInvited(withdrawal.user_id) ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(withdrawal.status)}>
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(withdrawal.created_at), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {withdrawal.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateWithdrawal.mutate({ id: withdrawal.id, status: "approved" })}
                              disabled={updateWithdrawal.isPending}
                              className="gradient-primary"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateWithdrawal.mutate({ id: withdrawal.id, status: "rejected" })}
                              disabled={updateWithdrawal.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
