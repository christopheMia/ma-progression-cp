'use client'
import { useState, useTransition } from 'react'
import { updateEmploiDuTemps } from '@/lib/actions/parametres'
import type { CreneauImporte } from '@/lib/ia/schema-edt'

/**
 * "Importer mon emploi du temps depuis un PDF".
 *
 * Le generateur construit une grille depuis les volumes officiels, mais chaque
 * enseignante a deja SON organisation (rituels de 5 min, intitules personnels,
 * journee qui commence a 8h20...). L'exemple `partage/edt.pdf` le montre bien :
 * aucun generateur ne devinerait cette grille. On propose donc de l'importer
 * telle quelle.
 *
 * L'import REMPLACE la grille : on affiche donc un apercu du resultat AVANT de
 * valider, jamais d'ecrasement direct.
 */
export default function ImporterEdtButton() {
  const [creneaux, setCreneaux] = useState<CreneauImporte[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function analyser(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setErreur(null); setChargement(true); setCreneaux(null)
    try {
      const form = new FormData()
      for (const f of Array.from(files)) form.append('pdf', f)
      const res = await fetch('/api/ia-edt', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) setErreur(data.error ?? `Erreur ${res.status}`)
      else setCreneaux(data.creneaux as CreneauImporte[])
    } catch (err) {
      setErreur(`Erreur réseau : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setChargement(false)
      e.target.value = '' // permet de redeposer le meme fichier apres une erreur
    }
  }

  function valider() {
    if (!creneaux) return
    startTransition(async () => {
      await updateEmploiDuTemps(creneaux.map(c => ({
        jour: c.jour,
        heure_debut: c.heure_debut,
        heure_fin: c.heure_fin,
        matiere: c.matiere,
        type: c.type,
        couleur: null,
        couleur_texte: null,
        texte_gras: false,
        texte_italique: false,
        texte_souligne: false,
        visible_journal: c.type !== 'routine',
      })))
      window.location.reload()
    })
  }

  const jours = creneaux ? [...new Set(creneaux.map(c => c.jour))] : []

  return (
    <div className="space-y-2">
      <label className="shrink-0 inline-flex items-center gap-1 text-xs border border-violet-300 text-violet-700 rounded-lg px-2.5 py-1 hover:bg-violet-50 cursor-pointer">
        {chargement ? '⏳ Lecture du PDF…' : '📄 Importer depuis un PDF'}
        <input type="file" accept=".pdf" multiple onChange={analyser} disabled={chargement} className="sr-only" />
      </label>

      {erreur && <p className="text-xs text-red-600">{erreur}</p>}

      {creneaux && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 space-y-2 text-xs">
          <p className="text-slate-700">
            <strong>{creneaux.length} créneaux</strong> lus sur {jours.length} jour{jours.length > 1 ? 's' : ''} ({jours.join(', ')}).
            Vérifie avant de remplacer ta grille actuelle.
          </p>
          <div className="max-h-48 overflow-y-auto rounded-lg bg-white border border-slate-200">
            <table className="w-full">
              <tbody>
                {creneaux.slice(0, 40).map((c, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-1 text-slate-500 whitespace-nowrap">{c.jour}</td>
                    <td className="px-2 py-1 text-slate-500 whitespace-nowrap">{c.heure_debut}-{c.heure_fin}</td>
                    <td className="px-2 py-1 text-slate-900">{c.matiere}</td>
                    <td className="px-2 py-1 text-slate-400">{c.type === 'routine' ? 'routine' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {creneaux.length > 40 && <p className="text-slate-500">…et {creneaux.length - 40} autres.</p>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={valider} disabled={isPending}
              className="bg-violet-600 text-white rounded-lg px-2.5 py-1 disabled:opacity-50">
              {isPending ? 'Enregistrement…' : 'Remplacer mon emploi du temps'}
            </button>
            <button type="button" onClick={() => setCreneaux(null)} disabled={isPending}
              className="border border-gray-300 text-gray-600 rounded-lg px-2.5 py-1 hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
