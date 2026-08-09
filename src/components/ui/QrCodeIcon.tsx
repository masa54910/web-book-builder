import type { SVGProps } from "react";

/** A small, reusable QR mark for share controls and non-interactive examples. */
export default function QrCodeIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h.01M20 18v2" />
    </svg>
  );
}
