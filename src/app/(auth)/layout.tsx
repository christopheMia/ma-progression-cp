export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-pink-50 to-fuchsia-100 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur border border-rose-100 rounded-2xl shadow-sm p-8 w-full max-w-md">
        <div className="text-4xl text-center mb-3">🍎</div>
        <h1 className="text-2xl font-bold tracking-tight text-center text-slate-900 mb-1">Ma Progression CP</h1>
        <p className="text-center text-slate-400 text-sm mb-8">L&apos;outil de Cécile</p>
        {children}
      </div>
    </div>
  )
}
