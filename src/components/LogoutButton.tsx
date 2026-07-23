'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
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
      className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30">
      {loading
        ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        : <LogOut size={16} aria-hidden="true" />}
      Déconnexion
    </button>
  )
}
