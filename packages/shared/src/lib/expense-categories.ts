export const EXPENSE_CATEGORIES = [
  { value: 'food-drinks', label: 'Food & Drinks', icon: '🍽️' },
  { value: 'transportation', label: 'Transportation', icon: '🚗' },
  { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'groceries', label: 'Groceries', icon: '🛒' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'sports', label: 'Sports & Fitness', icon: '⚽' },
  { value: 'gifts', label: 'Gifts', icon: '🎁' },
  { value: 'others', label: 'Others', icon: '📝' },
] as const;

export const DEFAULT_CATEGORY = 'others';

export function getCategoryByValue(value: string) {
  return EXPENSE_CATEGORIES.find(cat => cat.value === value) || EXPENSE_CATEGORIES.find(cat => cat.value === DEFAULT_CATEGORY)!;
}