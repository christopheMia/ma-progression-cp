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
      className="text-blue-200 hover:text-white text-sm disabled:opacity-50">
      {loading ? 'Déconnexion...' : '↪ Déconnexion'}
    </button>
  )
}
