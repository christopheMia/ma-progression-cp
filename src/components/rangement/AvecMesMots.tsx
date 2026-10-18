'use client'
import { useState } from 'react'
import { demanderRegle } from '@/lib/ia/regle-client'
import type { RegleComprise } from '@/lib/ia/schema-regle'
import type { JourSemaine } from '@/types'

/** « Chant vers Musique, le jeudi » */
export function phraseRegle(r: RegleComprise): string {
  return `${r.type} vers ${r.creneau}${r.jour ? `, le ${r.jour}` : ''}`
}

/** « le mardi », « le lundi ou le mardi », « le lundi, le mardi ou le jeudi » */
export function listeJours(jours: JourSemaine[]): string {
  const l = jours.map(j => `le ${j}`)
  return l.length < 2 ? (l[0] ?? '') : `${l.slice(0, -1).join(', ')} ou ${l[l.length - 1]}`
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
  // Rempli quand la proposition est la case la plus proche, pas ce qu'elle a
  // demandé : la question dit alors QUEL jour (essai du 18/10, « Musique »
  // seule laissait croire au jeudi demandé alors que la case est le mardi).
  const [proche, setProche] = useState<{ jours: JourSemaine[]; memeCase: boolean } | null>(null)
  const [introuvable, setIntrouvable] = useState<string | null>(null)
  // `echecs` compte tout ce qui n'a pas abouti : réponse « incompris », case
  // sans plus proche, clic sur « Je réexplique ». À deux, on offre la sortie
  // à la main. `dernierIncompris` ne sert qu'au premier conseil.
  const [echecs, setEchecs] = useState(0)
  const [dernierIncompris, setDernierIncompris] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [notee, setNotee] = useState(false)

  async function comprendre() {
    setEnCours(true)
    setErreur(null)
    setProposee(null)
    setProche(null)
    setIntrouvable(null)
    setDernierIncompris(false)
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
      setIntrouvable(rep.jourAbsent
        ? `Il n’y a pas de case « ${rep.jourAbsent.creneau} » le ${rep.jourAbsent.jour} dans ton emploi du temps.`
        : rep.demande
          ? `Je ne trouve pas de case « ${rep.demande} » dans ton emploi du temps.`
          : 'Je ne trouve pas cette case dans ton emploi du temps.')
      if (rep.plusProche) {
        const { creneau, jour, jours } = rep.plusProche
        setProposee({ type: rep.type, creneau, jour })
        setProche({ jours: jour ? [jour] : jours, memeCase: rep.jourAbsent?.creneau === creneau })
      } else {
        setEchecs(n => n + 1)
      }
    } else {
      setEchecs(n => n + 1)
      setDernierIncompris(true)
    }
  }

  async function valider() {
    if (!proposee) return
    setErreur(null)
    setEnCours(true)
    const message = await onValidee(proposee)
    setEnCours(false)
    if (message) {
      setErreur(message)
      return
    }
    setNotee(true)
    setProposee(null)
    setProche(null)
    setIntrouvable(null)
    setPhrase('')
    setEchecs(0)
    setDernierIncompris(false)
  }

  function reexpliquer() {
    setProposee(null)
    setProche(null)
    setIntrouvable(null)
    setEchecs(n => n + 1)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-700">
        Dis-moi où tu la fais
        <textarea
          className="mt-1 block w-full rounded border p-2 text-sm"
          rows={2}
          maxLength={500}
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

      <div role="status" className="space-y-2">
        {introuvable && <p className="text-sm text-amber-700">{introuvable}</p>}
        {proposee && (
          <p className="rounded border border-violet-200 bg-violet-50 p-2 text-sm">
            {proche
              ? `Pour ${proposee.type}, ${proche.memeCase ? 'je te propose' : 'la case la plus proche :'} ${proposee.creneau}${proche.jours.length ? `, ${listeJours(proche.jours)}` : ''}. C’est ça ?`
              : `J’ai compris : ${phraseRegle(proposee)}.`}
          </p>
        )}
        {dernierIncompris && echecs === 1 && (
          <p className="text-sm text-amber-700">Je n’ai pas compris. Redis-le autrement, avec le nom de ta case.</p>
        )}
        {echecs >= 2 && !proposee && (
          <p className="text-sm text-amber-700">Je n’ai pas compris, tu peux la poser à la main dans le cahier journal.</p>
        )}
        {erreur && <p className="text-sm text-red-700">{erreur}</p>}
        {notee && <p className="text-sm text-green-700">C’est noté.</p>}
      </div>
      {proposee && (
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="rounded bg-violet-600 px-3 py-1 text-white" disabled={enCours} onClick={valider}>
            C’est ça
          </button>
          <button type="button" className="rounded border px-3 py-1" disabled={enCours} onClick={reexpliquer}>
            Je réexplique
          </button>
        </div>
      )}
    </div>
  )
}
