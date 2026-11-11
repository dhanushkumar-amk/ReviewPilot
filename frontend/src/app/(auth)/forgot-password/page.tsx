"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/auth/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/src/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/src/lib/auth-schemas";

const isDev = process.env.NODE_ENV === "development";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [rateLimitError, setRateLimitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setRateLimitError(null);

    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error?.status === 429) {
      setRateLimitError("Too many requests. Please wait a minute and try again.");
      return;
    }

    // Always surface the same neutral message regardless of whether the email exists.
    setSubmitted(true);
    toast.success("If an account exists for that email, reset instructions were sent.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your email address and we will send you a link to reset your password.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {submitted ? (
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription>
              <p>
                If an account exists for that email address, we have sent password reset
                instructions.
              </p>
              {isDev ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  Development mode: check the backend terminal for the reset link.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {rateLimitError ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Please try again later</AlertTitle>
                <AlertDescription>{rateLimitError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField id="forgot-email" label="Email" error={errors.email?.message}>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@company.com"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "forgot-email-error" : undefined}
                {...register("email")}
              />
            </FormField>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              <span>Send reset link</span>
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <Link href="/login" className="text-xs font-medium text-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

