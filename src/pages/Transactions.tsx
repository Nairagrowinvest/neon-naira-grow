import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Users } from "lucide-react";

export default function Transactions() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownRight className="h-4 w-4 text-glow-cyan" />;
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-glow-pink" />;
      case "investment":
        return <TrendingUp className="h-4 w-4 text-glow-purple" />;
      case "profit":
        return <DollarSign className="h-4 w-4 text-glow-cyan" />;
      case "referral_bonus":
        return <Users className="h-4 w-4 text-glow-purple" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Transaction History
      </h1>

      <Card className="gradient-card border-glow-purple">
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading transactions...</p>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span className="capitalize">{transaction.type.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.description || "-"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₦{parseFloat(transaction.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(transaction.created_at), "MMM dd, yyyy HH:mm")}
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