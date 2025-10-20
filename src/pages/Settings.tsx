import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Download } from "lucide-react";
import { WithdrawalModal } from "@/components/WithdrawalModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Settings() {
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
        return "default";
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Withdrawals
      </h1>

      <Card className="gradient-card border-glow-purple glow-purple">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Available Balance</span>
            <Button
              onClick={() => setShowWithdrawalModal(true)}
              className="gradient-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ₦{profile?.total_balance?.toLocaleString() ?? "0"}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This is your available balance for withdrawal
          </p>
        </CardContent>
      </Card>

      <Card className="gradient-card border-glow-cyan glow-cyan">
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          {!withdrawals || withdrawals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No withdrawal requests yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal: any) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-semibold">
                        ₦{parseFloat(withdrawal.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{withdrawal.bank_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.account_name}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.account_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(withdrawal.status)}>
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(withdrawal.created_at), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <WithdrawalModal
        open={showWithdrawalModal}
        onOpenChange={setShowWithdrawalModal}
        maxAmount={Number(profile?.total_balance || 0)}
      />
    </div>
  );
}