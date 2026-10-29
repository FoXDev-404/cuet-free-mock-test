import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => {
  return <table ref={ref} className={cn("w-full text-sm caption-bottom", className)} {...props} />;
});
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
  );
});
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return <tbody ref={ref} className={cn("[&_tr]:last:border-b-0", className)} {...props} />;
});
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return (
    <tfoot ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
  );
});
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => {
  return (
    <tr ref={ref} className={cn("border-b transition-colors hover:bg-neutral-50/40 data-[state=selected]:bg-neutral-50/40", className)} {...props} />
  );
});
TableRow.displayName = "TableRow";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  return (
    <td
      ref={ref}
      className={cn("p-4 align-middle", className)}
      {...props}
    />
  );
});
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => {
  return (
    <caption ref={ref} className={cn("mt-4 text-sm text-neutral-500", className)} {...props} />
  );
});
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableCell, TableCaption };

export const TableContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto">{children}</div>
);
