// src/components/EdtGrilleLecture.tsx
//
// Grille d'emploi du temps en LECTURE SEULE, partagee par l'apercu de la page
// semaine et par l'apercu d'import de PDF.
//
// Elle applique les memes regles que la grille editable :
//  - les lignes suivent les frontieres horaires, et chaque seance est rendue
//    une seule fois avec son `rowSpan` (plus de fausses cases vides) ;
//  - la couleur vient de la famille de matiere, sauf si l'enseignante en a
//    enregistre une ;
//  - la table tient dans la largeur de l'ecran, sans defilement horizontal :
//    l'enseignante consulte d'abord sur telephone.

import { couleurAffichee } from '@/data/trame-edt'
import { construireGrille } from '@/lib/edt-grille'

export type CreneauLecture = {
  jour: string
  heure_debut: string
  heure_fin: string
  matiere: string
  /** Absente à l'import d'un PDF : la palette prend alors le relais. */
  couleur?: string | null
  couleur_texte?: string | null
  texte_gras?: boolean
  texte_italique?: boolean
  texte_souligne?: boolean
  type?: 'cours' | 'routine'
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const
const LABELS: Record<string, string> = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi',
}
const COURTS: Record<string, string> = {
  lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven',
}

export default function EdtGrilleLecture({ creneaux }: { creneaux: CreneauLecture[] }) {
  const cols = JOURS.filter(j => creneaux.some(c => c.jour === j))
  const { lignes, cases } = construireGrille(creneaux, cols)

  if (!lignes.length) return null

  return (
    // `table-fixed` + colonne horaires etroite : les 4 jours se partagent le
    // reste a parts egales et les libelles reviennent a la ligne, plutot que
    // de pousser la largeur et de forcer une barre de defilement.
    <table className="w-full table-fixed border-collapse text-[0.62rem] sm:text-xs">
      <colgroup>
        <col className="w-[3.1rem] sm:w-[4.6rem]" />
        {cols.map(j => <col key={j} />)}
      </colgroup>
      <thead>
        <tr>
          <th className="border border-violet-100 bg-violet-100 p-1 text-violet-900">h</th>
          {cols.map(j => (
            <th key={j} className="border border-violet-100 bg-violet-100 p-1 text-violet-900">
              <span className="hidden sm:inline">{LABELS[j]}</span>
              <span className="sm:hidden">{COURTS[j]}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((ligne, iLigne) => (
          <tr key={`${ligne.debut}-${ligne.fin}`}>
            <td className="border border-violet-100 bg-violet-50 p-1 text-center tabular-nums text-slate-700">
              <span className="block font-medium">{ligne.debut}</span>
              <span className="block text-slate-500">{ligne.fin}</span>
            </td>
            {cols.map((jour, iJour) => {
              const etat = cases[iLigne][iJour]
              // Case remplie par le rowSpan d'une seance commencee plus haut :
              // il ne faut emettre aucun <td>, sinon la ligne se decale.
              if (etat.etat === 'couverte') return null
              const c = etat.etat === 'seance' ? etat.creneau : undefined
              return (
                <td key={jour}
                  rowSpan={etat.etat === 'seance' && etat.span > 1 ? etat.span : undefined}
                  className="border border-violet-100 p-1 align-top break-words hyphens-auto"
                  style={{ backgroundColor: (c ? couleurAffichee(c) : null) ?? undefined }}>
                  <span style={{
                    color: c?.couleur_texte ?? undefined,
                    fontWeight: c?.texte_gras ? 700 : undefined,
                    fontStyle: c?.texte_italique ? 'italic' : undefined,
                    textDecoration: c?.texte_souligne ? 'underline' : undefined,
                  }}>
                    {c?.matiere ?? ''}
                  </span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
