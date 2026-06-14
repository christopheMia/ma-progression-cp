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
      <div className="relative z-10 bg-white border border-violet-100 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-4xl text-center mb-3">🍎</div>
        <h1 className="text-2xl font-bold tracking-tight text-center text-slate-900 mb-1">Ma Progression CP</h1>
        <p className="text-center text-slate-400 text-sm mb-8">L&apos;outil de Cécile</p>
        {children}
      </div>
    </div>
  )
}
