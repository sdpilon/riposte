"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * The minimal on-demand trigger assumed by spec.md ("a minimal way to
 * trigger a population run on demand ... exists for this feature to be
 * testable end-to-end"). The full "operate a running instance" experience
 * (scheduled runs, credential entry) is a separate, later feature.
 */
export function RunTriggerButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function trigger() {
    setMessage(null);
    const res = await fetch("/api/runs", { method: "POST" });

    if (res.status === 409) {
      const body = await res.json();
      setMessage(`A run is already in progress (${body.runId}).`);
      return;
    }

    if (!res.ok) {
      setMessage("Failed to start a population run.");
      return;
    }

    setMessage("Population run started.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-3">
      {message ? (
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {message}
        </span>
      ) : null}
      <button
        type="button"
        onClick={trigger}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        <RefreshCw className="size-4" aria-hidden />
        Run population sweep
      </button>
    </div>
  );
}
