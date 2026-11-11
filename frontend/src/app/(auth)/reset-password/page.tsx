"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
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
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/src/lib/auth-client";
import { resetPasswordSchema, type ResetPasswordValues } from "@/src/lib/auth-schemas";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const hasInvalidToken = Boolean(tokenError) || !token;

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token) {
      setServerError("This password reset link is invalid or has expired.");
      return;
    }

    setServerError(null);

    const { error } = await authClient.resetPassword({
      newPassword: values.newPassword,
      token,
    });

    if (error) {
      if (error.status === 429) {
        setServerError("Too many requests. Please wait a minute and try again.");
        return;
      }
      setServerError(
        error.code === "INVALID_TOKEN" || error.code === "TOKEN_EXPIRED"
          ? "This password reset link is invalid, expired, or has already been used."
          : error.message || "Unable to reset your password. Please request a new link."
      );
      return;
    }

    setCompleted(true);
    toast.success("Password reset complete. Please sign in with your new password.");
    router.replace("/login");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Choose a new password for your ReviewPilot account.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {completed ? (
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>Password updated</AlertTitle>
            <AlertDescription>
              Your password has been reset. You can now sign in with your new password.
            </AlertDescription>
          </Alert>
        ) : hasInvalidToken ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Invalid or expired reset link</AlertTitle>
            <AlertDescription>
              This password reset link is invalid or has expired. Please request a new link.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {serverError ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Reset failed</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              id="reset-new-password"
              label="New password"
              error={errors.newPassword?.message}
            >
              <PasswordInput
                id="reset-new-password"
                autoComplete="new-password"
                autoFocus
                placeholder="At least 10 characters"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.newPassword)}
                aria-describedby={errors.newPassword ? "reset-new-password-error" : undefined}
                {...register("newPassword")}
              />
            </FormField>

            <FormField
              id="reset-confirm-password"
              label="Confirm password"
              error={errors.confirmPassword?.message}
            >
              <PasswordInput
                id="reset-confirm-password"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword ? "reset-confirm-password-error" : undefined
                }
                {...register("confirmPassword")}
              />
            </FormField>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              <span>Reset password</span>
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        {hasInvalidToken ? (
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-foreground underline underline-offset-4"
          >
            Request a new reset link
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-xs font-medium text-foreground underline underline-offset-4"
          >
            Back to sign in
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

