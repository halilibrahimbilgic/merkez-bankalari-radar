"use client";

import { useState } from "react";

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Pano izni yoksa metin kutusundan elle seçilir.
        }
      }}
      className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-surface-sunken"
    >
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}
