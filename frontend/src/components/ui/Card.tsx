"use client";

import React from "react";

interface CardProps {
  variant?: "default" | "elevated" | "feature-dark" | "featured" | "spotlight";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
}

const paddingClasses: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-md",
  md: "p-lg",
  lg: "p-xxl",
};

const variantClasses: Record<NonNullable<CardProps["variant"]>, string> = {
  /** card-pricing — Light: white + hairline-cloud + level-2 · Dark: ink-deep + no shadow */
  default:
    "bg-surface-card text-ink border border-hairline rounded-xl shadow-card",
  elevated:
    "bg-surface-elevated text-ink border border-hairline rounded-xl shadow-none",
  /** card-feature-dark */
  "feature-dark":
    "bg-ink-deep text-on-primary border border-hairline-violet rounded-xl shadow-none",
  /** card-pricing-featured — dark inverted emphasis tier */
  featured:
    "bg-surface-night text-on-primary border border-hairline-violet rounded-xl shadow-none",
  /** card-spotlight-violet */
  spotlight:
    "bg-accent-violet-deep text-on-primary border-0 rounded-xxl shadow-none",
};

export function Card({
  variant = "default",
  padding = "md",
  className = "",
  children,
  onClick,
  hover = false,
}: CardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`${variantClasses[variant]} ${paddingClasses[padding]} ${
        hover
          ? "cursor-pointer hover:border-hairline-cool dark:hover:border-hairline-violet transition-colors duration-200"
          : ""
      } ${className}`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
