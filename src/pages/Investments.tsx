import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InvestmentModal } from "@/components/InvestmentModal";
import { toast } from "sonner";
import { Loader2, TrendingUp, DollarSign, Calendar, Gift, Clock, Plus } from "lucide-react";

export default function Investments() {
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: claimPayout, isPending: isClaimingPayout } = useMutation({
    mutationFn: async (investmentId: string) => {
      const { data, error } = await supabase.rpc('claim_daily_payout', { 
        p_investment_id: investmentId 
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data: any) => {
      toast.success(`Claimed ₦${Number(data.total).toLocaleString()}! (Day ${data.day}/7)`, {
        description: `₦${Number(data.profit).toLocaleString()} profit + ₦${Number(data.bonus).toLocaleString()} bonus`
      });
      queryClient.invalidateQueries({ queryKey: ["all-investments"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["investment-payouts"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
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

  // Fetch investment payouts for tracking
  const { data: payouts } = useQuery({
    queryKey: ["investment-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_payouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getCountdown = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from start
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Completed";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const getCurrentDay = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const daysPassed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(Math.max(daysPassed, 1), 7);
  };

  const canClaimToday = (investment: any) => {
    if (investment.status !== 'active') return false;
    const currentDay = getCurrentDay(investment.start_date);
    if (currentDay > 7) return false;
    
    // Check if already claimed today
    const today = new Date().toDateString();
    const lastClaim = investment.last_payout_date ? new Date(investment.last_payout_date).toDateString() : null;
    return lastClaim !== today;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "completed":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            My Investments
          </h1>
          <p className="text-muted-foreground mt-1">Claim daily profits and bonuses</p>
        </div>
        <Button
          onClick={() => setShowInvestmentModal(true)}
          className="gradient-primary border-glow-purple glow-purple"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Investment
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !investments || investments.length === 0 ? (
        <Card className="gradient-card border-glow-purple">
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
            <p className="text-lg text-muted-foreground mb-4">No investments yet</p>
            <Button
              onClick={() => setShowInvestmentModal(true)}
              className="gradient-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start Investing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {investments.map((investment: any) => {
            const dailyProfit = investment.daily_profit_amount || 0;
            const totalProfit = dailyProfit * 7;
            const totalReturn = investment.amount + totalProfit;
            const currentDay = getCurrentDay(investment.start_date);
            const progress = (investment.days_completed / 7) * 100;

            return (
              <Card key={investment.id} className="gradient-card border border-glow-purple">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">₦{investment.amount.toLocaleString()}</CardTitle>
                      <CardDescription>
                        Started {new Date(investment.start_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(investment.status)}>
                      {investment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {investment.status === "active" && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">Day {investment.days_completed}/7</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Time Remaining
                        </p>
                        <p className="text-sm font-medium">{getCountdown(investment.start_date)}</p>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Daily Profit
                      </p>
                      <p className="text-lg font-semibold text-primary">
                        ₦{dailyProfit.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Daily Bonus
                      </p>
                      <p className="text-lg font-semibold text-accent">
                        ₦20
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Total Return (7 days)
                    </p>
                    <p className="text-lg font-semibold text-accent">
                      ₦{totalReturn.toLocaleString()} + ₦140 bonus
                    </p>
                  </div>

                  {investment.status === "active" && canClaimToday(investment) && (
                    <Button
                      onClick={() => claimPayout(investment.id)}
                      className="w-full"
                      size="lg"
                      disabled={isClaimingPayout}
                    >
                      {isClaimingPayout ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <Gift className="mr-2 h-4 w-4" />
                          Claim Day {currentDay} Payout (₦{(dailyProfit + 20).toLocaleString()})
                        </>
                      )}
                    </Button>
                  )}

                  {investment.status === "active" && !canClaimToday(investment) && (
                    <Button
                      disabled
                      className="w-full"
                      size="lg"
                      variant="outline"
                    >
                      Already Claimed Today
                    </Button>
                  )}

                  {investment.status === "pending" && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Waiting for admin approval
                    </div>
                  )}

                  {investment.status === "completed" && (
                    <div className="text-sm text-primary text-center py-2 font-semibold">
                      Investment Completed ✓
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InvestmentModal open={showInvestmentModal} onOpenChange={setShowInvestmentModal} />
    </div>
  );
}
