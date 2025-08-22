
'use client';

interface Expense {
    amount: number;
    payers: { [email: string]: number };
    splitBetween: string[];
    splitType: 'equal' | 'unequal' | 'payment';
    splitDetails?: { [email: string]: number };
}

interface Member {
    id: string;
    email?: string;
}

export interface SimplifiedDebt {
    from: string;
    to: string;
    amount: number;
}

export function simplifyDebts(expenses: Expense[], members: Member[]): SimplifiedDebt[] {
    const balances: { [email: string]: number } = {};

    members.forEach(member => {
        if(member.email) {
            balances[member.email] = 0;
        }
    });

    expenses.forEach(expense => {
        if (expense.splitType === 'payment') {
            const payer = Object.keys(expense.payers)[0];
            const payee = Object.keys(expense.splitDetails!)[0];
            balances[payer] += expense.amount;
            balances[payee] -= expense.amount;
            return;
        }

        const totalPaid = expense.amount;

        Object.entries(expense.payers).forEach(([email, paidAmount]) => {
            if (balances[email] !== undefined) {
                balances[email] += paidAmount;
            }
        });

        if (expense.splitType === 'equal') {
            const share = totalPaid / expense.splitBetween.length;
            expense.splitBetween.forEach(email => {
                if (balances[email] !== undefined) {
                    balances[email] -= share;
                }
            });
        } else if (expense.splitType === 'unequal') {
            Object.entries(expense.splitDetails!).forEach(([email, share]) => {
                if (balances[email] !== undefined) {
                    balances[email] -= share;
                }
            });
        }
    });

    const debtors = Object.entries(balances)
        .filter(([, balance]) => balance < 0)
        .map(([email, balance]) => ({ email, amount: -balance }));

    const creditors = Object.entries(balances)
        .filter(([, balance]) => balance > 0)
        .map(([email, balance]) => ({ email, amount: balance }));

    const simplifiedDebts: SimplifiedDebt[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amountToSettle = Math.min(debtor.amount, creditor.amount);

        // Use a small epsilon for floating point comparisons
        if (amountToSettle > 0.001) {
             simplifiedDebts.push({
                from: debtor.email,
                to: creditor.email,
                amount: amountToSettle,
            });
        }

        debtor.amount -= amountToSettle;
        creditor.amount -= amountToSettle;

        if (Math.abs(debtor.amount) < 0.001) {
            i++;
        }

        if (Math.abs(creditor.amount) < 0.001) {
            j++;
        }
    }

    return simplifiedDebts;
}
