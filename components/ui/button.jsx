import { cn } from "../../lib/utils";
export function Button({ className, variant="default", size="default", ...props }){
  const v = {
    default: "bg-blue-600 text-white hover:bg-blue-600/90",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-100/80",
    outline: "border border-gray-300 bg-white hover:bg-gray-50",
  }[variant];
  const s = { default:"h-10 px-4", sm:"h-9 px-3", lg:"h-11 px-6", icon:"h-10 w-10" }[size];
  return <button {...props} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50", v, s, className)} />;
}
