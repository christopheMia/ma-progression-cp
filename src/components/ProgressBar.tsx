export default function ProgressBar({
  value,
  max,
  color = 'bg-violet-500',
}: {
  value: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full bg-gray-200/80 rounded-full h-2.5 overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}
