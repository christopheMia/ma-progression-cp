'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function InscriptionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/setup')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe (6 caractères min.)</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          required minLength={6}
          className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-700 text-white rounded-lg p-3 font-semibold hover:bg-blue-800 disabled:opacity-50">
        {loading ? 'Création...' : 'Créer mon compte'}
      </button>
      <p className="text-center text-sm text-gray-500">
        Déjà un compte ? <Link href="/connexion" className="text-blue-700 font-medium">Se connecter</Link>
      </p>
    </form>
  )
}
