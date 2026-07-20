import Link from 'next/link'

export type CreneauApercu = {
  jour: string
  heure_debut: string
  heure_fin: string
  matiere: string
  couleur: string | null
  couleur_texte: string | null
  texte_gras: boolean
  texte_italique: boolean
  texte_souligne: boolean
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const
const LABELS: Record<string, string> = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi',
}

/**
 * Apercu LECTURE SEULE de l'emploi du temps, affiche depuis la page semaine
 * (retour du 20/07 : pouvoir verifier son EDT avant de generer le cahier
 * journal, sans quitter la page). La mise en forme (couleurs, gras) est
 * respectee pour que l'enseignante retrouve sa grille telle qu'elle l'a reglee.
 */
export default function EdtApercu({ creneaux }: { creneaux: CreneauApercu[] }) {
  if (!creneaux.length) {
    return (
      <p className="text-sm text-slate-500">
        Aucun emploi du temps enregistré.{' '}
        <Link href="/parametres#edt" className="text-violet-600 hover:underline">Le remplir maintenant</Link>
      </p>
    )
  }

  const cols = JOURS.filter(j => creneaux.some(c => c.jour === j))
  const lignes = [...new Map(
    creneaux.map(c => [`${c.heure_debut}-${c.heure_fin}`, { debut: c.heure_debut, fin: c.heure_fin }]),
  ).values()].sort((a, b) => a.debut.localeCompare(b.debut))

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs w-full">
          <thead>
            <tr>
              <th className="border border-violet-100 bg-violet-100 p-2 text-gray-700">Horaires</th>
              {cols.map(j => (
                <th key={j} className="border border-violet-100 bg-violet-100 p-2 text-gray-700">{LABELS[j]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ debut, fin }) => (
              <tr key={`${debut}-${fin}`}>
                <td className="border border-violet-100 bg-violet-50 p-2 whitespace-nowrap text-gray-500">
                  {debut} - {fin}
                </td>
                {cols.map(jour => {
                  const c = creneaux.find(x => x.jour === jour && x.heure_debut === debut && x.heure_fin === fin)
                  return (
                    <td key={jour} className="border border-violet-100 p-2 align-top"
                      style={{ backgroundColor: c?.couleur ?? undefined }}>
                      <span style={{
                        color: c?.couleur_texte ?? undefined,
                        fontWeight: c?.texte_gras ? 700 : undefined,
                        fontStyle: c?.texte_italique ? 'italic' : undefined,
                        textDecoration: c?.texte_souligne ? 'underline' : undefined,
                      }}>
                        {c?.matiere || '—'}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/parametres#edt" className="inline-block text-sm text-violet-600 hover:underline">
        Modifier mon emploi du temps →
      </Link>
    </div>
  )
}
