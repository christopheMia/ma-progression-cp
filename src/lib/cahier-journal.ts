import {
  CreneauHoraire, JourJournal, SeanceJournal, ProgressionMatiere,
  SeanceProgression, SeancePlacer,
} from '@/types'
import { trouverProgressionMatiere } from '@/lib/matieres'
import { lirePrefixeJour } from '@/lib/progression-seances'

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const

/**
 * Trouve la ligne de progression qui alimente un créneau : d'abord par lien
 * explicite (methode_id), puis par repli sur le nom de la matière.
 */
function progressionPourCreneau(
  creneau: CreneauHoraire,
  progression: ProgressionMatiere[],
): ProgressionMatiere | null {
  if (creneau.methode_id) {
    return progression.find(x => x.methode_id === creneau.methode_id) ?? null
  }
  return trouverProgressionMatiere(progression, creneau.matiere) ?? null
}

/**
 * Numéro de jour porté par un item, ou `null` s'il vaut pour toute la semaine.
 *
 * DÉLÉGUÉ à `lirePrefixeJour` depuis le 21/08 (point 6 de la relecture). Ce
 * module appliquait `PREFIXE_JOUR` BRUTE, la seule regex que ce dépôt interdit
 * d'appliquer directement, parce qu'elle ne sait refuser ni un intervalle ni un
 * « Jour 0 ». Conséquence mesurée à l'écran :
 * `itemsDuJour(['Jours 3-4 : révisions', 'Jour 1 : Fluence'], 2, 4)` rendait
 * `['4 : révisions']`. La puce était datée d'un jour que l'enseignante n'avait
 * pas choisi ET amputée de son début. La passe précédente avait laissé le
 * fichier en comptant sur la tâche 5 du plan pour le réécrire ; le défaut se
 * voyait entre temps, sur toute ligne enregistrée avant la correction d'import.
 */
export function numeroJourItem(item: string): number | null {
  return lirePrefixeJour(item).jour
}

/**
 * Les items à afficher un jour donné, préfixe retiré.
 *
 * `indexJour` est le rang du jour dans la SEMAINE D'ÉCOLE, pas dans la semaine
 * civile : « Jour 3 » d'un document désigne le troisième jour de classe, qui
 * est le jeudi quand il n'y a pas école le mercredi.
 *
 * Trois règles, dans cet ordre :
 *
 * 1. Si AUCUN item n'est daté, tous valent pour la semaine entière et sont
 *    rendus tels quels. C'est le cas des progressions de maths, d'arts ou
 *    d'EMC, qui décrivent des notions et non des séances : on ne change rien
 *    pour elles.
 * 2. Sinon, un item daté ne paraît que son jour, et un item non daté paraît
 *    tous les jours (une consigne qui vaut pour la semaine reste visible).
 * 3. Un item daté au-delà du nombre de jours d'école (« Jour 5 » sur une
 *    semaine de quatre jours) atterrit sur le dernier jour EN GARDANT son
 *    préfixe. Le perdre en silence serait pire : l'enseignante doit voir
 *    qu'une ligne de son document ne tombe nulle part.
 *
 * Une puce qui parle de plusieurs jours (« Jours 3-4 : révisions ») n'est datée
 * d'aucun : elle relève de la règle 2, donc reste visible tous les jours, texte
 * ENTIER. C'est « signaler, jamais deviner » : l'application ne choisit pas
 * entre le jeudi et le vendredi à la place de l'enseignante.
 *
 * Le texte affiché vient de `lirePrefixeJour`, qui ne retire le préfixe que
 * lorsqu'il a retenu son numéro. Le domaine écrit devant la puce
 * (« Jour 2 : PDE : Voyelles, de Rimbaud »), lui, reste : c'est ce qui distingue
 * deux séances portant le même texte.
 */
export function itemsDuJour(items: string[], indexJour: number, nbJours: number): string[] {
  const lus = items.map(item => lirePrefixeJour(item))
  if (!lus.some(lu => lu.jour !== null)) return items

  const dernierJour = indexJour === nbJours - 1
  return items.flatMap((item, i) => {
    const { jour, libelle } = lus[i]
    if (jour === null) return [item]
    if (jour === indexJour + 1) return [libelle]
    if (jour > nbJours && dernierJour) return [item]
    return []
  })
}

/**
 * Vrai quand le document décrit des séances datées (une puce, un « Jour N »),
 * et non des notions de semaine comme les maths, les arts ou l'EMC.
 */
function porteDesSeancesDatees(p: ProgressionMatiere | null): boolean {
  return !!p?.seances?.some(s => s.jour !== null)
}

/**
 * Ce qu'affiche un créneau alimenté par une progression de NOTIONS (aucune
 * séance datée) : les items de la semaine, les pages, les mots. Comportement
 * inchangé depuis avant la tâche 5, y compris pour des items datés qui n'ont
 * pas de séances (lignes enregistrées avant l'import par séances).
 *
 * Quand il n'y a rien à montrer, l'appelant retombe sur le nom de la matière.
 * Décision de Christophe le 31/07. Une case vide ne dit pas si l'application
 * n'a rien trouvé ou si la séance n'a rien de prévu, et elle n'invite à rien.
 * Le libellé de la matière répond aux deux : l'enseignante voit ce qu'il y a à
 * remplir, et elle écrit par-dessus.
 *
 * Ce n'est pas une invention de contenu : on ne fait que recopier ce qu'elle a
 * elle-même écrit dans son emploi du temps. C'est la différence avec l'ancien
 * bouton « Générer la journée », qui rédigeait des séances plausibles que
 * personne n'avait prévues.
 */
function notions(p: ProgressionMatiere, indexJour: number, nbJours: number): string {
  const retenus = itemsDuJour(p.items, indexJour, nbJours)
  if (retenus.length === 0) return ''

  const items = retenus.join(', ')
  const pages = p.pages ? ` — ${p.pages}` : ''
  const mots = p.mots_exemple && p.mots_exemple.length ? ` (mots : ${p.mots_exemple.join(', ')})` : ''
  return `${items}${pages}${mots}`
}

/**
 * Une séance par créneau (tâche 5, décisions de Cécile du 09/09/2026).
 *
 * Pour une progression qui date ses séances, chaque jour reçoit la file des
 * séances de CE jour, et chaque créneau de cours de la matière en retire UNE,
 * dans l'ordre. Plus de concaténation : « une puce, une séance, un créneau ».
 *
 * Ce qui ne trouve aucun créneau n'est ni empilé ni perdu, il part dans
 * `aPlacer` et l'enseignante le pose elle-même (pas de placement au jugé) :
 * - les séances du jour en surplus (plus de séances que de créneaux) ;
 * - un « Jour 5 » sur une semaine de quatre jours, au dernier jour, avec sa
 *   mention d'origine ;
 * - une séance sans jour dans un document qui date les autres, le premier jour
 *   seulement, jamais répétée sur chaque jour.
 *
 * Un créneau sans séance affiche le nom de la matière (jamais une case vide).
 * Le domaine reste écrit dans le libellé de chaque ligne. Les routines et les
 * progressions de notions sont inchangées.
 */
export function genererCahierJournal(
  emploiDuTemps: CreneauHoraire[],
  progression: ProgressionMatiere[],
): JourJournal[] {
  const parJour = new Map<string, CreneauHoraire[]>()
  for (const c of emploiDuTemps) {
    if (c.visible_journal === false) continue
    const list = parJour.get(c.jour) ?? []
    list.push(c)
    parJour.set(c.jour, list)
  }

  // Les jours d'ECOLE, dans l'ordre : c'est le referentiel des « Jour N » des
  // documents importes. Sans mercredi, « Jour 3 » vaut donc pour le jeudi.
  const joursEcole = JOURS_ORDRE.filter(jour => parJour.has(jour))

  return joursEcole.map((jour, indexJour): JourJournal => {
    const creneaux = [...(parJour.get(jour) ?? [])].sort((a, b) => a.ordre - b.ordre)
    const aPlacer: SeancePlacer[] = []

    // Une file de séances par progression datée : chaque créneau de cours en
    // retire UNE, dans l'ordre du document.
    const files = new Map<ProgressionMatiere, SeanceProgression[]>()
    for (const p of progression) {
      if (!porteDesSeancesDatees(p)) continue
      files.set(p, (p.seances ?? []).filter(s => s.jour === indexJour + 1))
    }

    const seances = creneaux.map((c): SeanceJournal => {
      const base = {
        matiere: c.matiere, heure_debut: c.heure_debut,
        heure_fin: c.heure_fin, type: c.type,
      }
      // Les routines (récréation, accueil, rituels) ne se remplissent pas.
      if (c.type === 'routine') return { ...base, deroulement: '' }

      const p = progressionPourCreneau(c, progression)
      if (!p) return { ...base, deroulement: c.matiere }
      if (!porteDesSeancesDatees(p)) {
        return { ...base, deroulement: notions(p, indexJour, joursEcole.length) || c.matiere }
      }
      const suivante = files.get(p)?.shift()
      return { ...base, deroulement: suivante ? suivante.libelle : c.matiere }
    })

    // Ce qui n'a trouvé aucun créneau : rien n'est empilé, rien n'est perdu.
    for (const restantes of files.values()) {
      for (const s of restantes) aPlacer.push({ libelle: s.libelle, origine: null })
    }
    for (const p of progression) {
      if (!porteDesSeancesDatees(p)) continue
      for (const s of p.seances ?? []) {
        // Un « Jour 5 » sur une semaine de quatre jours ne tombe nulle part :
        // il atterrit au dernier jour en gardant sa mention d'origine.
        if (s.jour !== null && s.jour > joursEcole.length && indexJour === joursEcole.length - 1) {
          aPlacer.push({ libelle: s.libelle, origine: `Jour ${s.jour}` })
        }
        // Une séance sans jour dans un document qui date les autres paraît une
        // seule fois, le premier jour, et surtout pas répétée sur chaque jour.
        if (s.jour === null && indexJour === 0) {
          aPlacer.push({ libelle: s.libelle, origine: 'semaine' })
        }
      }
    }

    return aPlacer.length ? { jour, seances, aPlacer } : { jour, seances }
  })
}
