// Logo default de AzanoLabs: SVG inline (no archivo externo importado),
// para que tsup lo incluya en el bundle sin depender de un loader de assets.
// Espejo visual de src/assets/azanolabs-logo.svg (referencia fuente).
interface AzanoLogoProps {
  className?: string
}

export function AzanoLogo({ className }: AzanoLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 32"
      width="120"
      height="32"
      role="img"
      aria-label="AzanoLabs"
      className={className ?? 'azano-logo'}
    >
      <defs>
        <linearGradient id="aznl-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4FC3FF" />
          <stop offset="100%" stopColor="#79D8FF" />
        </linearGradient>
      </defs>
      <text
        x="2"
        y="22"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="18"
        fontWeight="700"
        letterSpacing="0.5"
        fill="url(#aznl-grad)"
      >
        AzanoLabs
      </text>
      <circle cx="112" cy="16" r="3" fill="#4FC3FF" />
    </svg>
  )
}
