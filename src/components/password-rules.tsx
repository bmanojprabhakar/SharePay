'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordRule {
  test: (password: string) => boolean;
  label: string;
}

const passwordRules: PasswordRule[] = [
  {
    test: (password) => password.length >= 8,
    label: 'At least 8 characters long'
  },
  {
    test: (password) => /[A-Z]/.test(password),
    label: 'Contains at least one uppercase letter'
  },
  {
    test: (password) => /[a-z]/.test(password),
    label: 'Contains at least one lowercase letter'
  },
  {
    test: (password) => /[0-9]/.test(password),
    label: 'Contains at least one number'
  },
  {
    test: (password) => /[^A-Za-z0-9]/.test(password),
    label: 'Contains at least one special character'
  }
];

interface PasswordRulesProps {
  password: string;
}

export function PasswordRules({ password }: PasswordRulesProps) {
  const allRulesPassed = passwordRules.every(rule => rule.test(password));

  return (
    <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
      <div className="text-sm font-medium text-muted-foreground">
        Password requirements:
      </div>
      <div className="space-y-1">
        {passwordRules.map((rule, index) => {
          const passed = rule.test(password);
          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors duration-200",
                passed ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {passed ? (
                <Check className="h-4 w-4 text-green-600 transition-colors duration-200" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground transition-colors duration-200" />
              )}
              <span>{rule.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function isPasswordValid(password: string): boolean {
  return passwordRules.every(rule => rule.test(password));
}