"use client";

import * as React from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-9", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };

