import {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  memo,
} from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type BtnVariant = "primary" | "secondary" | "destructive" | "outline" | "ghost" | "success";
export function Button({
  variant = "primary",
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
    outline: "border border-input bg-card hover:bg-muted",
    ghost: "hover:bg-muted",
    success: "bg-success text-success-foreground hover:opacity-90",
  };
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        v[variant],
        className,
      )}
    />
  );
}

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={cn(
        "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition-colors",
        "focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...p}
      className={cn(
        "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none min-h-[88px]",
        "focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60",
        className,
      )}
    />
  );
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...p}
      className={cn(
        "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("bg-card rounded-xl shadow-soft border", className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-xl shadow-card w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="border-t px-5 py-3 flex justify-end gap-2 bg-muted/30">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "حذف",
  message,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            انصراف
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            تایید حذف
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </Modal>
  );
}

export function EmptyState({
  message = "موردی برای نمایش وجود ندارد",
  icon,
}: {
  message?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      {icon && <div className="mb-3 opacity-50">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}

type Col = string | { label: string; align?: "left" | "center" | "right" };
function DataTableImpl({
  columns,
  children,
  dir,
}: {
  columns: Col[];
  children: ReactNode;
  dir?: "ltr" | "rtl";
}) {
  const alignClass = (a?: "left" | "center" | "right") =>
    a === "left" ? "text-left" : a === "center" ? "text-center" : "text-right";
  return (
    <div className="overflow-x-auto rounded-xl border bg-card" dir={dir}>
      <table className="w-full text-sm" style={dir ? { direction: dir } : undefined}>
        <thead className="bg-muted/60 sticky top-0">
          <tr>
            {columns.map((c, i) => {
              const label = typeof c === "string" ? c : c.label;
              const align = typeof c === "string" ? "right" : (c.align ?? "right");
              return (
                <th
                  key={`${label}-${i}`}
                  className={cn("font-semibold px-3 py-2.5 whitespace-nowrap", alignClass(align))}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr:hover]:bg-muted/30 [&>tr:nth-child(even)]:bg-muted/10">
          {children}
        </tbody>
      </table>
    </div>
  );
}
export const DataTable = memo(DataTableImpl);

export function Badge({
  tone = "default",
  children,
}: {
  tone?: "default" | "success" | "destructive" | "warning";
  children: ReactNode;
}) {
  const tones = {
    default: "bg-muted text-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
    warning: "bg-warning/20 text-warning-foreground",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
