import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvestmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvestmentModal({ open, onOpenChange }: InvestmentModalProps) {
  const [amount, setAmount] = useState("");
  const queryClient = useQueryClient();

  const investMutation = useMutation({
    mutationFn: async (investmentAmount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create investment
      const { data: investment, error: investError } = await (supabase as any)
        .from("investments")
        .insert({
          user_id: user.id,
          amount: investmentAmount,
          status: "active",
        })
        .select()
        .single();

      if (investError) throw investError;
      if (!investment) throw new Error("Failed to create investment");

      // Create transaction
      const { error: txError } = await (supabase as any)
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "investment",
          amount: investmentAmount,
          investment_id: investment.id,
          description: "Investment created",
        });

      if (txError) throw txError;

      return investment;
    },
    onSuccess: () => {
      toast.success("Investment created successfully!");
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setAmount("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to create investment: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const investAmount = parseFloat(amount);

    if (isNaN(investAmount) || investAmount < 2500) {
      toast.error("Minimum investment is ₦2,500");
      return;
    }

    investMutation.mutate(investAmount);
  };

  const expectedReturn = amount ? (parseFloat(amount) * 1.7).toFixed(2) : "0";
  const profit = amount ? (parseFloat(amount) * 0.7).toFixed(2) : "0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gradient-card border-glow-purple glow-purple">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            New Investment
          </DialogTitle>
          <DialogDescription>
            Start earning 70% profit in just 7 days. Minimum investment: ₦2,500
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Investment Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              min="2500"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="border-glow-purple/50"
            />
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-glow-cyan/30 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Investment:</span>
              <span className="font-semibold">₦{amount || "0"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profit (70%):</span>
              <span className="font-semibold text-secondary">₦{profit}</span>
            </div>
            <div className="flex justify-between border-t border-glow-purple/30 pt-2">
              <span className="text-muted-foreground">Total Return:</span>
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ₦{expectedReturn}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration:</span>
              <span className="text-muted-foreground">7 days</span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary border-glow-purple glow-purple"
            disabled={investMutation.isPending}
          >
            {investMutation.isPending ? "Creating..." : "Invest Now"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
