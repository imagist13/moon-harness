interface ContextRingProps {
  totalK: number;
  usedK: number;
  percentage: number;
}

export function ContextRing({ totalK, usedK, percentage }: ContextRingProps) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isWarning = percentage >= 80;

  return (
    <div className="relative flex items-center justify-center w-11 h-11 flex-shrink-0" title={`上下文: ${usedK}K / ${totalK}K (${percentage}%)`}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="transform -rotate-90">
        <circle
          cx="22"
          cy="22"
          r={radius}
          stroke="var(--border-color)"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          stroke={isWarning ? '#f59e0b' : 'var(--accent-primary)'}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <span className={`absolute text-[9px] font-semibold ${isWarning ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}>
        {Math.round(percentage)}%
      </span>
    </div>
  );
}
