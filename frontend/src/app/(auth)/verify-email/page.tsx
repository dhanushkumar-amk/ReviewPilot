"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircleIcon, ArrowRightIcon, CheckCircle2Icon } from "lucide-react";
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

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const isFailed = Boolean(error);

  return (
    <Card className="shadow-xs sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Email verification
        </CardTitle>
        <CardDescription>
          {isFailed
            ? "We could not validate your verification link."
            : "Your email verification request is complete."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {isFailed ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Verification link invalid or expired</AlertTitle>
            <AlertDescription>
              The verification link could not be validated. Sign in to request a new verification
              email.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>Email verified</AlertTitle>
            <AlertDescription>
              Your email address has been verified. You can now access your ReviewPilot workspace.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {isFailed ? (
          <Button
            variant="default"
            size="lg"
            render={<Link href="/login" />}
            nativeButton={false}
            className="w-full"
          >
            <span>Go to sign in</span>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="default"
              size="lg"
              render={<Link href="/dashboard" />}
              nativeButton={false}
              className="w-full"
            >
              <span>Continue to dashboard</span>
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/login" />}
              nativeButton={false}
              className="w-full"
            >
              <span>Sign in</span>
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
