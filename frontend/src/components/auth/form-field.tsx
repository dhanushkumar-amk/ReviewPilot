"use client";

import * as React from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  description?: string;
  hint?: React.ReactNode;
  labelRight?: React.ReactNode;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  error,
  description,
  hint,
  labelRight,
  children,
}: FormFieldProps) {
  const isInvalid = Boolean(error);

  return (
    <Field data-invalid={isInvalid ? "true" : undefined}>
      {labelRight ? (
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {labelRight}
        </div>
      ) : (
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      )}
      {children}
      {description ? (
        <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
      ) : null}
      {hint}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
