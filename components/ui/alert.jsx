import { cn } from "../../lib/utils";
export function Alert({ variant="default", className, ...p }){
  const style = variant==="destructive" ? "border-red-300 text-red-700 bg-red-50" : "border-gray-200 text-gray-800 bg-white";
  return <div role="alert" {...p} className={cn("rounded-lg border p-4", style, className)} />;
}
export const AlertTitle = (p)=><h5 {...p} className={cn("mb-1 font-medium", p.className)} />;
export const AlertDescription = (p)=><div {...p} className={cn("text-sm text-gray-600", p.className)} />;
