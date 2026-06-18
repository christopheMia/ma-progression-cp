import type { CSSProperties } from 'react'

// Bulles de peinture montantes (animation CSS, sans dépendance).
// Teintes violet/fuchsia pour rester dans le thème.
const BUBBLES: Array<{ left: string; size: number; dur: number; delay: number; color: string; op: number; drift: string }> = [
  { left: '4%', size: 30, dur: 14, delay: 0, color: '#a78bfa', op: 0.45, drift: '18px' },
  { left: '12%', size: 16, dur: 11, delay: 3, color: '#e879f9', op: 0.5, drift: '-14px' },
  { left: '20%', size: 44, dur: 17, delay: 1, color: '#c084fc', op: 0.35, drift: '22px' },
  { left: '28%', size: 12, dur: 9, delay: 5, color: '#f0abfc', op: 0.55, drift: '-10px' },
  { left: '36%', size: 24, dur: 13, delay: 2, color: '#a78bfa', op: 0.45, drift: '16px' },
  { left: '45%', size: 36, dur: 16, delay: 6, color: '#d8b4fe', op: 0.4, drift: '-20px' },
  { left: '53%', size: 14, dur: 10, delay: 0.5, color: '#e879f9', op: 0.55, drift: '12px' },
  { left: '61%', size: 28, dur: 15, delay: 4, color: '#c084fc', op: 0.45, drift: '-16px' },
  { left: '69%', size: 18, dur: 12, delay: 7, color: '#f0abfc', op: 0.5, drift: '14px' },
  { left: '77%', size: 40, dur: 18, delay: 1.5, color: '#a78bfa', op: 0.35, drift: '-24px' },
  { left: '85%', size: 20, dur: 11, delay: 3.5, color: '#e879f9', op: 0.5, drift: '18px' },
  { left: '92%', size: 32, dur: 15, delay: 6.5, color: '#d8b4fe', op: 0.4, drift: '-18px' },
  { left: '16%', size: 22, dur: 13, delay: 8, color: '#f0abfc', op: 0.45, drift: '10px' },
  { left: '40%', size: 16, dur: 10, delay: 9, color: '#c084fc', op: 0.5, drift: '-12px' },
  { left: '64%', size: 26, dur: 14, delay: 10, color: '#a78bfa', op: 0.4, drift: '20px' },
  { left: '88%', size: 14, dur: 9.5, delay: 11, color: '#e879f9', op: 0.55, drift: '-10px' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-br from-violet-300 via-purple-200 to-fuchsia-200 flex items-center justify-center p-4">
      {/* décorations */}
      <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -left-16 -top-16 w-72 h-72 text-white opacity-40">
        <circle cx="100" cy="100" r="100" fill="currentColor" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -right-20 -bottom-20 w-80 h-80 text-violet-500 opacity-20">
        <circle cx="100" cy="100" r="100" fill="currentColor" />
      </svg>

      {/* bulles de peinture montantes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="login-bubble"
            style={{
              left: b.left,
              width: b.size,
              height: b.size,
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), ${b.color} 55%, ${b.color}00 100%)`,
              '--b-dur': `${b.dur}s`,
              '--b-delay': `${b.delay}s`,
              '--b-op': b.op,
              '--b-drift': b.drift,
            } as CSSProperties}
          />
        ))}
      </div>

      <div className="relative z-10 bg-white border border-violet-100 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-4xl text-center mb-3">🍎</div>
        <h1 className="text-2xl font-bold tracking-tight text-center text-slate-900 mb-1">Ma Progression CP</h1>
        <p className="text-center text-slate-400 text-sm mb-8">L&apos;outil de Cécile</p>
        {children}
      </div>
    </div>
  )
}
