"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  LockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/auth/form-field";
import { PasswordChecklist } from "@/components/auth/password-checklist";
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
import { FieldGroup } from "@/components/ui/field";
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
    control,
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

  const newPasswordValue = useWatch({ control, name: "newPassword", defaultValue: "" });

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
    <Card className="shadow-xs sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Choose a new password
        </CardTitle>
        <CardDescription>
          Update the password for your ReviewPilot account.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
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
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {serverError ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Reset failed</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup>
              <FormField
                id="reset-new-password"
                label="New password"
                hint={
                  <PasswordChecklist
                    id="reset-new-password-checklist"
                    password={newPasswordValue}
                  />
                }
                error={errors.newPassword?.message}
              >
                <PasswordInput
                  id="reset-new-password"
                  groupClassName="h-9"
                  startIcon={<LockIcon />}
                  autoComplete="new-password"
                  autoFocus
                  placeholder="Create a strong password"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.newPassword)}
                  aria-describedby={
                    errors.newPassword
                      ? "reset-new-password-checklist reset-new-password-error"
                      : "reset-new-password-checklist"
                  }
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
                  groupClassName="h-9"
                  startIcon={<LockIcon />}
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
            </FieldGroup>

            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              <span>Reset password</span>
              {!isSubmitting ? <ArrowRightIcon data-icon="inline-end" /> : null}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        {hasInvalidToken ? (
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-link underline-offset-4 hover:underline"
          >
            Request a new reset link
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-link underline-offset-4 hover:underline"
          >
            <ArrowLeftIcon className="size-3.5 shrink-0" />
            <span>Back to sign in</span>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
