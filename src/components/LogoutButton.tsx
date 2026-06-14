'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/connexion')
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-50">
      {loading ? 'Déconnexion...' : '↪ Déconnexion'}
    </button>
  )
}
