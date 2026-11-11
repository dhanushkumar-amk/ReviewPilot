import * as React from "react";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  labelRight?: React.ReactNode;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  error,
  labelRight,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelRight}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

