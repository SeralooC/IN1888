import { cn } from "../../lib/utils";
export function Label(p){ return <label {...p} className={cn("text-sm font-medium", p.className)} />; }
