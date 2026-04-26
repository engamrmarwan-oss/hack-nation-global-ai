interface LogoProps {
  markOnly?: boolean;
  className?: string;
}

export function Logo({ markOnly = false, className }: LogoProps) {
  if (markOnly) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 40"
        fill="none"
        className={className}
        width="40"
        height="40"
        aria-label="Operon AI mark"
      >
        <g transform="translate(0,4)">
          <rect x="18" y="2" width="4" height="14" rx="1" fill="#0D9488" />
          <path d="M12 16 Q10 28 20 34 Q30 28 28 16 Z" fill="#0D9488" opacity="0.15" />
          <path d="M12 16 Q10 28 20 34 Q30 28 28 16 Z" stroke="#0D9488" strokeWidth="1.5" fill="none" />
          <rect x="14" y="14" width="12" height="3" rx="1" fill="#0D9488" />
          <circle cx="20" cy="26" r="2.5" fill="#0D9488" opacity="0.6" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 48"
      fill="none"
      className={className}
      width="240"
      height="48"
      aria-label="Operon AI — Scientific planning copilot"
    >
      <g transform="translate(0,4)">
        <rect x="18" y="2" width="4" height="14" rx="1" fill="#0D9488" />
        <path d="M12 16 Q10 28 20 34 Q30 28 28 16 Z" fill="#0D9488" opacity="0.15" />
        <path d="M12 16 Q10 28 20 34 Q30 28 28 16 Z" stroke="#0D9488" strokeWidth="1.5" fill="none" />
        <rect x="14" y="14" width="12" height="3" rx="1" fill="#0D9488" />
        <circle cx="20" cy="26" r="2.5" fill="#0D9488" opacity="0.6" />
      </g>
      <text
        x="44"
        y="22"
        fontFamily="'Libre Baskerville', Georgia, serif"
        fontSize="16"
        fontWeight="700"
        fill="#E8EDF4"
        letterSpacing="-0.3"
      >
        Operon AI
      </text>
      <text
        x="44"
        y="38"
        fontFamily="'IBM Plex Sans', Arial, sans-serif"
        fontSize="9"
        fontWeight="500"
        fill="#64748B"
        letterSpacing="1.5"
      >
        SCIENTIFIC PLANNING COPILOT
      </text>
    </svg>
  );
}
