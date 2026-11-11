import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionShellProps extends React.ComponentProps<"section"> {
  id?: string;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}

export function SectionShell({
  id,
  className,
  containerClassName,
  children,
  ...props
}: SectionShellProps) {
  return (
    <section
      id={id}
      className={cn("w-full py-14 sm:py-24 lg:py-28 relative", className)}
      {...props}
    >
      <div
        className={cn(
          "max-w-[1200px] mx-auto px-4 sm:px-6 w-full",
          containerClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}

