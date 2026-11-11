"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  LockIcon,
  MailCheckIcon,
  MailIcon,
} from "lucide-react";
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
import { FieldGroup } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { SocialButtons } from "@/src/features/auth/social-buttons";
import { authClient } from "@/src/lib/auth-client";
import { loginSchema, type LoginValues } from "@/src/lib/auth-schemas";
import { getSafeRedirectPath } from "@/src/lib/safe-redirect";

const isDev = process.env.NODE_ENV === "development";

function getOAuthErrorMessage(errorCode: string | null): string | null {
  if (!errorCode) {
    return null;
  }

  const normalized = errorCode.trim().toLowerCase();

  if (
    normalized === "access_denied" ||
    normalized === "user_cancelled" ||
    normalized === "consent_required"
  ) {
    return "Social sign-in was canceled. You can try again or sign in with email and password.";
  }

  if (normalized === "email_not_verified" || normalized === "email_not_found") {
    return "Your provider account does not have a verified email address. Verify your primary email there or use email and password.";
  }

  if (
    normalized === "account_not_linked" ||
    normalized === "email_does_not_match" ||
    normalized === "unable_to_link_account" ||
    normalized === "account_already_linked_to_different_user" ||
    normalized === "account_ownership_conflict"
  ) {
    return "This social account could not be linked automatically. Sign in with your verified email and password first.";
  }

  return "Unable to complete social sign-in. Please try again or use your email and password.";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = getSafeRedirectPath(searchParams.get("next"));
  const oauthError = getOAuthErrorMessage(searchParams.get("error"));

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
    <Card className="shadow-xs sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Sign in to ReviewPilot
        </CardTitle>
        <CardDescription>
          Enter your credentials to access your repositories and dashboard.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
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
        ) : oauthError ? (
          <Alert>
            <AlertCircleIcon />
            <AlertTitle>Social sign-in interrupted</AlertTitle>
            <AlertDescription>{oauthError}</AlertDescription>
          </Alert>
        ) : null}

        <SocialButtons nextPath={safeNext} disabled={isSubmitting} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <FieldGroup>
            <FormField id="login-email" label="Email" error={errors.email?.message}>
              <InputGroup className="h-9" data-disabled={isSubmitting ? "true" : undefined}>
                <InputGroupAddon align="inline-start">
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
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
              </InputGroup>
            </FormField>

            <FormField
              id="login-password"
              label="Password"
              error={errors.password?.message}
              labelRight={
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-link underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              }
            >
              <PasswordInput
                id="login-password"
                groupClassName="h-9"
                startIcon={<LockIcon />}
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                {...register("password")}
              />
            </FormField>
          </FieldGroup>

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            <span>Sign in</span>
            {!isSubmitting ? <ArrowRightIcon data-icon="inline-end" /> : null}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground">
          New to ReviewPilot?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-link underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
