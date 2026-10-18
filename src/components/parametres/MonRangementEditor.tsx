'use client'
import { useState } from 'react'
import AvecMesMots from '@/components/rangement/AvecMesMots'
import { enregistrerRegle, supprimerRegle } from '@/lib/actions/regles-rangement'
import {
  JOURS_SEMAINE, etatCaseRegle, regrouperRegles, type CaseDisponible, type GroupeRegles,
} from '@/lib/regles-rangement'
import type { JourSemaine, RegleRangement } from '@/types'

/**
 * Paramètres, « Mon rangement » (maquette validée le 18/10/2026) : ce que je
 * range, va dans la case, jour. Les types d'une même case sont sur une ligne.
 * Une règle dont la case n'existe plus (ou plus ce jour-là) est signalée en
 * orange.
 */
export default function MonRangementEditor({ initial, cases, indisponible = false, illisible = false }: {
  initial: RegleRangement[]
  cases: CaseDisponible[]
  /** La table n'existe pas encore (migration pas passée). */
  indisponible?: boolean
  /** La lecture des règles a échoué pour une autre raison. */
  illisible?: boolean
}) {
  const [regles, setRegles] = useState(initial)
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [ajout, setAjout] = useState(false)

  if (indisponible) {
    return <p className="text-sm text-gray-500">Le carnet de rangement n’est pas encore activé.</p>
  }
  if (illisible) {
    return <p className="text-sm text-red-700">Ton rangement n’a pas pu être lu. Réessaie dans un moment.</p>
  }

  const remplacer = (r: RegleRangement) =>
    setRegles(liste => [...liste.filter(x => x.id !== r.id && x.type_cle !== r.type_cle), r])
  const retirer = (id: string) => setRegles(liste => liste.filter(x => x.id !== id))
  const groupes = regrouperRegles(regles)
  const cleGroupe = (g: GroupeRegles) => g.regles.map(r => r.id).join('|')

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Ce qui n’est pas ici est rangé automatiquement.</p>
      {groupes.length === 0 && (
        <p className="text-sm text-gray-500">Ton carnet est vide : tout est rangé automatiquement.</p>
      )}
      <ul className="space-y-2">
        {groupes.map(g => {
          const etat = etatCaseRegle(g, cases)
          const sansCase = etat !== 'ok'
          const cle = cleGroupe(g)
          const noms = g.regles.map(r => r.type).join(', ')
          const action = sansCase ? 'Corriger' : 'Modifier'
          return (
            <li key={cle} className={`rounded border p-2 text-sm ${sansCase ? 'border-orange-300 bg-orange-50' : ''}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{noms}</span>
                <span className="text-gray-500">va dans</span>
                <span>{g.creneau}</span>
                <span className="text-gray-500">{g.jour ? `le ${g.jour}` : 'pas de jour préféré'}</span>
                <button type="button" className="ml-auto text-violet-700 hover:underline"
                  aria-label={`${action} ${noms}`}
                  onClick={() => setOuvert(ouvert === cle ? null : cle)}>
                  {action}
                </button>
              </div>
              {etat === 'absente' && <p className="mt-1 text-orange-700">Cette case n’existe plus dans ton emploi du temps.</p>}
              {etat === 'autre-jour' && (
                <p className="mt-1 text-orange-700">Cette case n’existe pas le {g.jour} dans ton emploi du temps.</p>
              )}
              {ouvert === cle && g.regles.map(r => (
                <EditeurRegle key={r.id} regle={r} cases={cases}
                  onEnregistree={nouvelle => { remplacer(nouvelle); setOuvert(null) }}
                  onSupprimee={() => { retirer(r.id); setOuvert(null) }} />
              ))}
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-gray-500">
        Tes cahiers journaux déjà ouverts ne changent pas tout seuls : dans la semaine voulue, clique sur
        « Régénérer » (tes retouches de cette semaine seront remplacées).
      </p>
      {ajout ? (
        <div className="space-y-2">
          <AvecMesMots onValidee={async r => {
            const res = await enregistrerRegle({ type: r.type, creneau: r.creneau, jour: r.jour, origine: 'ia' })
            if (!res.ok) return res.message
            remplacer(res.valeur)
            return null
          }} />
          <button type="button" className="text-sm text-gray-600 hover:underline" onClick={() => setAjout(false)}>
            Plus tard
          </button>
        </div>
      ) : (
        <button type="button" className="rounded border border-violet-300 px-3 py-1 text-sm text-violet-700"
          onClick={() => setAjout(true)}>
          Ajouter une règle avec mes mots
        </button>
      )}
    </div>
  )
}

function EditeurRegle({ regle, cases, onEnregistree, onSupprimee }: {
  regle: RegleRangement
  cases: CaseDisponible[]
  onEnregistree: (r: RegleRangement) => void
  onSupprimee: () => void
}) {
  const [type, setType] = useState(regle.type)
  const [creneau, setCreneau] = useState(regle.creneau)
  const [jour, setJour] = useState<JourSemaine | null>(regle.jour)
  const [confirmer, setConfirmer] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const pre = `regle-${regle.id}`
  const joursDeLaCase = cases.find(k => k.nom === creneau)?.jours ?? JOURS_SEMAINE

  async function enregistrer() {
    setEnCours(true)
    const res = await enregistrerRegle({ id: regle.id, type, creneau, jour })
    setEnCours(false)
    if (!res.ok) setErreur(res.message)
    else onEnregistree(res.valeur)
  }

  async function supprimer() {
    setEnCours(true)
    const res = await supprimerRegle(regle.id)
    setEnCours(false)
    if (!res.ok) setErreur(res.message)
    else onSupprimee()
  }

  // Le nom accessible COMMENCE par le texte visible (WCAG 2.5.3) et ajoute,
  // en texte invisible, de quelle règle il s'agit.
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2">
      <label className="text-xs text-gray-600">
        <span id={`${pre}-t`}>Ce que je range</span>
        <span id={`${pre}-tn`} className="sr-only"> pour {regle.type}</span>
        <input aria-labelledby={`${pre}-t ${pre}-tn`} maxLength={80} className="mt-1 block rounded border p-1 text-sm"
          value={type} onChange={e => setType(e.target.value)} />
      </label>
      <label className="text-xs text-gray-600">
        <span id={`${pre}-c`}>Va dans la case</span>
        <span id={`${pre}-cn`} className="sr-only"> pour {regle.type}</span>
        <select aria-labelledby={`${pre}-c ${pre}-cn`} className="mt-1 block rounded border p-1 text-sm"
          value={creneau} onChange={e => { setCreneau(e.target.value); setJour(null) }}>
          {!cases.some(k => k.nom === creneau) && <option value={creneau}>{creneau} (introuvable)</option>}
          {cases.map(k => <option key={k.nom} value={k.nom}>{k.nom}</option>)}
        </select>
      </label>
      <label className="text-xs text-gray-600">
        <span id={`${pre}-j`}>Jour</span>
        <span id={`${pre}-jn`} className="sr-only"> pour {regle.type}</span>
        <select aria-labelledby={`${pre}-j ${pre}-jn`} className="mt-1 block rounded border p-1 text-sm"
          value={jour ?? ''} onChange={e => setJour((e.target.value || null) as JourSemaine | null)}>
          <option value="">Pas de jour préféré</option>
          {joursDeLaCase.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </label>
      <button type="button" className="rounded bg-violet-600 px-3 py-1 text-sm text-white" disabled={enCours} onClick={enregistrer}>
        Enregistrer
      </button>
      {confirmer ? (
        <>
          <button type="button" className="rounded bg-red-600 px-3 py-1 text-sm text-white" disabled={enCours} onClick={supprimer}>
            Oui, supprimer
          </button>
          <button type="button" className="rounded border px-3 py-1 text-sm" disabled={enCours} onClick={() => setConfirmer(false)}>
            Annuler
          </button>
        </>
      ) : (
        <button type="button" className="rounded border border-red-300 px-3 py-1 text-sm text-red-700" onClick={() => setConfirmer(true)}>
          Supprimer
        </button>
      )}
      {erreur && <p className="w-full text-sm text-red-700">{erreur}</p>}
    </div>
  )
}
