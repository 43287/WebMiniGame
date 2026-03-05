import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  [key: string]: any;
}

export function Button({ className, variant = 'primary', children, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-yellow-300 hover:bg-yellow-400 text-black',
    secondary: 'bg-white hover:bg-gray-100 text-black',
    danger: 'bg-red-400 hover:bg-red-500 text-white',
  };

  return (
    <button
      className={cn(
        'border-2 border-black rounded-lg px-6 py-3 font-bold text-lg transition-all',
        'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-white border-2 border-black rounded-xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
        className
      )}
    >
      {children}
    </div>
  );
}
