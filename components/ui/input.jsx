import * as React from "react";
import { cn } from "../../lib/utils";
export const Input = React.forwardRef(function Input({ className, ...props }, ref){
  return <input ref={ref} {...props} className={cn("flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600", className)} />;
});
