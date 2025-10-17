import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign } from "lucide-react";
import { z } from "zod";

const withdrawalSchema = z.object({
  amount: z.number()
    .min(100, "Minimum withdrawal amount is ₦100")
    .positive("Amount must be positive"),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string()
    .length(10, "Account number must be exactly 10 digits")
    .regex(/^\d+$/, "Account number must contain only digits"),
  accountName: z.string()
    .min(2, "Account name must be at least 2 characters")
    .max(100, "Account name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Account name must contain only letters and spaces")
});

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxAmount: number;
}

const NIGERIAN_BANKS = [
  "Access Bank",
  "Ecobank",
  "FCMB",
  "Fidelity Bank",
  "First Bank",
  "GTBank",
  "Kuda Bank",
  "Moniepoint",
  "Opay",
  "Palmpay",
  "Polaris Bank",
  "Stanbic IBTC",
  "Sterling Bank",
  "UBA",
  "Union Bank",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
];

export function WithdrawalModal({ open, onOpenChange, maxAmount }: WithdrawalModalProps) {
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createWithdrawal = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const withdrawalAmount = parseFloat(amount);
      if (withdrawalAmount > maxAmount) {
        throw new Error(`Maximum withdrawal amount is ₦${maxAmount.toLocaleString()}`);
      }

      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      onOpenChange(false);
      setAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !bankName || !accountNumber || !accountName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Validate using zod schema
    const validation = withdrawalSchema.safeParse({
      amount: parseFloat(amount),
      bankName,
      accountNumber,
      accountName
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    createWithdrawal.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gradient-card border-glow-purple">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <DollarSign className="h-6 w-6 text-primary" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Request a withdrawal to your bank account. Maximum available: ₦{maxAmount.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              min="100"
              max={maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="gradient-input"
            />
          </div>

          <div>
            <Label htmlFor="bank">Bank</Label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger className="gradient-input">
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              type="text"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="0123456789"
              className="gradient-input"
            />
          </div>

          <div>
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="John Doe"
              className="gradient-input"
            />
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary"
            disabled={createWithdrawal.isPending}
          >
            {createWithdrawal.isPending ? "Processing..." : "Request Withdrawal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}