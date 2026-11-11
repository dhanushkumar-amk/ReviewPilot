"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircleIcon, MailCheckIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/src/lib/auth-client";
import { loginSchema, type LoginValues } from "@/src/lib/auth-schemas";
import { getSafeRedirectPath } from "@/src/lib/safe-redirect";

const isDev = process.env.NODE_ENV === "development";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = getSafeRedirectPath(searchParams.get("next"));

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = React.useState<string | null>(null);
  const [isResending, setIsResending] = React.useState(false);
  const [resent, setResent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    setUnverifiedEmail(null);
    setResent(false);

    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (error.status === 429) {
        setServerError("Too many sign-in attempts. Please wait a minute and try again.");
        return;
      }

      if (error.code === "EMAIL_NOT_VERIFIED" || error.status === 403) {
        setUnverifiedEmail(values.email);
        setServerError(
          "Your email address is not verified yet. Please verify your email before signing in."
        );
        return;
      }

      setServerError("Invalid email or password.");
      return;
    }

    router.replace(safeNext);
    router.refresh();
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) {
      return;
    }

    setIsResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: unverifiedEmail,
        callbackURL: `${window.location.origin}/verify-email`,
      });

      if (error) {
        if (error.status === 429) {
          toast.error("Too many requests. Please wait a minute before trying again.");
          return;
        }
        toast.error(error.message || "Unable to resend verification email.");
        return;
      }

      setResent(true);
      toast.success("Verification email sent. Check your inbox.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Sign in to access your ReviewPilot workspace.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {serverError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>
              {unverifiedEmail ? "Email verification required" : "Sign in failed"}
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <p>{serverError}</p>
              {unverifiedEmail ? (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isResending}
                    onClick={handleResendVerification}
                  >
                    {isResending ? <Spinner data-icon="inline-start" /> : null}
                    <span>Resend verification email</span>
                  </Button>
                  {resent ? (
                    <p className="flex items-center gap-1.5 text-xs text-foreground">
                      <MailCheckIcon className="size-3.5 shrink-0" />
                      <span>
                        Verification email sent.
                        {isDev ? " Check the backend terminal for the link." : ""}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField id="login-email" label="Email" error={errors.email?.message}>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@company.com"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
          </FormField>

          <FormField
            id="login-password"
            label="Password"
            error={errors.password?.message}
            labelRight={
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            }
          >
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
            />
          </FormField>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            <span>Sign in</span>
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground">
          Need an account?{" "}
          <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

