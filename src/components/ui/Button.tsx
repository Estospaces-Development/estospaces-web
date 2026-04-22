import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-[calc(var(--radius-control)-2px)] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none';

    const variants = {
      primary: 'bg-[linear-gradient(135deg,var(--accent-strong),var(--accent-emphasis))] text-white shadow-[var(--shadow-brand)] hover:-translate-y-px hover:brightness-105',
      secondary: 'border border-[var(--border-soft)] bg-[var(--surface-base)] text-[var(--text-strong)] shadow-[var(--shadow-card)] hover:-translate-y-px hover:bg-[var(--surface-muted)]',
      outline: 'border border-[var(--border-strong)] bg-transparent text-[var(--text-strong)] hover:bg-[var(--accent-soft)]',
      ghost: 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)]',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
    };

    const sizes = {
      sm: 'h-9 px-3.5 text-sm',
      md: 'h-11 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
