// Currency configuration and formatting utilities

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: { [key: string]: CurrencyConfig } = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
};

// Default currency for the app
export const DEFAULT_CURRENCY = 'INR';

// Format currency amount with proper symbol and formatting
export const formatCurrency = (
  amount: number, 
  currencyCode: string = DEFAULT_CURRENCY,
  includeSymbol: boolean = true
): string => {
  const currency = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
  const formattedAmount = amount.toFixed(2);
  
  if (!includeSymbol) {
    return formattedAmount;
  }
  
  // For INR, format as ₹1,234.56
  if (currencyCode === 'INR') {
    const parts = formattedAmount.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add Indian number formatting (lakhs/crores)
    const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${currency.symbol}${formatted}.${decimalPart}`;
  }
  
  // For other currencies, use standard formatting
  return `${currency.symbol}${formattedAmount}`;
};

// Get currency symbol
export const getCurrencySymbol = (currencyCode: string = DEFAULT_CURRENCY): string => {
  return CURRENCIES[currencyCode]?.symbol || CURRENCIES[DEFAULT_CURRENCY].symbol;
};

// Check if amount is positive, negative, or zero for display purposes
export const getCurrencyDisplayInfo = (amount: number) => {
  if (amount > 0) return { color: 'success', prefix: '+' };
  if (amount < 0) return { color: 'error', prefix: '' };
  return { color: 'neutral', prefix: '' };
};