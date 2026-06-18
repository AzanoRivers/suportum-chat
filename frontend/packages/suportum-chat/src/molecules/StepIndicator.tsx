interface StepIndicatorProps {
  current: number
  total: number
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="step-indicator">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={[
            'step-bar',
            i + 1 < current  ? 'step-bar--done'    : '',
            i + 1 === current ? 'step-bar--current' : '',
          ].filter(Boolean).join(' ')}
        />
      ))}
      <span className="step-counter">
        {current}/{total}
      </span>
    </div>
  )
}
