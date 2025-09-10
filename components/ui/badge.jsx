import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-border",
  destructive: "bg-destructive text-destructive-foreground"
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold", variants[variant], className)}
      {...props}
    />
  );
}
