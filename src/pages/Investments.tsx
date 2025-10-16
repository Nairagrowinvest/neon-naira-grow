import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Clock } from "lucide-react";
import { InvestmentModal } from "@/components/InvestmentModal";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";

export default function Investments() {
  const [showInvestModal, setShowInvestModal] = useState(false);
  const queryClient = useQueryClient();

  // Call function to complete expired investments
  const { mutate: checkInvestments } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('complete_expired_investments');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-investments"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

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

  // Check for expired investments on mount and every minute
  useEffect(() => {
    checkInvestments();
    const interval = setInterval(() => {
      checkInvestments();
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const getCountdown = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    
    if (now >= end) return "Completed";
    
    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now) % 24;
    const minutes = differenceInMinutes(end, now) % 60;
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

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
                {investment.status === 'active' && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 mb-3">
                    <Clock className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm font-semibold text-primary">
                      {getCountdown(investment.end_date)}
                    </span>
                  </div>
                )}
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