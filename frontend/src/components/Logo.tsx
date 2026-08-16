interface LogoProps {
  size?: number;
  className?: string;
}

/** The Runway Mark: a descending flight path leveling out onto a runway. */
export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 14 18 Q 60 22 66 58 L 90 58"
        fill="none"
        stroke="#0e4b4a"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={66} cy={58} r={5.5} fill="#d99a34" />
      <line
        x1={8}
        y1={80}
        x2={92}
        y2={80}
        stroke="#6f938e"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray="13 9"
      />
    </svg>
  );
}
