'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import Bouton from '@/components/ui/Bouton'

type TourConversation = { role: 'user' | 'assistant'; content: string }

type ChatAssistantProps = {
  prenom?: string
  rentreeDate?: string
  matieres?: string[]
}

const CHAMP =
  'w-full resize-none rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'outline-none transition-colors focus:border-violet-600 focus:ring-4 focus:ring-violet-200/70 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 motion-reduce:transition-none'

// Amorces concretes : un champ vide face a « pose ta question » laisse souvent
// l'utilisateur sans idee de ce que l'assistant sait faire.
const AMORCES = [
  'Comment je démarre ma progression ?',
  'Que faire de la semaine de rentrée ?',
  'Comment suivre les acquis d’un élève ?',
]

export default function ChatAssistant({ prenom, rentreeDate, matieres }: ChatAssistantProps) {
  const [tours, setTours] = useState<TourConversation[]>([])
  const [saisie, setSaisie] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const finRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Appel optionnel: scrollIntoView n'existe pas partout (jsdom, vieux moteurs).
    finRef.current?.scrollIntoView?.({ block: 'end' })
  }, [tours, envoi])

  useEffect(() => () => abortRef.current?.abort(), [])

  async function envoyer(texte: string) {
    const message = texte.trim()
    if (!message || envoi) return

    // L'historique envoye est celui d'AVANT ce message: le message part a part.
    const historique = tours
    setTours([...tours, { role: 'user', content: message }])
    setSaisie('')
    setErreur(null)
    setEnvoi(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const reponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message,
          historique,
          prenom,
          rentree_date: rentreeDate,
          matieres,
        }),
        signal: controller.signal,
      })
      const donnees = await reponse.json().catch(() => null)

      if (!reponse.ok || !donnees?.reponse) {
        setErreur(
          typeof donnees?.error === 'string'
            ? donnees.error
            : `L’assistant n’a pas pu répondre (erreur ${reponse.status}).`,
        )
        return
      }
      setTours(precedents => [...precedents, { role: 'assistant', content: donnees.reponse }])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setErreur(
        `Connexion impossible : ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setEnvoi(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto" aria-live="polite">
        {tours.length === 0 && (
          <div className="space-y-3">
            <p className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm leading-6 text-violet-950">
              {prenom ? `Bonjour ${prenom} ! ` : 'Bonjour ! '}
              Pose-moi une question sur ta classe, ta progression ou l’application.
              Je peux aussi t’aider sur la pédagogie du CP.
            </p>
            <div className="flex flex-wrap gap-2">
              {AMORCES.map(amorce => (
                <button
                  key={amorce}
                  type="button"
                  onClick={() => void envoyer(amorce)}
                  className="rounded-full border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-50 motion-reduce:transition-none"
                >
                  {amorce}
                </button>
              ))}
            </div>
          </div>
        )}

        {tours.map((tour, index) => (
          <div
            key={index}
            className={tour.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${
                tour.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-800'
              }`}
            >
              {tour.content}
            </p>
          </div>
        ))}

        {envoi && (
          <p role="status" className="text-sm text-slate-500">
            L’assistant réfléchit…
          </p>
        )}

        {erreur && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
          >
            {erreur}
          </p>
        )}

        <div ref={finRef} />
      </div>

      <form
        className="mt-3 flex items-end gap-2 border-t border-slate-200 pt-3"
        onSubmit={event => {
          event.preventDefault()
          void envoyer(saisie)
        }}
      >
        <label className="sr-only" htmlFor="assistant-message">
          Ta question
        </label>
        <textarea
          id="assistant-message"
          rows={2}
          className={CHAMP}
          placeholder="Pose ta question…"
          value={saisie}
          disabled={envoi}
          onChange={event => setSaisie(event.target.value)}
          onKeyDown={event => {
            // Entrée envoie, Maj+Entrée passe à la ligne.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void envoyer(saisie)
            }
          }}
        />
        <Bouton
          type="submit"
          variant="principal"
          size="md"
          icon={Send}
          aria-label="Envoyer"
          disabled={envoi || !saisie.trim()}
          className="shrink-0"
        />
      </form>
    </div>
  )
}
