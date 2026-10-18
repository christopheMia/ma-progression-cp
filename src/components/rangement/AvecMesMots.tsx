'use client'
import { useState } from 'react'
import { demanderRegle } from '@/lib/ia/regle-client'
import type { RegleComprise } from '@/lib/ia/schema-regle'

/** « Chant vers Musique, le jeudi » */
export function phraseRegle(r: RegleComprise): string {
  return `${r.type} vers ${r.creneau}${r.jour ? `, le ${r.jour}` : ''}`
}

/**
 * « Avec mes mots » (conception du 18/10/2026) : elle dit où elle fait une
 * séance, l'appli lui montre la règle comprise, elle répond « C'est ça » ou
 * « Je réexplique ». Rien n'est enregistré sans son « C'est ça ». Jamais
 * bloquée : une erreur s'affiche, le champ reste ouvert.
 *
 * Servira aussi au bandeau du cahier journal (étape 2) et à l'import
 * (étape 3) : `typeConnu` y donne le type déjà connu.
 */
export default function AvecMesMots({ typeConnu, onValidee, exemple }: {
  typeConnu?: string
  /** Enregistre la règle ; rend un message d'erreur, ou `null`. */
  onValidee: (regle: RegleComprise) => Promise<string | null>
  exemple?: string
}) {
  const [phrase, setPhrase] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [proposee, setProposee] = useState<RegleComprise | null>(null)
  const [introuvable, setIntrouvable] = useState<string | null>(null)
  const [incompris, setIncompris] = useState(0)
  const [erreur, setErreur] = useState<string | null>(null)
  const [notee, setNotee] = useState(false)

  async function comprendre() {
    setEnCours(true)
    setErreur(null)
    setProposee(null)
    setIntrouvable(null)
    setNotee(false)
    const r = await demanderRegle(phrase, typeConnu)
    setEnCours(false)
    if (!r.ok) {
      setErreur(r.message)
      return
    }
    const rep = r.reponse
    if (rep.statut === 'regle') {
      setProposee(rep.regle)
    } else if (rep.statut === 'introuvable') {
      setIntrouvable(rep.demande
        ? `Je ne trouve pas de case « ${rep.demande} » dans ton emploi du temps.`
        : 'Je ne trouve pas cette case dans ton emploi du temps.')
      if (rep.plusProche) setProposee({ type: rep.type, ...rep.plusProche })
    } else {
      setIncompris(n => n + 1)
    }
  }

  async function valider() {
    if (!proposee) return
    setEnCours(true)
    const message = await onValidee(proposee)
    setEnCours(false)
    if (message) {
      setErreur(message)
      return
    }
    setNotee(true)
    setProposee(null)
    setIntrouvable(null)
    setPhrase('')
    setIncompris(0)
  }

  function reexpliquer() {
    setProposee(null)
    setIntrouvable(null)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-700">
        Dis-moi où tu la fais
        <textarea
          className="mt-1 block w-full rounded border p-2 text-sm"
          rows={2}
          value={phrase}
          disabled={enCours}
          placeholder={exemple ?? 'Par exemple : le chant, c’est en Musique le jeudi'}
          onChange={e => setPhrase(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="rounded bg-violet-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        disabled={enCours || phrase.trim().length < 3}
        onClick={comprendre}
      >
        Comprendre
      </button>

      {introuvable && <p className="text-sm text-amber-700">{introuvable}</p>}
      {proposee && (
        <div className="rounded border border-violet-200 bg-violet-50 p-2 text-sm">
          <p>J’ai compris : {phraseRegle(proposee)}.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="rounded bg-violet-600 px-3 py-1 text-white" disabled={enCours} onClick={valider}>
              C’est ça
            </button>
            <button type="button" className="rounded border px-3 py-1" disabled={enCours} onClick={reexpliquer}>
              Je réexplique
            </button>
          </div>
        </div>
      )}
      {incompris === 1 && <p className="text-sm text-amber-700">Je n’ai pas compris. Redis-le autrement, avec le nom de ta case.</p>}
      {incompris >= 2 && <p className="text-sm text-amber-700">Je n’ai pas compris, tu peux la poser à la main dans le cahier journal.</p>}
      {erreur && <p className="text-sm text-red-700">{erreur}</p>}
      {notee && <p className="text-sm text-green-700">C’est noté.</p>}
    </div>
  )
}
