export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-800 mb-1">Ma Progression CP</h1>
        <p className="text-center text-gray-400 text-sm mb-8">🍎 L'outil de Cécile</p>
        {children}
      </div>
    </div>
  )
}
