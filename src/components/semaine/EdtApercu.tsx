import Link from 'next/link'
import EdtGrilleLecture from '@/components/EdtGrilleLecture'

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

/**
 * Apercu LECTURE SEULE de l'emploi du temps, affiche depuis la page semaine
 * (retour du 20/07 : pouvoir verifier son EDT avant de generer le cahier
 * journal, sans quitter la page). La mise en forme (couleurs, gras) est
 * respectee pour que l'enseignante retrouve sa grille telle qu'elle l'a reglee.
 *
 * La grille elle-meme est partagee avec l'apercu d'import (`EdtGrilleLecture`) :
 * les deux affichaient auparavant une ligne par couple (debut, fin) distinct,
 * ce qui fabriquait de fausses cases vides des qu'un jour decoupait une plage
 * plus finement qu'un autre.
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

  return (
    <div className="space-y-2">
      <EdtGrilleLecture creneaux={creneaux} />
      <Link href="/parametres#edt" className="inline-block text-sm text-violet-600 hover:underline">
        Modifier mon emploi du temps →
      </Link>
    </div>
  )
}
