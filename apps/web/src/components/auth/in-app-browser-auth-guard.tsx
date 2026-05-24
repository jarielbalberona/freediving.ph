"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getInAppBrowserName } from "@/lib/auth/in-app-browser";

type InAppBrowserAuthGuardProps = {
  children: ReactNode;
  initialBrowserName: string | null;
};

const GOOGLE_AUTH_TRIGGER_PATTERN = /\bgoogle\b/i;

const getClickableAuthTrigger = (
  target: EventTarget | null,
): Element | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest("a,button,[role='button']");
};

const isGoogleAuthTrigger = (target: EventTarget | null): boolean => {
  const trigger = getClickableAuthTrigger(target);

  if (!trigger) {
    return false;
  }

  const label = [
    trigger.textContent,
    trigger.getAttribute("aria-label"),
    trigger.getAttribute("title"),
  ]
    .filter(Boolean)
    .join(" ");

  return GOOGLE_AUTH_TRIGGER_PATTERN.test(label);
};

export function InAppBrowserAuthGuard({
  children,
  initialBrowserName,
}: InAppBrowserAuthGuardProps) {
  const [browserName, setBrowserName] = useState<string | null>(
    initialBrowserName,
  );
  const [currentUrl, setCurrentUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [blockedAttempt, setBlockedAttempt] = useState(false);

  useEffect(() => {
    const detectedName = getInAppBrowserName(window.navigator.userAgent);

    setBrowserName(detectedName);
    setCurrentUrl(window.location.href);
  }, []);

  const handleCopyLink = async () => {
    if (!currentUrl) {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(currentUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!browserName || !isGoogleAuthTrigger(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setBlockedAttempt(true);
  };

  return (
    <div
      className="flex w-full flex-col items-center gap-6"
      onClickCapture={handleClickCapture}
    >
      {browserName ? (
        <Card className="w-full max-w-md border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle>Open in Safari or Chrome to sign in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Google sign-in does not work inside Messenger, Facebook,
              Instagram, or other in-app browsers. Tap the menu and choose Open
              in browser, then continue signing in.
            </p>
            <p className="text-muted-foreground text-sm">
              Google blocks sign-in inside in-app browsers for account security.
            </p>
            {blockedAttempt ? (
              <p className="font-medium text-destructive text-sm">
                Open this page in Safari or Chrome before using Google sign-in.
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCopyLink}
            >
              {copyState === "copied" ? <Check /> : <Copy />}
              <span>
                {copyState === "copied"
                  ? "Link copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy link"}
              </span>
            </Button>
            {currentUrl ? (
              <a
                className={cn(buttonVariants({ variant: "default" }), "w-full")}
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink />
                <span>Open in browser</span>
              </a>
            ) : null}
          </CardFooter>
        </Card>
      ) : null}
      {children}
    </div>
  );
}
