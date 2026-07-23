'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Bouton from '@/components/ui/Bouton'

export default function ConnexionPage() {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect'); setLoading(false) }
    else { router.refresh(); router.push('/accueil') }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full border rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-violet-500 outline-none"
          placeholder="cecile@ecole.fr" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full border rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-violet-500 outline-none" />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Bouton type="submit" variant="principal" size="lg" loading={loading} className="w-full">
        {loading ? 'Connexion…' : 'Se connecter'}
      </Bouton>
      <p className="text-center text-sm text-gray-500">
        Pas de compte ? <Link href="/inscription" className="text-violet-700 font-medium">S'inscrire</Link>
      </p>
    </form>
  )
}