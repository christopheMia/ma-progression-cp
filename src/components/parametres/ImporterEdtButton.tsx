'use client'
import { useState, useTransition } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { updateEmploiDuTemps } from '@/lib/actions/parametres'
import type { CreneauImporte } from '@/lib/ia/schema-edt'
import EdtGrilleLecture from '@/components/EdtGrilleLecture'
import Bouton from '@/components/ui/Bouton'

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
      <label className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold border border-violet-300 text-violet-700 bg-white rounded-xl px-3 py-1.5 hover:bg-violet-50 hover:border-violet-400 transition-colors cursor-pointer focus-within:outline-none focus-within:ring-4 focus-within:ring-violet-300/60">
        {chargement
          ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Lecture du PDF…</>
          : <><FileUp size={16} aria-hidden="true" /> Importer depuis un PDF</>}
        <input type="file" accept=".pdf" multiple onChange={analyser} disabled={chargement} className="sr-only" />
      </label>

      {erreur && <p className="text-xs text-red-600">{erreur}</p>}

      {creneaux && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 space-y-2 text-xs">
          <p className="text-slate-700">
            <strong>{creneaux.length} créneaux</strong> lus sur {jours.length} jour{jours.length > 1 ? 's' : ''} ({jours.join(', ')}).
            Vérifie avant de remplacer ta grille actuelle.
          </p>
          {/* La grille, pas une liste : sur l'EDT de Cécile la liste faisait
              90 lignes à faire défiler pour vérifier une seule lecture. */}
          <div className="rounded-lg bg-white border border-slate-200 p-1">
            <EdtGrilleLecture creneaux={creneaux} />
          </div>
          <div className="flex items-center gap-2">
            <Bouton type="button" variant="secondaire" size="sm" onClick={valider} loading={isPending}>
              {isPending ? 'Enregistrement…' : 'Remplacer mon emploi du temps'}
            </Bouton>
            <Bouton type="button" variant="fantome" size="sm" onClick={() => setCreneaux(null)} disabled={isPending}>
              Annuler
            </Bouton>
          </div>
        </div>
      )}
    </div>
  )
}
