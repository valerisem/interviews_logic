'use client';

import { useState } from 'react';

export function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
