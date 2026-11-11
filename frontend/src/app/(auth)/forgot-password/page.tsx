"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  MailIcon,
} from "lucide-react";
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
import { FieldGroup } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/src/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/src/lib/auth-schemas";

const isDev = process.env.NODE_ENV === "development";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

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
    setSubmitError(null);

    try {
      const { error } = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error?.status === 429) {
        setSubmitError("Too many requests. Please wait a minute and try again.");
        return;
      }

      if (error && error.status >= 500) {
        setSubmitError("Unable to reach the authentication service. Please try again shortly.");
        return;
      }
    } catch {
      setSubmitError("Unable to reach the backend server. Check that it is running and try again.");
      return;
    }

    // Always surface the same neutral message regardless of whether the email exists.
    setSubmitted(true);
    toast.success("If an account exists for that email, reset instructions were sent.");
  };

  return (
    <Card className="shadow-xs sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Reset your password
        </CardTitle>
        <CardDescription>
          Enter your account email and we will send you a password reset link.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {submitted ? (
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>
                If an account exists for that email address, we have sent password reset
                instructions.
              </p>
              {isDev ? (
                <p className="font-mono text-xs text-muted-foreground">
                  Development mode: if this email is registered, the reset link is logged in the
                  backend server terminal (port 4000). No link is logged for unregistered emails.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {submitError ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Unable to send reset link</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup>
              <FormField id="forgot-email" label="Email" error={errors.email?.message}>
                <InputGroup className="h-9" data-disabled={isSubmitting ? "true" : undefined}>
                  <InputGroupAddon align="inline-start">
                    <MailIcon />
                  </InputGroupAddon>
                  <InputGroupInput
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
                </InputGroup>
              </FormField>
            </FieldGroup>

            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              <span>Send reset link</span>
              {!isSubmitting ? <ArrowRightIcon data-icon="inline-end" /> : null}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-link underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-3.5 shrink-0" />
          <span>Back to sign in</span>
        </Link>
      </CardFooter>
    </Card>
  );
}
