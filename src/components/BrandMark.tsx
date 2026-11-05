import type { CSSProperties } from "react";

interface BrandMarkProps {
  size?: number;
  variant?: "compact" | "route";
  className?: string;
  title?: string;
}

const A_PATH =
  "M49.4 69.37Q49.4 69.87 48.93 69.97Q48.46 70.06 46.52 70.06Q46.01 70.06 43.69 70Q39.05 69.87 37.29 69.87Q35.22 69.87 33.65 69.94Q30.51 70.06 29.38 70.06Q27.69 70.06 27.69 69.44Q27.69 68.81 31.26 68.74Q32.14 68.74 32.58 68.62Q33.59 68.49 33.59 67.87Q33.59 67.55 32.83 65.23L31.51 61.15Q31.14 59.77 29.88 56.07H28.75L23.86 56Q21.22 55.94 18.27 56.07Q17.71 57.32 16.14 61.71L14.76 65.79Q14.44 66.74 14.44 67.3Q14.44 68.37 15.82 68.68Q16.14 68.74 18.9 68.93Q19.78 69 19.78 69.5Q19.78 70.06 18.65 70.06L8.29 70Q7.91 70.06 7.48 70.06Q6.6 70.06 6.6 69.44Q6.6 69.06 8.54 68.93Q11.05 68.81 11.74 67.99Q12.43 67.18 14 62.72Q15.2 59.58 17.46 53.43L25.05 32.53Q25.61 31.15 26.62 28.2Q27.31 26.06 27.69 26.06Q28.06 26.06 29.07 28.95Q30.32 32.65 40.11 58.2Q41.37 61.46 42.62 64.85Q43.69 67.74 44.76 68.37Q45.57 68.87 48.65 68.81Q49.4 68.81 49.4 69.37ZM29.44 54.68Q29.38 54.5 29 53.49Q26.49 46.21 25.36 43.26Q25.05 42.45 24.49 40.88L24.11 39.75Q22.98 42.45 21.35 47.22Q19.53 52.55 18.71 54.68Q19.28 54.68 20.09 54.62Q20.84 54.62 21.47 54.62H24.99Q26.43 54.62 29.44 54.68Z";

export function BrandMark({
  size = 44,
  variant = "compact",
  className = "",
  title
}: BrandMarkProps) {
  const route = variant === "route";

  return (
    <span
      className={`brand-mark ${className}`.trim()}
      style={{ "--brand-size": `${size}px` } as CSSProperties}
    >
      <svg
        viewBox={route ? "0 0 128 128" : "0 0 96 96"}
        width={size}
        height={size}
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
        focusable="false"
      >
        {title && <title>{title}</title>}
        {route && (
          <>
            <path
              d="M8 120 L120 8"
              stroke="var(--gold, #e5a72d)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <circle cx="8" cy="120" r="4.4" fill="var(--gold, #e5a72d)" />
            <circle cx="120" cy="8" r="4.4" fill="var(--gold, #e5a72d)" />
          </>
        )}
        <g transform={route ? "translate(16 16)" : undefined}>
          <rect
            x="2"
            y="2"
            width="92"
            height="92"
            rx="20"
            fill="var(--orange, #f05a36)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d={A_PATH} fill="#fffdf7" />
          <path d={A_PATH} transform="translate(40 0)" fill="#fffdf7" />
        </g>
      </svg>
    </span>
  );
}
