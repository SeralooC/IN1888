import { cn } from "../../lib/utils";
export function Badge({ variant="default", className, ...p }){
  const v = {
    default: "bg-blue-600 text-white",
    secondary: "bg-gray-100 text-gray-900",
    outline: "border border-gray-300",
  }[variant];
  return <span {...p} className={cn("inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold", v, className)} />;
}
