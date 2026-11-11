"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  LockIcon,
  MailIcon,
  UserIcon,
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/src/lib/auth-client";
import { signUpSchema, type SignUpValues } from "@/src/lib/auth-schemas";

const isDev = process.env.NODE_ENV === "development";

export default function SignUpPage() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    control,
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

  const passwordValue = useWatch({ control, name: "password", defaultValue: "" });

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
    <Card className="shadow-xs sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Get started with ReviewPilot
        </CardTitle>
        <CardDescription>
          Create your account to configure repositories and automated PR reviews.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {submitted ? (
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>Check your email to verify your account</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>
                We sent a verification link to your email address. Open the link before signing in.
              </p>
              {isDev ? (
                <p className="font-mono text-xs text-muted-foreground">
                  Development mode: check the backend server terminal (port 4000) for the
                  verification link.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {serverError ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Unable to create account</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup>
              <FormField id="sign-up-name" label="Full name" error={errors.name?.message}>
                <InputGroup className="h-9" data-disabled={isSubmitting ? "true" : undefined}>
                  <InputGroupAddon align="inline-start">
                    <UserIcon />
                  </InputGroupAddon>
                  <InputGroupInput
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
                </InputGroup>
              </FormField>

              <FormField id="sign-up-email" label="Work email" error={errors.email?.message}>
                <InputGroup className="h-9" data-disabled={isSubmitting ? "true" : undefined}>
                  <InputGroupAddon align="inline-start">
                    <MailIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="sign-up-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "sign-up-email-error" : undefined}
                    {...register("email")}
                  />
                </InputGroup>
              </FormField>

              <FormField
                id="sign-up-password"
                label="Password"
                hint={
                  <PasswordChecklist
                    id="sign-up-password-checklist"
                    password={passwordValue}
                  />
                }
                error={errors.password?.message}
              >
                <PasswordInput
                  id="sign-up-password"
                  groupClassName="h-9"
                  startIcon={<LockIcon />}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password
                      ? "sign-up-password-checklist sign-up-password-error"
                      : "sign-up-password-checklist"
                  }
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
                  groupClassName="h-9"
                  startIcon={<LockIcon />}
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
            </FieldGroup>

            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              <span>Create account</span>
              {!isSubmitting ? <ArrowRightIcon data-icon="inline-end" /> : null}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground">
          Already have a ReviewPilot account?{" "}
          <Link
            href="/login"
            className="font-medium text-link underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
