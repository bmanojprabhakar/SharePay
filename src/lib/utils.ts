import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(amount: number): string {
  if (amount >= 100000) {
    return `${Math.round(amount / 1000)}k`
  } else if (amount >= 1000) {
    return `${Math.round(amount / 100) / 10}k`
  } else {
    return Math.round(amount).toString()
  }
}
