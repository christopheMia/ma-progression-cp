'use client'
import { useState, useTransition } from 'react'
import { ArrowDownAZ, Save, UserPlus } from 'lucide-react'
import { updateEleves } from '@/lib/actions/parametres'
import { decouperPrenoms, trierPrenoms } from '@/lib/prenoms'
import type { EleveSaisi } from '@/lib/eleves-mise-a-jour'
import Bouton from '@/components/ui/Bouton'

/**
 * La liste des élèves de la classe.
 *
 * DEUX CHOSES SE JOUENT ICI, et elles viennent toutes deux de Cécile, le
 * 9 septembre 2026.
 *
 * 1. Classer de A à Z. Ses 24 élèves suivaient l'ordre d'import, et elle
 *    cherchait un enfant dans une liste désordonnée plusieurs fois par jour.
 * 2. Corriger un prénom. Les prénoms n'étaient pas modifiables du tout : pour
 *    réparer une faute de frappe il fallait supprimer l'élève et le retaper, ce
 *    qui effaçait tout son suivi. Un clic sur le prénom l'ouvre maintenant à la
 *    correction, et l'enfant garde son identifiant, donc ses observations.
 */
export default function ElevesEditor({ initial }: { initial: EleveSaisi[] }) {
  const [eleves, setEleves] = useState<EleveSaisi[]>(initial)
  const [input, setInput] = useState('')
  const [enEdition, setEnEdition] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  // Ajoute un ou PLUSIEURS prénoms : on peut coller toute la liste d'un coup
  // (un par ligne ou séparés par des virgules). Doublons ignorés (casse
  // insensible), ordre conservé.
  function ajouter(texte: string) {
    const nouveaux = decouperPrenoms(texte)
    if (!nouveaux.length) return
    setSaved(false)
    setEleves(prev => {
      const vus = new Set(prev.map(e => e.prenom.toLowerCase()))
      const aAjouter: EleveSaisi[] = []
      for (const p of nouveaux) {
        if (!vus.has(p.toLowerCase())) { vus.add(p.toLowerCase()); aAjouter.push({ prenom: p }) }
      }
      return [...prev, ...aAjouter]
    })
    setInput('')
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const texte = e.clipboardData.getData('text')
    if (/[\n,;\t]/.test(texte)) {
      e.preventDefault()
      ajouter(texte)
    }
  }

  // Le tri n'agit que sur l'affichage : elle voit d'abord, elle enregistre
  // ensuite. Chaque élève emporte son identifiant, donc son suivi.
  function classer() {
    setSaved(false)
    setEnEdition(null)
    setEleves(prev => {
      const ordre = trierPrenoms(prev.map(e => e.prenom))
      const restants = [...prev]
      return ordre.map(prenom => {
        const i = restants.findIndex(e => e.prenom === prenom)
        return restants.splice(i, 1)[0]
      })
    })
  }

  /** Corrige un prénom SANS toucher à l'identifiant : le suivi reste attaché. */
  function renommer(index: number, prenom: string) {
    setSaved(false)
    setEleves(prev => prev.map((e, i) => (i === index ? { ...e, prenom } : e)))
  }

  function retirer(index: number, prenom: string) {
    if (!confirm(`Retirer ${prenom} de la classe ? Tout son suivi sera effacé.`)) return
    setSaved(false)
    setEnEdition(null)
    setEleves(prev => prev.filter((_, j) => j !== index))
  }

  function enregistrer() {
    setSaved(false)
    setEnEdition(null)
    startTransition(async () => {
      await updateEleves(eleves.filter(e => e.prenom.trim()))
      setSaved(true)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), ajouter(input))}
          onPaste={onPaste}
          placeholder="Un prénom, ou toute la liste collée"
          className="flex-1 border-2 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none text-gray-900 bg-white" />
        <Bouton type="button" size="lg" icon={UserPlus} onClick={() => ajouter(input)}>
          Ajouter
        </Bouton>
      </div>
      <p className="text-xs text-gray-400">
        Astuce : colle toute ta liste d’un coup, un prénom par ligne. Clique sur un prénom pour le corriger.
      </p>
      <div className="flex flex-wrap gap-2">
        {eleves.map((e, i) => (
          <span key={e.id ?? `nouveau-${i}`}
            className="bg-violet-100 text-violet-800 px-3 py-1 rounded-full flex items-center gap-2">
            {enEdition === i ? (
              <input autoFocus value={e.prenom}
                aria-label={`Corriger le prénom ${e.prenom}`}
                onChange={ev => renommer(i, ev.target.value)}
                onBlur={() => setEnEdition(null)}
                onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === 'Escape') setEnEdition(null) }}
                className="bg-white rounded px-2 py-0.5 w-28 outline-none ring-2 ring-violet-400 text-violet-900" />
            ) : (
              <button type="button" onClick={() => setEnEdition(i)}
                title="Corriger ce prénom"
                className="hover:underline">
                {e.prenom}
              </button>
            )}
            <button onClick={() => retirer(i, e.prenom)}
              aria-label={`Retirer ${e.prenom}`}
              className="text-violet-400 hover:text-red-500">×</button>
          </span>
        ))}
        {eleves.length === 0 && <span className="text-sm text-gray-400">Aucun élève.</span>}
      </div>
      <div className="flex items-center gap-3">
        <Bouton type="button" variant="principal" icon={Save} loading={isPending}
          onClick={enregistrer}>
          Enregistrer les élèves
        </Bouton>
        <Bouton type="button" icon={ArrowDownAZ} onClick={classer}
          disabled={eleves.length < 2}>
          Classer de A à Z
        </Bouton>
        {saved && !isPending && <span className="text-sm text-green-600">✓ Enregistré</span>}
      </div>
      <p className="text-xs text-gray-400">
        Corriger un prénom ou classer la liste ne touche pas au suivi des élèves. Retirer un élève efface le sien.
      </p>
    </div>
  )
}
