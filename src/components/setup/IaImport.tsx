'use client'
import { useState } from 'react'
import type { ProgressionSemaine } from '@/data/manuels'

type ChatTurn = { role: 'user' | 'assistant'; content: string }

export default function IaImport({
  prenom,
  onSelect,
}: {
  prenom?: string
  onSelect: (id: string, progression: ProgressionSemaine[]) => void
}) {
  const [texte, setTexte] = useState('')
  const [progression, setProgression] = useState<ProgressionSemaine[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatTurn[]>([])
  const [message, setMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  async function lancerImport(form: FormData) {
    setError(null); setLoading(true); setProgression(null)
    try {
      const res = await fetch('/api/ia-manuel', { method: 'POST', body: form })
      const raw = await res.text()
      let data: { progression?: ProgressionSemaine[]; error?: string } | null = null
      try { data = JSON.parse(raw) } catch { data = null }
      if (!res.ok || !data || !data.progression) {
        setError(`Erreur ${res.status} : ${data?.error ?? (raw.slice(0, 150) || 'réponse vide')}`)
      } else {
        setProgression(data.progression)
        setChat([{ role: 'assistant', content: prenom
          ? `Bonjour ${prenom} ! J'ai préparé votre progression : ${data.progression.length} semaines. Dites-moi si quelque chose ne va pas 😊`
          : `J'ai préparé votre progression : ${data.progression.length} semaines.` }])
      }
    } catch (e) {
      setError(`Erreur réseau : ${e instanceof Error ? e.message : String(e)}`)
    } finally { setLoading(false) }
  }

  function importPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const form = new FormData(); form.append('pdf', file); lancerImport(form)
  }

  function importTexte() {
    if (texte.trim().length < 20) { setError('Collez le sommaire (texte un peu plus long).'); return }
    const form = new FormData(); form.append('texte', texte); lancerImport(form)
  }

  async function envoyerCorrection() {
    const msg = message.trim(); if (!msg || !progression) return
    setMessage(''); setChatLoading(true)
    setChat(c => [...c, { role: 'user', content: msg }])
    try {
      const res = await fetch('/api/ia-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progression, message: msg, prenom, historique: chat }),
      })
      const data = await res.json()
      if (!res.ok) setChat(c => [...c, { role: 'assistant', content: data.error ?? 'Erreur' }])
      else { setProgression(data.progression); setChat(c => [...c, { role: 'assistant', content: data.reponse }]) }
    } catch { setChat(c => [...c, { role: 'assistant', content: 'Erreur réseau.' }]) }
    finally { setChatLoading(false) }
  }

  return (
    <div className="space-y-4">
      {!progression && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Déposez le PDF de votre manuel <strong>ou</strong> collez son sommaire. L&apos;IA reconstruit la progression — vous pourrez tout corriger ensuite.
          </p>
          <input type="file" accept=".pdf" onChange={importPdf} disabled={loading}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-violet-700 hover:file:bg-violet-100 file:cursor-pointer disabled:opacity-50" />
          <textarea value={texte} onChange={e => setTexte(e.target.value)} disabled={loading}
            placeholder="…ou collez ici le sommaire du manuel"
            className="w-full h-28 border border-gray-200 rounded-lg p-2 text-sm text-gray-900 bg-white" />
          <button onClick={importTexte} disabled={loading}
            className="w-full py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-semibold disabled:opacity-50">
            {loading ? 'Analyse en cours…' : '🤖 Analyser avec l’IA'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {progression && (
        <div className="space-y-4">
          {/* Tableau éditable */}
          <div className="max-h-72 overflow-y-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 sticky top-0">
                <tr className="text-left text-violet-800">
                  <th className="px-2 py-1 w-12">Sem.</th><th className="px-2 py-1">Sons</th>
                  <th className="px-2 py-1">Pages</th><th className="px-2 py-1">Mots</th>
                </tr>
              </thead>
              <tbody>
                {progression.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1 text-gray-500">{s.numero}</td>
                    <td className="px-2 py-1">
                      <input value={s.graphemes.join(' ')} onChange={e => {
                        const v = e.target.value.split(/\s+/).filter(Boolean)
                        setProgression(p => p!.map((x, j) => j === i ? { ...x, graphemes: v } : x))
                      }} className="w-full bg-white text-gray-900 rounded px-1 py-0.5 border border-gray-200" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={s.pages} onChange={e =>
                        setProgression(p => p!.map((x, j) => j === i ? { ...x, pages: e.target.value } : x))
                      } className="w-full bg-white text-gray-900 rounded px-1 py-0.5 border border-gray-200" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={s.mots_exemple.join(' ')} onChange={e => {
                        const v = e.target.value.split(/\s+/).filter(Boolean)
                        setProgression(p => p!.map((x, j) => j === i ? { ...x, mots_exemple: v } : x))
                      }} className="w-full bg-white text-gray-900 rounded px-1 py-0.5 border border-gray-200" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Boîte de dialogue */}
          <div className="border-2 border-violet-200 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 py-2 text-sm font-semibold">
              💜 Votre assistant progression
            </div>
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto bg-violet-50/40">
              {chat.map((t, i) => (
                <div key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
                  <span className={`inline-block rounded-2xl px-3 py-1.5 text-sm ${
                    t.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white border text-gray-800'}`}>
                    {t.role === 'assistant' && '🤖 '}{t.content}
                  </span>
                </div>
              ))}
              {chatLoading && <p className="text-xs text-violet-700">✍️ l’assistant réfléchit…</p>}
            </div>
            <div className="flex gap-2 p-2 border-t bg-white">
              <input value={message} onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && envoyerCorrection()}
                placeholder="Écrivez votre correction ici…"
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white" />
              <button onClick={envoyerCorrection} disabled={chatLoading}
                className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">→</button>
            </div>
          </div>

          <button onClick={() => onSelect('custom', progression)}
            className="w-full py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-semibold">
            ✅ Utiliser cette progression
          </button>
        </div>
      )}
    </div>
  )
}
