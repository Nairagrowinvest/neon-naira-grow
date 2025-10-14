import { useState } from "react";
import { Wallet, TrendingUp, DollarSign, Users, Plus } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { InvestmentModal } from "@/components/InvestmentModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function Dashboard() {
  const [showInvestModal, setShowInvestModal] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: investments } = await (supabase as any)
        .from("investments")
        .select("*")
        .eq("user_id", user.id);

      const activeInvestments = investments?.filter((i: any) => i.status === "active") || [];
      const completedInvestments = investments?.filter((i: any) => i.status === "completed") || [];

      return {
        totalBalance: profile?.total_balance || 0,
        totalInvestment: investments?.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0) || 0,
        totalEarnings: profile?.total_earnings || 0,
        referralBonus: profile?.total_referral_bonus || 0,
        activeCount: activeInvestments.length,
        completedCount: completedInvestments.length,
      };
    },
  });

  const { data: recentInvestments } = useQuery({
    queryKey: ["recent-investments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await (supabase as any)
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      return data || [];
    },
  });

  // Mock data for charts
  const growthData = [
    { name: "Mon", investment: 4000, profit: 2400 },
    { name: "Tue", investment: 3000, profit: 1398 },
    { name: "Wed", investment: 2000, profit: 9800 },
    { name: "Thu", investment: 2780, profit: 3908 },
    { name: "Fri", investment: 1890, profit: 4800 },
    { name: "Sat", investment: 2390, profit: 3800 },
    { name: "Sun", investment: 3490, profit: 4300 },
  ];

  const distributionData = [
    { name: "Active", value: stats?.activeCount || 0, color: "hsl(var(--glow-purple))" },
    { name: "Completed", value: stats?.completedCount || 0, color: "hsl(var(--glow-cyan))" },
    { name: "Pending", value: 0, color: "hsl(var(--glow-pink))" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Balance"
          value={`₦${stats?.totalBalance.toLocaleString() || "0"}`}
          icon={Wallet}
          trend="+20.1% from last month"
          glowColor="purple"
        />
        <StatsCard
          title="Total Investment"
          value={`₦${stats?.totalInvestment.toLocaleString() || "0"}`}
          icon={TrendingUp}
          trend="+15.3% from last month"
          glowColor="cyan"
        />
        <StatsCard
          title="Total Earnings"
          value={`₦${stats?.totalEarnings.toLocaleString() || "0"}`}
          icon={DollarSign}
          trend="+18.7% from last month"
          glowColor="pink"
        />
        <StatsCard
          title="Referral Bonus"
          value={`₦${stats?.referralBonus.toLocaleString() || "0"}`}
          icon={Users}
          trend="Active referrals"
          glowColor="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="gradient-card border-glow-purple glow-purple">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Investment Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="investment" 
                  stroke="hsl(var(--glow-purple))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--glow-purple))", r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="hsl(var(--glow-cyan))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--glow-cyan))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="gradient-card border-glow-cyan glow-cyan">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Investment Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Investments */}
      <Card className="gradient-card border-glow-pink glow-pink">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Recent Investments
          </CardTitle>
          <Button 
            onClick={() => setShowInvestModal(true)}
            className="gradient-primary border-glow-purple glow-purple"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Investment
          </Button>
        </CardHeader>
        <CardContent>
          {!recentInvestments || recentInvestments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No investments yet. Start investing today!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentInvestments.map((investment: any) => (
                <div
                  key={investment.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-glow-purple/20 hover:border-glow-purple/50 transition-all"
                >
                  <div>
                    <p className="font-semibold">₦{parseFloat(investment.amount).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Profit: ₦{(parseFloat(investment.amount) * 0.7).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      investment.status === "active" ? "text-primary" :
                      investment.status === "completed" ? "text-secondary" :
                      "text-muted-foreground"
                    }`}>
                      {investment.status.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">7 days</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InvestmentModal open={showInvestModal} onOpenChange={setShowInvestModal} />
    </div>
  );
}
