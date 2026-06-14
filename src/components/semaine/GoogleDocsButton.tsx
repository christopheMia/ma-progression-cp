'use client'
import { useEffect, useState } from 'react'
import { JourJournal } from '@/types'
import { genererBlobWord } from '@/lib/export-word'

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; error?: string }) => void
          }): { requestAccessToken: (overrides?: { prompt?: string }) => void }
        }
      }
    }
  }
}

export default function GoogleDocsButton({ journal, numeroSemaine }: { journal: JourJournal[]; numeroSemaine: number }) {
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID) return
    if (window.google?.accounts?.oauth2) { setReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => setReady(true)
    document.head.appendChild(s)
  }, [])

  // Tant que l'identifiant Google n'est pas configuré, on n'affiche pas le bouton.
  if (!CLIENT_ID) return null

  function ouvrir() {
    if (!window.google) return
    setBusy(true)
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID!,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: async resp => {
        if (!resp.access_token) {
          setBusy(false)
          return
        }
        try {
          const blob = await genererBlobWord(journal, numeroSemaine)
          const metadata = {
            name: `Cahier journal — Semaine ${numeroSemaine}`,
            mimeType: 'application/vnd.google-apps.document', // conversion .docx → Google Doc
          }
          const form = new FormData()
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
          form.append('file', blob)

          const res = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
            { method: 'POST', headers: { Authorization: `Bearer ${resp.access_token}` }, body: form }
          )
          if (!res.ok) throw new Error(await res.text())
          const data = await res.json()
          window.open(`https://docs.google.com/document/d/${data.id}/edit`, '_blank', 'noopener,noreferrer')
        } catch (e) {
          console.error(e)
          alert("Impossible d'ouvrir le document dans Google Docs. Réessayez.")
        } finally {
          setBusy(false)
        }
      },
    })
    tokenClient.requestAccessToken()
  }

  return (
    <button
      onClick={ouvrir}
      disabled={!ready || busy}
      title="Crée le cahier journal directement dans votre Google Docs (connexion Google requise la 1re fois)."
      className="text-sm border border-violet-300 text-violet-700 rounded-lg px-3 py-1.5 hover:bg-violet-50 disabled:opacity-40">
      {busy ? 'Ouverture…' : '📝 Google Docs'}
    </button>
  )
}
