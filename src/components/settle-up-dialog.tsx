
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  simplifyDebts,
  type SimplifiedDebt,
} from '@/services/debt-simplification';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowRight, Wallet } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  payers: { [email: string]: number };
  splitBetween: string[];
  splitType: 'equal' | 'unequal' | 'payment';
  splitDetails?: { [email: string]: number };
  createdAt?: any;
  createdBy: string;
}

interface Member {
  id: string;
  email?: string;
}

interface SettleUpDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  groupId: string;
  members: Member[];
  expenses: Expense[];
}

export function SettleUpDialog({
  isOpen,
  setIsOpen,
  groupId,
  members,
  expenses,
}: SettleUpDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebt[]>([]);
  const [paymentAmounts, setPaymentAmounts] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);


  useEffect(() => {
    if (isOpen) {
      const debts = simplifyDebts(expenses, members);
      setSimplifiedDebts(debts);
      const initialAmounts = debts.reduce((acc, debt, index) => {
        acc[`debt-${index}`] = debt.amount;
        return acc;
      }, {} as {[key: string]: number});
      setPaymentAmounts(initialAmounts);
    }
  }, [isOpen, expenses, members]);

  const handleAmountChange = (key: string, value: string, maxAmount: number) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0) {
        setPaymentAmounts(prev => ({...prev, [key]: 0}));
    } else if (numericValue > maxAmount) {
        setPaymentAmounts(prev => ({...prev, [key]: maxAmount}));
    } else {
        setPaymentAmounts(prev => ({...prev, [key]: numericValue}));
    }
  };


  async function handleRecordPayment(debt: SimplifiedDebt, amount: number, key: string) {
    if (!user || !debt) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No user or payment selected.',
      });
      return;
    }
     if (!amount || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Payment amount must be greater than zero.',
      });
      return;
    }

    setIsSubmitting(key);

    const paymentData = {
      description: `Payment from ${
        debt.from.split('@')[0]
      } to ${debt.to.split('@')[0]}`,
      amount: amount,
      payers: { [debt.from]: amount },
      splitType: 'payment',
      splitBetween: [debt.to],
      splitDetails: { [debt.to]: amount },
      paymentDetails: {
        method: 'Settlement',
        notes: `Recorded via Settle Up feature.`,
      },
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'groups', groupId, 'expenses'), paymentData);
      toast({
        title: 'Payment Recorded',
        description: 'The settlement has been successfully recorded.',
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message,
      });
    } finally {
        setIsSubmitting(null);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
            <DialogTitle>Settle Up</DialogTitle>
            <DialogDescription>
            Record payments to settle debts. You can record partial payments by editing the amount.
            </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            {simplifiedDebts.length > 0 ? (
            simplifiedDebts.map((debt, index) => {
                const key = `debt-${index}`;
                return (
                <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-md"
                >
                    <div className="flex items-center gap-2 font-medium text-sm flex-wrap">
                        <span>{debt.from.split('@')[0]}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span>{debt.to.split('@')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                            <Input
                                type="number"
                                value={paymentAmounts[key] ?? ''}
                                onChange={(e) => handleAmountChange(key, e.target.value, debt.amount)}
                                className="pl-6 h-10 text-base"
                                step="0.01"
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRecordPayment(debt, paymentAmounts[key], key)}
                            disabled={isSubmitting === key}
                        >
                            <Wallet className="mr-2 h-4 w-4" /> 
                            {isSubmitting === key ? 'Recording...' : 'Record'}
                        </Button>
                    </div>
                </div>
            )})
            ) : (
            <Alert>
                <AlertDescription className="text-center">
                All debts are settled. There is nothing to do!
                </AlertDescription>
            </Alert>
            )}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
