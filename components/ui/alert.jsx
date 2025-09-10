import { cn } from "@/lib/utils";

export function Alert({ className, variant = "default", ...props }) {
  const styles =
    variant === "destructive"
      ? "border-destructive/50 text-destructive dark:border-destructive"
      : "border-border text-foreground";
  return <div role="alert" className={cn("relative w-full rounded-lg border p-4", styles, className)} {...props} />;
}
export function AlertTitle({ className, ...props }) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}
export function AlertDescription({ className, ...props }) {
  return <div className={cn("text-sm text-muted-foreground [&_p]:leading-relaxed", className)} {...props} />;
}
