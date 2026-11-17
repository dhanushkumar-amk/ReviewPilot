"use client";

import * as React from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  startIcon?: React.ReactNode;
  groupClassName?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, groupClassName, startIcon, disabled, ...props }, ref) {
    const [visible, setVisible] = React.useState(false);

    return (
      <InputGroup className={groupClassName} data-disabled={disabled ? "true" : undefined}>
        {startIcon ? <InputGroupAddon align="inline-start">{startIcon}</InputGroupAddon> : null}
        <InputGroupInput
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={className}
          {...props}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            onClick={() => setVisible((prev) => !prev)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            disabled={disabled}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    );
  }
);
