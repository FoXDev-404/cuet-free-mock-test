"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "dark";
  padded?: boolean;
}

export function Card({ className, variant = "default", padded = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        variant === "default" ? "card" : "card-dark",
        padded ? "p-6" : "",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-xl font-semibold text-neutral-900 dark:text-brand-100", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-neutral-600 dark:text-neutral-300", className)} {...props}>{children}</div>;
}
