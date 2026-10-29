"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
}

export function Badge({ className, variant = "primary", children, ...props }: BadgeProps) {
  const variants = {
    primary: "badge-primary",
    secondary: "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
    success: "badge-success",
    warning: "badge-warning",
    danger: "badge-danger",
    neutral: "badge-neutral",
  };
  return <span className={cn("badge", variants[variant], className)} {...props}>{children}</span>;
}