"use client";

import * as React from "react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/src/lib/auth-client";
import { signUpSchema, type SignUpValues } from "@/src/lib/auth-schemas";

const isDev = process.env.NODE_ENV === "development";

export default function SignUpPage() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignUpValues) => {
    setServerError(null);

    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: `${window.location.origin}/verify-email`,
    });

    if (error) {
      if (error.status === 429) {
        setServerError("Too many sign-up attempts. Please wait a minute and try again.");
        return;
      }
      setServerError(error.message || "Unable to create your account. Please try again.");
      return;
    }

    setSubmitted(true);
    toast.success("Account created. Check your email to verify your account.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your details to get started with ReviewPilot.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {submitted ? (
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>Check your email to verify your account</AlertTitle>
            <AlertDescription>
              <p>
                We sent a verification link to your email address. Open the link before signing in.
              </p>
              {isDev ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  Development mode: check the backend terminal for the verification link.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {serverError ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Unable to sign up</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField id="sign-up-name" label="Full name" error={errors.name?.message}>
              <Input
                id="sign-up-name"
                type="text"
                autoComplete="name"
                autoFocus
                placeholder="Alex Morgan"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "sign-up-name-error" : undefined}
                {...register("name")}
              />
            </FormField>

            <FormField id="sign-up-email" label="Email" error={errors.email?.message}>
              <Input
                id="sign-up-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "sign-up-email-error" : undefined}
                {...register("email")}
              />
            </FormField>

            <FormField id="sign-up-password" label="Password" error={errors.password?.message}>
              <PasswordInput
                id="sign-up-password"
                autoComplete="new-password"
                placeholder="At least 10 characters"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "sign-up-password-error" : undefined}
                {...register("password")}
              />
            </FormField>

            <FormField
              id="sign-up-confirm-password"
              label="Confirm password"
              error={errors.confirmPassword?.message}
            >
              <PasswordInput
                id="sign-up-confirm-password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword ? "sign-up-confirm-password-error" : undefined
                }
                {...register("confirmPassword")}
              />
            </FormField>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              <span>Create account</span>
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

