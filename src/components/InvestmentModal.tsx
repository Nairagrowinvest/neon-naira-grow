import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { z } from "zod";

const investmentSchema = z.object({
  amount: z.number()
    .min(2500, "Minimum investment amount is ₦2,500")
    .max(10000000, "Maximum investment amount is ₦10,000,000")
    .positive("Amount must be positive")
});

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

      // Create investment with pending status
      const { data: investment, error: investError } = await (supabase as any)
        .from("investments")
        .insert({
          user_id: user.id,
          amount: investmentAmount,
          status: "pending",
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
      toast.success("Payment request submitted! Please transfer to the bank account shown and wait for admin approval.");
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

    if (isNaN(investAmount)) {
      toast.error("Please enter a valid number");
      return;
    }

    // Validate using zod schema
    const validation = investmentSchema.safeParse({ amount: investAmount });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
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

        <div className="p-4 rounded-lg bg-muted/30 border border-glow-cyan/30 space-y-3">
          <h3 className="font-semibold text-primary">Payment Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Bank Name:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">Sterling Bank</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText("Sterling Bank");
                    toast.success("Bank name copied!");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account Name:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">More4less Nairagrow FLW</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText("More4less Nairagrow FLW");
                    toast.success("Account name copied!");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary">8817827080</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText("8817827080");
                    toast.success("Account number copied!");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Transfer the investment amount to this account and submit the form. Admin will approve once payment is confirmed.
          </p>
        </div>

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
            {investMutation.isPending ? "Submitting..." : "Submit Investment Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
