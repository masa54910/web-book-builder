import type { SVGProps } from "react";

export type ServiceIconName = "x" | "note" | "instagram" | "facebook" | "line";

type Props = SVGProps<SVGSVGElement> & {
  service: ServiceIconName;
};

/** Small inline marks for the services used by the share UI. */
export default function ServiceIcon({ service, className, ...props }: Props) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className,
    focusable: "false" as const,
    "aria-hidden": true,
    ...props,
  };

  if (service === "x") {
    return (
      <svg {...common}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.963 6.817H1.685l7.73-8.835L1.26 2.25h6.826l4.713 6.231 5.445-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
      </svg>
    );
  }

  if (service === "facebook") {
    return (
      <svg {...common}>
        <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.08c0-.87.24-1.46 1.5-1.46h1.7V3.94c-.3-.04-1.32-.13-2.51-.13-2.49 0-4.2 1.52-4.2 4.31V10H7.2v3h2.79v8h3.51Z" />
      </svg>
    );
  }

  if (service === "instagram") {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" fill="white" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="white" />
      </svg>
    );
  }

  if (service === "line") {
    return (
      <svg {...common}>
        <path d="M12 3C6.48 3 2 6.56 2 10.95c0 3.83 3.42 7.04 8.05 7.74.31.07.73.22.84.5.1.25.07.63.03.88l-.14.84c-.04.25-.2.98.86.53 1.06-.45 5.72-3.37 7.8-5.77 1.44-1.58 2.56-3.17 2.56-4.72C22 6.56 17.52 3 12 3Z" />
        <text x="12" y="12.7" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="4.2" fontWeight="700" fill="white">LINE</text>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" />
      <path d="M8.2 17v-5.2c0-2.18 1.24-3.62 3.3-3.62 2.08 0 3.3 1.44 3.3 3.62V17h-2.4v-4.82c0-.99-.31-1.66-1.16-1.66-.86 0-1.17.67-1.17 1.66V17H8.2Z" fill="white" />
    </svg>
  );
}
