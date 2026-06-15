"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "ghost-dark" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center font-text text-button-cap uppercase tracking-[0.2px] " +
  "rounded-md cursor-pointer transition-colors duration-200 " +
  "disabled:bg-hairline-cloud disabled:text-on-dark-muted disabled:opacity-100 disabled:cursor-not-allowed";

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  /** Light: button-primary · Dark: button-inverted (via CSS vars) */
  primary:
    "bg-btn-primary-bg text-btn-primary-text " +
    "hover:bg-btn-primary-pressed-bg hover:text-btn-primary-pressed-text " +
    "active:bg-btn-primary-pressed-bg active:text-btn-primary-pressed-text",
  /** button-violet-token */
  secondary:
    "bg-accent-violet-mid text-on-primary rounded-xl text-button-cap-light " +
    "hover:opacity-90 active:opacity-80",
  /** button-ghost (Light) */
  ghost:
    "bg-btn-ghost-bg text-btn-ghost-text border border-hairline " +
    "hover:bg-surface-elevated active:bg-surface-press-light",
  /** button-ghost-on-dark */
  "ghost-dark":
    "bg-on-dark-faint text-on-primary rounded-xl border-0 " +
    "hover:bg-hairline-violet active:bg-hairline-violet",
  danger:
    "bg-accent-pink text-ink-deep " +
    "hover:opacity-90 active:opacity-80",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "min-h-11 px-md text-button-cap",
  md: "min-h-11 px-lg py-md",
  lg: "min-h-12 px-xl py-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2
          className="animate-spin -ml-1 mr-2 h-4 w-4 shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
