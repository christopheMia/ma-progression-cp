'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, X, ArrowRight, Check, Loader2 } from 'lucide-react'
import type { ProgressionSemaine } from '@/data/manuels'
import { corrigerProgression } from '@/lib/actions/progression-ia'
import Bouton from '@/components/ui/Bouton'

type ChatTurn = { role: 'user' | 'assistant'; content: string }

export default function ProgressionCorrector({
  classId,
  progression,
  prenom,
}: {
  classId: string
  progression: ProgressionSemaine[]
  prenom?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [prog, setProg] = useState<ProgressionSemaine[]>(progression)
  const [chat, setChat] = useState<ChatTurn[]>([])
  const [message, setMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [saving, startSave] = useTransition()

  function ouvrir() {
    setProg(progression)
    setChat([{ role: 'assistant', content: prenom
      ? `Bonjour ${prenom} ! Voici ta progression actuelle (${progression.length} semaines). Dis-moi ce que tu veux corriger.`
      : `Voici ta progression actuelle (${progression.length} semaines). Que veux-tu corriger ?` }])
    setMessage('')
    setOpen(true)
  }

  async function envoyer() {
    const msg = message.trim(); if (!msg) return
    setMessage(''); setChatLoading(true)
    setChat(c => [...c, { role: 'user', content: msg }])
    try {
      const res = await fetch('/api/ia-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progression: prog, message: msg, prenom, historique: chat }),
      })
      const data = await res.json()
      if (!res.ok) setChat(c => [...c, { role: 'assistant', content: data.error ?? 'Erreur' }])
      else { setProg(data.progression); setChat(c => [...c, { role: 'assistant', content: data.reponse }]) }
    } catch {
      setChat(c => [...c, { role: 'assistant', content: 'Erreur réseau.' }])
    } finally { setChatLoading(false) }
  }

  function enregistrer() {
    startSave(async () => {
      await corrigerProgression(classId, prog)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Bouton variant="contour" size="sm" icon={Bot} onClick={ouvrir}>
        Corriger la progression
      </Bouton>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-3 flex items-center gap-2">
              <Bot size={18} aria-hidden="true" />
              <span className="font-semibold">Corriger la progression</span>
              <button onClick={() => setOpen(false)} aria-label="Fermer"
                className="ml-auto rounded-lg p-1 text-white/80 hover:text-white hover:bg-white/20 transition-colors"><X size={18} /></button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <p className="text-xs text-gray-500">
                Les corrections modifient <strong>uniquement les sons / pages / mots</strong> des semaines.
                Le suivi des élèves, les cahiers journaux et les dates sont préservés.
              </p>

              {/* Tableau éditable */}
              <div className="max-h-56 overflow-y-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-violet-50 sticky top-0">
                    <tr className="text-left text-violet-800">
                      <th className="px-2 py-1 w-12">Sem.</th><th className="px-2 py-1">Sons</th>
                      <th className="px-2 py-1">Pages</th><th className="px-2 py-1">Mots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prog.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1 text-gray-500">{s.numero}</td>
                        <td className="px-2 py-1">
                          <input value={s.items.join(' ')} onChange={e => {
                            const v = e.target.value.split(/\s+/).filter(Boolean)
                            setProg(p => p.map((x, j) => j === i ? { ...x, items: v } : x))
                          }} className="w-full bg-white text-gray-900 rounded px-1 py-0.5 border border-gray-200" />
                        </td>
                        <td className="px-2 py-1">
                          <input value={s.pages} onChange={e =>
                            setProg(p => p.map((x, j) => j === i ? { ...x, pages: e.target.value } : x))
                          } className="w-full bg-white text-gray-900 rounded px-1 py-0.5 border border-gray-200" />
                        </td>
                        <td className="px-2 py-1">
                          <input value={s.mots_exemple.join(' ')} onChange={e => {
                            const v = e.target.value.split(/\s+/).filter(Boolean)
                            setProg(p => p.map((x, j) => j === i ? { ...x, mots_exemple: v } : x))
                          }} className="w-full bg-white text-gray-900 rounded px-1 py-0.5 border border-gray-200" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Boîte de dialogue */}
              <div className="border-2 border-violet-200 rounded-xl overflow-hidden">
                <div className="p-3 space-y-2 max-h-40 overflow-y-auto bg-violet-50/40">
                  {chat.map((t, i) => (
                    <div key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
                      <span className={`inline-flex items-start gap-1 rounded-2xl px-3 py-1.5 text-sm ${
                        t.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white border text-gray-800'}`}>
                        {t.role === 'assistant' && <Bot size={14} className="shrink-0 mt-0.5 text-violet-600" aria-hidden="true" />}
                        <span>{t.content}</span>
                      </span>
                    </div>
                  ))}
                  {chatLoading && <p className="text-xs text-violet-700 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" aria-hidden="true" /> l’assistant réfléchit…</p>}
                </div>
                <div className="flex gap-2 p-2 border-t bg-white">
                  <input value={message} onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && envoyer()}
                    placeholder="Ex. décale tout d’une semaine…"
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white" />
                  <Bouton variant="secondaire" size="sm" icon={ArrowRight} onClick={envoyer}
                    disabled={chatLoading} aria-label="Envoyer" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-3 border-t bg-slate-50">
              <Bouton variant="fantome" size="sm" onClick={() => setOpen(false)}>
                Annuler
              </Bouton>
              <Bouton variant="secondaire" size="sm" icon={Check} onClick={enregistrer} loading={saving} className="ml-auto">
                {saving ? 'Enregistrement…' : 'Enregistrer les corrections'}
              </Bouton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
