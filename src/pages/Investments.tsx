import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { InvestmentModal } from "@/components/InvestmentModal";
import { format } from "date-fns";

export default function Investments() {
  const [showInvestModal, setShowInvestModal] = useState(false);

  const { data: investments, isLoading } = useQuery({
    queryKey: ["all-investments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-glow-cyan";
      case "completed":
        return "text-glow-purple";
      case "cancelled":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          My Investments
        </h1>
        <Button
          onClick={() => setShowInvestModal(true)}
          className="gradient-primary border-glow-purple glow-purple"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Investment
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading investments...</p>
      ) : !investments || investments.length === 0 ? (
        <Card className="gradient-card border-glow-purple">
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
            <p className="text-lg text-muted-foreground mb-4">No investments yet</p>
            <Button
              onClick={() => setShowInvestModal(true)}
              className="gradient-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start Investing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {investments.map((investment: any) => (
            <Card key={investment.id} className="gradient-card border-glow-cyan glow-cyan">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>₦{parseFloat(investment.amount).toLocaleString()}</span>
                  <span className={`text-sm font-medium ${getStatusColor(investment.status)}`}>
                    {investment.status.toUpperCase()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profit:</span>
                  <span className="text-glow-purple font-semibold">
                    {investment.profit_percentage}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected Return:</span>
                  <span className="text-glow-cyan font-semibold">
                    ₦{(parseFloat(investment.amount) * (1 + investment.profit_percentage / 100)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span>{format(new Date(investment.start_date), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">End Date:</span>
                  <span>{format(new Date(investment.end_date), "MMM dd, yyyy")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InvestmentModal open={showInvestModal} onOpenChange={setShowInvestModal} />
    </div>
  );
}