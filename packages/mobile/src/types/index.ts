// Updated types to match web app data structure

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  name_lowercase?: string;
  description?: string;
  emoji?: string;
  currency?: string;
  members: string[]; // Array of user UIDs
  memberEmails: string[]; // Array of email addresses
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category?: string;
  notes?: string;
  payers: { [email: string]: number }; // Email-to-amount mapping
  splitBetween: string[]; // Array of emails
  splitType: 'equal' | 'unequal' | 'payment';
  splitDetails?: { [email: string]: number }; // For unequal splits
  createdBy: string; // Email address
  createdAt: Date;
}

export type ExpenseCategory = 
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'groceries'
  | 'utilities'
  | 'travel'
  | 'shopping'
  | 'other';

export interface UserBalance {
  totalYouOwe: number; // money you owe to others
  totalOwedToYou: number; // money others owe you
  netBalance: number; // totalOwedToYou - totalYouOwe (positive = you get money)
}

export interface GroupMember {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  balance: number;
  joinedAt: Date;
}