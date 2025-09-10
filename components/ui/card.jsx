import { cn } from "../../lib/utils";
export function Card(p){ return <div {...p} className={cn("rounded-lg border bg-white shadow-sm", p.className)} />; }
export function CardHeader(p){ return <div {...p} className={cn("flex flex-col space-y-1.5 p-6", p.className)} />; }
export function CardTitle(p){ return <h3 {...p} className={cn("text-2xl font-semibold tracking-tight", p.className)} />; }
export function CardDescription(p){ return <p {...p} className={cn("text-sm text-gray-500", p.className)} />; }
export function CardContent(p){ return <div {...p} className={cn("p-6 pt-0", p.className)} />; }
export function CardFooter(p){ return <div {...p} className={cn("flex items-center p-6 pt-0", p.className)} />; }
