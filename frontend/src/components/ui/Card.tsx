'use client';

import React from 'react';

interface CardProps {
  variant?: 'light' | 'dark' | 'parchment';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({
  variant = 'light',
  padding = 'md',
  className = '',
  children,
  onClick,
  hover = false,
}: CardProps) {
  const variantClasses: Record<string, string> = {
    light: 'bg-canvas border border-gray-100',
    dark: 'bg-surface-tile-1 text-white',
    parchment: 'bg-canvas-parchment',
  };

  const paddingClasses: Record<string, string> = {
    none: '',
    sm: 'p-sm',
    md: 'p-lg',
    lg: 'p-xl',
  };

  return (
    <div
      className={`rounded-lg ${variantClasses[variant]} ${paddingClasses[padding]} ${hover ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
