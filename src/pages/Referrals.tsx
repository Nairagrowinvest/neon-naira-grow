import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { StatsCard } from "@/components/StatsCard";

export default function Referrals() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-referral"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: referrals } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("referrals")
        .select("*, referred:profiles!referrals_referred_id_fkey(*)")
        .eq("referrer_id", user.id);

      if (error) throw error;
      return data || [];
    },
  });

  const referralLink = profile?.referral_code 
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Referral Program
      </h1>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Referrals"
          value={referrals?.length.toString() || "0"}
          icon={Users}
          glowColor="purple"
        />
        <StatsCard
          title="Referral Bonus"
          value={`₦${profile?.total_referral_bonus.toLocaleString() || "0"}`}
          icon={Users}
          glowColor="cyan"
        />
        <StatsCard
          title="Active Referrals"
          value={referrals?.filter((r: any) => r.first_investment_completed).length.toString() || "0"}
          icon={Users}
          glowColor="pink"
        />
      </div>

      <Card className="gradient-card border-glow-purple glow-purple">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Share your unique referral link and earn 10% bonus when your referrals make their first investment!
          </p>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="gradient-input"
            />
            <Button
              onClick={copyToClipboard}
              className="gradient-primary shrink-0"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold mb-2">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Share your referral link with friends</li>
              <li>They sign up using your link</li>
              <li>When they make their first investment, you earn 10% bonus</li>
              <li>Bonuses are added to your balance automatically</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="gradient-card border-glow-cyan glow-cyan">
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {!referrals || referrals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No referrals yet. Share your link to start earning!
            </p>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral: any) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-glow-cyan/20"
                >
                  <div>
                    <p className="font-semibold">{referral.referred?.email || "User"}</p>
                    <p className="text-sm text-muted-foreground">
                      {referral.first_investment_completed ? "Active" : "Pending first investment"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-glow-purple">
                      ₦{parseFloat(referral.bonus_amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Bonus earned</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}