
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { EXPENSE_CATEGORIES, DEFAULT_CATEGORY } from '@/lib/expense-categories';
import { getUserFriendlyErrorMessage, getErrorTitle } from '@/utils/error-messages';

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'wallet', label: 'Digital Wallet' },
  { value: 'other', label: 'Other' },
];

const expenseFormSchema = z.object({
    description: z.string().min(1, 'Description is required.'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
    category: z.string().default(DEFAULT_CATEGORY),
    paymentType: z.string().optional(),
    notes: z.string().optional(),
    expenseDate: z.string().optional(),
    paidBySingle: z.string().email().optional(),
    paidByMultiple: z.array(z.object({
        email: z.string().email(),
        amount: z.coerce.number(),
    })).optional(),
    splitType: z.enum(['equal', 'unequal', 'payment']),
    splitBetween: z.array(z.string().email()).min(1, 'You must select at least one member to split with.'),
    unequalSplitDetails: z.array(z.object({
        email: z.string().email(),
        amount: z.coerce.number(),
    })).optional(),
}).refine(data => {
    if (data.splitType === 'unequal') {
        const totalSplit = data.unequalSplitDetails?.reduce((sum, item) => sum + (item.amount || 0), 0) ?? 0;
        return Math.abs(totalSplit - data.amount) < 0.01;
    }
    return true;
}, {
    message: 'The sum of unequal splits must equal the total expense amount.',
    path: ['unequalSplitDetails'],
}).refine(data => {
    // This validation logic will be handled dynamically based on isMultiPayer state
    return true;
});


interface Expense {
    id: string;
    description: string;
    amount: number;
    category?: string;
    paymentType?: string;
    notes?: string;
    expenseDate?: string;
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
    name?: string;
    displayName?: string;
}

interface AddExpenseDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  groupId: string;
  members: Member[];
  expenseToEdit?: Expense | null;
}

export function AddExpenseDialog({
  isOpen,
  setIsOpen,
  groupId,
  members = [],
  expenseToEdit = null,
}: AddExpenseDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  
  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
  });

  const { replace: replaceUnequal } = useFieldArray({
    control: form.control,
    name: "unequalSplitDetails",
  });
  
  const { replace: replaceMultiplePayers } = useFieldArray({
    control: form.control,
    name: 'paidByMultiple',
  });

  const splitType = form.watch('splitType');
  const amount = form.watch('amount');
  const splitBetween = form.watch('splitBetween');


  const initializeForm = useCallback(() => {
    const memberEmails = members.map(m => m.email!).filter(Boolean);
      
    if (expenseToEdit) {
      const payerEmails = Object.keys(expenseToEdit.payers || {});
      const isEditMultiPayer = payerEmails.length > 1;
      setIsMultiPayer(isEditMultiPayer);

      form.reset({
        description: expenseToEdit.description,
        amount: expenseToEdit.amount,
        category: expenseToEdit.category || DEFAULT_CATEGORY,
        paymentType: expenseToEdit.paymentType || '',
        notes: expenseToEdit.notes || '',
        expenseDate: expenseToEdit.expenseDate || '',
        paidBySingle: !isEditMultiPayer ? payerEmails[0] : user?.email ?? '',
        paidByMultiple: memberEmails.map(email => ({
          email,
          amount: expenseToEdit.payers?.[email] ?? 0
        })),
        splitType: expenseToEdit.splitType,
        splitBetween: expenseToEdit.splitBetween,
        unequalSplitDetails: memberEmails.map(email => ({
          email,
          amount: expenseToEdit.splitType === 'unequal'
            ? (expenseToEdit.splitDetails?.[email] ?? 0)
            : (expenseToEdit.splitBetween.includes(email) ? expenseToEdit.amount / expenseToEdit.splitBetween.length : 0)
        }))
      });
    } else {
      setIsMultiPayer(false);
      const allMemberEmails = members.map(m => m.email!);
      
      // Get current date in YYYY-MM-DD format
      const today = new Date();
      const currentDate = today.getFullYear() + '-' + 
                         String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(today.getDate()).padStart(2, '0');

      form.reset({
        description: '',
        amount: 0,
        category: DEFAULT_CATEGORY,
        paymentType: '',
        notes: '',
        expenseDate: currentDate,
        paidBySingle: user?.email ?? '',
        paidByMultiple: allMemberEmails.map(m => ({ email: m, amount: 0 })),
        splitType: 'equal',
        splitBetween: allMemberEmails,
        unequalSplitDetails: allMemberEmails.map(m => ({ email: m, amount: 0 }))
      });
    }
  }, [expenseToEdit, members, user, form]);

  useEffect(() => {
    if (isOpen) {
        initializeForm();
    }
  }, [isOpen, initializeForm]);


  useEffect(() => {
    if (!isOpen) return;
    
    const memberEmails = members.map(m => m.email!);
    
    replaceUnequal(memberEmails.map(email => {
        const existing = form.getValues('unequalSplitDetails')?.find(d => d.email === email);
        return { email, amount: existing?.amount ?? 0 };
    }));
    
    replaceMultiplePayers(memberEmails.map(email => {
        const existing = form.getValues('paidByMultiple')?.find(p => p.email === email);
        return { email, amount: existing?.amount ?? 0 };
    }));

  }, [isOpen, members, replaceUnequal, replaceMultiplePayers, form]);


  useEffect(() => {
    if (!isOpen) return;

    if (splitType === 'equal' && splitBetween.length > 0 && amount > 0) {
      const share = amount / splitBetween.length;
      const updatedDetails = (form.getValues('unequalSplitDetails') || []).map(detail => ({
        ...detail,
        amount: splitBetween.includes(detail.email) ? share : 0,
      }));
      replaceUnequal(updatedDetails);
    }
  }, [splitType, amount, splitBetween, isOpen, replaceUnequal, form]);
  

  async function onSubmit(values: z.infer<typeof expenseFormSchema>) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to add an expense.',
      });
      return;
    }
    
    let payers: { [key: string]: number } = {};
    if (isMultiPayer) {
        payers = values.paidByMultiple?.reduce((acc, item) => {
            if (item.amount > 0) {
                acc[item.email] = item.amount;
            }
            return acc;
        }, {} as {[key: string]: number}) || {};
        
        const totalPaid = Object.values(payers).reduce((sum, amount) => sum + amount, 0);
        if (Math.abs(totalPaid - values.amount) > 0.01) {
            form.setError("paidByMultiple", { message: "The sum of payments must equal the total expense amount." });
            return;
        }

    } else if (values.paidBySingle) {
        payers[values.paidBySingle] = values.amount;
    } else {
        form.setError("paidBySingle", { message: "A payer is required." });
        return;
    }


    const expenseData: any = {
        description: values.description,
        amount: values.amount,
        category: values.category || DEFAULT_CATEGORY,
        paymentType: values.paymentType || '',
        notes: values.notes || '',
        expenseDate: values.expenseDate || '',
        payers: payers,
        splitType: values.splitType,
        splitBetween: values.splitBetween,
        createdBy: user.uid,
    };

    if (values.splitType === 'unequal') {
        expenseData.splitDetails = values.unequalSplitDetails?.reduce((acc, item) => {
            if (values.splitBetween.includes(item.email)) {
                acc[item.email] = item.amount;
            }
            return acc;
        }, {} as {[key: string]: number});
    }

    try {
      if (expenseToEdit) {
        const expenseDocRef = doc(db, 'groups', groupId, 'expenses', expenseToEdit.id);
        await updateDoc(expenseDocRef, expenseData);
        toast({
            title: 'Expense Updated',
            description: `${values.description} has been updated.`,
        });

      } else {
        await addDoc(collection(db, 'groups', groupId, 'expenses'), {
          ...expenseData,
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Expense Added',
          description: `${values.description} has been added to the group.`,
        });
      }
      
      setIsOpen(false);
    } catch (error: any)
{
      toast({
        variant: 'destructive',
        title: getErrorTitle('expense'),
        description: getUserFriendlyErrorMessage(error),
      });
    }
  }

  const dialogTitle = expenseToEdit ? "Edit Expense" : "Add New Expense";
  const dialogDescription = expenseToEdit ? "Update the details of your expense." : "Enter expense details and how it should be split.";
  const buttonText = expenseToEdit ? "Save Changes" : "Add Expense";
  
  const totalPaid = form.watch('paidByMultiple')?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0;
  const totalUnequalSplit = form.watch('unequalSplitDetails')?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0;
  
  const isSubmitting = form.formState.isSubmitting;
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-4">
            
            <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="e.g., Dinner, Movie Tickets" {...field} className="h-12 text-base sm:h-10 sm:text-sm" /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Amount (₹)</FormLabel>
                <FormControl><Input type="number" placeholder="0.00" {...field} onFocus={handleFocus} className="h-12 text-base sm:h-10 sm:text-sm" /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={DEFAULT_CATEGORY}>
                    <FormControl>
                    <SelectTrigger className="h-12 text-base sm:h-10 sm:text-sm">
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                        <span className="flex items-center gap-2">
                            <span>{category.icon}</span>
                            <span>{category.label}</span>
                        </span>
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="paymentType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Payment Type (Optional)</FormLabel>
                <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                    value={field.value || "none"}
                >
                    <FormControl>
                    <SelectTrigger className="h-12 text-base sm:h-10 sm:text-sm">
                        <SelectValue placeholder="Select payment type (optional)" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="none">No payment type</SelectItem>
                    {PAYMENT_TYPES.map((paymentType) => (
                        <SelectItem key={paymentType.value} value={paymentType.value}>
                        {paymentType.label}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="expenseDate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Date (Optional)</FormLabel>
                <FormControl>
                    <Input 
                        type="date" 
                        {...field}
                        className="w-full"
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                    <Textarea 
                    placeholder="Add any additional details or notes about this expense..." 
                    className="resize-none min-h-[48px] text-base sm:min-h-[40px] sm:text-sm" 
                    rows={2}
                    {...field} 
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormItem>
                <div className="flex justify-between items-center mb-2">
                    <FormLabel>Paid By</FormLabel>
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => setIsMultiPayer(!isMultiPayer)}
                    >
                        {isMultiPayer ? 'Single Payer' : 'Multiple Payers'}
                    </Button>
                </div>
                {isMultiPayer ? (
                    <div className="space-y-2">
                        {members.map((member, index) => (
                            <div key={member.id} className="flex items-center justify-between gap-2 sm:gap-4">
                                <FormLabel className="font-normal text-sm flex-1 truncate">
                                    {member.email === user?.email ? 'You' : (member.name || member.email!.split('@')[0])}
                                </FormLabel>
                                <FormField
                                    control={form.control}
                                    name={`paidByMultiple.${index}.amount`}
                                    render={({ field }) => (
                                    <FormControl>
                                        <Input type="number" {...field} className="h-11 w-24 text-base sm:h-8 sm:w-24 sm:text-sm" placeholder="0.00" onFocus={handleFocus} />
                                    </FormControl>
                                    )}
                                />
                            </div>
                        ))}
                        <div className="text-sm text-muted-foreground mt-2 text-right">
                            Total: ₹{Number(totalPaid || 0).toFixed(2)} / ₹{Number(amount || 0).toFixed(2)}
                        </div>
                        {Math.abs(Number(totalPaid || 0) - Number(amount || 0)) > 0.01 && (
                            <p className="text-sm font-medium text-destructive">
                                The sum of payments must equal the total expense amount.
                            </p>
                        )}
                    </div>
                ) : (
                    <FormField
                        control={form.control}
                        name="paidBySingle"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="h-12 text-base sm:h-10 sm:text-sm">
                                <SelectValue placeholder="Select who paid" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {members.map(member => (
                                <SelectItem key={member.id} value={member.email!}>
                                    {member.email === user?.email ? 'You' : (member.name || member.email!.split('@')[0])}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        )}
                    />
                )}
                <FormMessage>{form.formState.errors.paidByMultiple?.message || form.formState.errors.paidBySingle?.message}</FormMessage>
            </FormItem>

            <Separator />

            <FormField
            control={form.control}
            name="splitType"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>Split Method</FormLabel>
                <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="equal" /></FormControl><FormLabel className="font-normal">Equally</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unequal" /></FormControl><FormLabel className="font-normal">Unequally</FormLabel></FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormItem>
            <div className="mb-4"><FormLabel>Split between</FormLabel></div>
            <div className="space-y-2">
            {members.map((member, index) => (
                <div key={member.id} className="flex items-center justify-between gap-2 sm:gap-4">
                    <FormField
                        key={member.id}
                        control={form.control}
                        name="splitBetween"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 flex-1">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(member.email!)}
                                        onCheckedChange={(checked) => (
                                            checked
                                                ? field.onChange([...(field.value || []), member.email!])
                                                : field.onChange((field.value || []).filter(value => value !== member.email))
                                        )}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal text-sm truncate">
                                    {member.email === user?.email ? 'You' : (member.name || member.email!.split('@')[0])}
                                </FormLabel>
                            </FormItem>
                        )}
                    />
                    {splitType === 'unequal' && form.getValues('splitBetween').includes(member.email!) && (
                        <FormField
                            control={form.control}
                            name={`unequalSplitDetails.${index}.amount`}
                            render={({ field }) => (
                                <FormControl>
                                <Input type="number" {...field} className="h-11 w-24 text-base sm:h-8 sm:w-24 sm:text-sm" placeholder="0.00" onFocus={handleFocus} />
                                </FormControl>
                            )}
                        />
                    )}
                </div>
            ))}
            </div>
            {splitType === 'unequal' && (
                <div className="text-sm text-muted-foreground mt-2 text-right">
                    Total: ₹{Number(totalUnequalSplit || 0).toFixed(2)} / ₹{Number(amount || 0).toFixed(2)}
                </div>
            )}
            <FormMessage>{form.formState.errors.splitBetween?.message || form.formState.errors.unequalSplitDetails?.message}</FormMessage>
            </FormItem>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">{isSubmitting ? 'Saving...' : buttonText}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
