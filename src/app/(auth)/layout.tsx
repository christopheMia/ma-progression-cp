export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-rose-50 to-violet-100 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-4xl text-center mb-2">🍎</div>
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent mb-1">Ma Progression CP</h1>
        <p className="text-center text-gray-400 text-sm mb-8">L&apos;outil de Cécile</p>
        {children}
      </div>
    </div>
  )
}
