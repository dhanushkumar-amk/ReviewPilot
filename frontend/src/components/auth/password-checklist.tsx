"use client";

import * as React from "react";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordChecklistProps {
  id: string;
  password: string;
}

export function PasswordChecklist({ id, password }: PasswordChecklistProps) {
  const rules = [
    {
      key: "length",
      label: "Between 10 and 128 characters",
      met: password.length >= 10 && password.length <= 128,
    },
    {
      key: "letter",
      label: "At least one letter (A-Z or a-z)",
      met: /[A-Za-z]/.test(password),
    },
    {
      key: "number",
      label: "At least one number (0-9)",
      met: /\d/.test(password),
    },
  ];

  return (
    <ul id={id} aria-label="Password requirements" className="flex flex-col gap-1.5 pt-0.5 text-xs">
      {rules.map((rule) => (
        <li
          key={rule.key}
          className={cn(
            "flex items-center gap-2 transition-colors",
            rule.met ? "font-medium text-success" : "text-muted-foreground"
          )}
        >
          {rule.met ? (
            <CheckCircle2Icon className="size-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <CircleIcon className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className="sr-only">{rule.met ? "Satisfied:" : "Required:"} </span>
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}

