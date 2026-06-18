import React from 'react';

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  /** Pass true to force a single color (currentColor). Otherwise it uses original brand colors. */
  monochrome?: boolean;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ className, monochrome = false, ...props }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Map Pin with cutout */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32 4C19.85 4 10 13.85 10 26C10 42.5 32 60 32 60C32 60 54 42.5 54 26C54 13.85 44.15 4 32 4Z M32 14C38.6 14 44 19.4 44 26C44 32.6 38.6 38 32 38C25.4 38 20 32.6 20 26C20 19.4 25.4 14 32 14Z"
        fill={monochrome ? 'currentColor' : '#0EA5E9'}
      />

      {/* S-shaped Route */}
      <path
        d="M 12 38 C 28 50, 24 16, 46 16"
        stroke={monochrome ? '#E2E8F0' : '#22C55E'}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Mini Bus (Larger and White with Green Border for visibility) */}
      <g transform="translate(35, 6) rotate(12)">
        <rect
          x="0"
          y="0"
          width="24"
          height="14"
          rx="4"
          fill={monochrome ? 'currentColor' : '#FFFFFF'}
          stroke={monochrome ? 'transparent' : '#22C55E'}
          strokeWidth={monochrome ? 0 : 3}
        />
        {/* Windows */}
        <rect x="14" y="3" width="6" height="5" rx="1.5" fill={monochrome ? '#0f172a' : '#0EA5E9'} />
        <rect x="6" y="3" width="6" height="5" rx="1.5" fill={monochrome ? '#0f172a' : '#0EA5E9'} />
        {/* Wheels */}
        <circle cx="6" cy="14" r="3" fill={monochrome ? '#FFFFFF' : '#1E293B'} />
        <circle cx="18" cy="14" r="3" fill={monochrome ? '#FFFFFF' : '#1E293B'} />
      </g>
    </svg>
  );
};
