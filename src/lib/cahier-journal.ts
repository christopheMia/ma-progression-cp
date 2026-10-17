import {
  CreneauHoraire, JourJournal, SeanceJournal, ProgressionMatiere,
  SeanceProgression, SeancePlacer,
} from '@/types'
import { libelleMatiereCanonique, trouverProgressionMatiere } from '@/lib/matieres'
import { lirePrefixeJour, lireSeances } from '@/lib/progression-seances'
import { repartirSeances } from '@/lib/familles-seances'
import { placerNotionsDuJour, type NotionPlacee } from '@/lib/notions-creneaux'
import { sansAccents } from '@/data/trame-edt'

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
function porteDesSeancesDatees(seances: SeanceProgression[]): boolean {
  return seances.some(s => s.jour !== null)
}

/**
 * Un créneau GÉNÉRIQUE ne porte que le nom de la matière (« Français » pour la
 * progression de français, stockée « francais » en base). Lui seul accueille
 * les séances qu'aucun créneau nommé n'a prises. Comparaison stricte : un nom
 * qui dit autre chose (« Ateliers de français ») n'est pas générique.
 */
function estCreneauGenerique(nom: string, p: ProgressionMatiere): boolean {
  const n = sansAccents(nom)
  return n === sansAccents(p.matiere)
    || n === sansAccents(libelleMatiereCanonique(p.matiere))
}

/**
 * Vrai pour une ANCIENNE ligne de progression : des items datés « Jour N »
 * sans séances, enregistrés avant l'import par séances. Ce sont des séances
 * écrites à l'ancienne, pas des notions : elles gardent leur découpage par
 * jour (`itemsDuJour`) et ne passent pas par le placement des notions.
 */
function estAncienneLigneDatee(p: ProgressionMatiere): boolean {
  return p.items.some(item => numeroJourItem(item) !== null)
}

/**
 * Les pages et les mots d'une progression, à écrire après sa dernière notion.
 * Une seule fois par jour (voir `genererCahierJournal`), plus dans chaque
 * créneau de la matière.
 */
function pagesEtMots(p: ProgressionMatiere): string {
  const pages = p.pages ? ` — ${p.pages}` : ''
  const mots = p.mots_exemple && p.mots_exemple.length ? ` (mots : ${p.mots_exemple.join(', ')})` : ''
  return `${pages}${mots}`
}

/**
 * Ce qu'affiche un créneau alimenté par une ANCIENNE ligne datée
 * (`estAncienneLigneDatee`) : les items du jour, les pages, les mots. Même
 * contenu qu'avant le 17/10, mais une ligne par item au lieu de les coller par
 * des virgules (« il faut écrire des choses lisibles et structurer »).
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
function itemsAnciens(p: ProgressionMatiere, indexJour: number, nbJours: number): string {
  const retenus = itemsDuJour(p.items, indexJour, nbJours)
  if (retenus.length === 0) return ''
  return `${retenus.join('\n')}${pagesEtMots(p)}`
}

/**
 * Les NOTIONS de toute la semaine, placées par le sens (décision de Christophe
 * du 17/10/2026, voir `src/lib/notions-creneaux.ts`) : chaque notion dans les
 * créneaux qui portent son nom, le reste au créneau général de sa matière, les
 * rituels sous leur nom, une notion par ligne.
 *
 * Rend, pour chaque jour d'école, le texte des créneaux qui montrent des
 * notions (par rang de créneau), et les notions qu'AUCUN créneau de la semaine
 * n'a montrées, à placer une seule fois, le premier jour, avec l'origine
 * « semaine ». Une notion qui n'a pas de créneau le lundi mais en a un le
 * jeudi n'est donc pas « à placer » : elle est écrite le jeudi, et on ne
 * l'annonce pas chaque jour où elle manque.
 *
 * Les pages et les mots d'une progression s'écrivent une fois par jour, après
 * sa dernière notion dans son créneau général, sinon dans le premier de ses
 * créneaux qui en montre, sinon dans le premier créneau qui en montre. Une
 * progression dont aucune notion n'a trouvé de créneau de la semaine les
 * porte sur sa dernière notion à placer : rien n'est perdu.
 */
function notionsDeLaSemaine(
  jours: { creneaux: CreneauHoraire[]; progressionDe: (ProgressionMatiere | null)[] }[],
  progression: ProgressionMatiere[],
  horsNotions: (p: ProgressionMatiere) => boolean,
): { textes: Map<number, string>[]; sansCreneau: SeancePlacer[] } {
  const notions = progression.map(p => (horsNotions(p) ? [] : p.items.filter(n => typeof n === 'string' && n.trim() !== '')))
  const montrees = notions.map(liste => liste.map(() => false))
  const rangDe = (p: ProgressionMatiere | null) => (p ? progression.indexOf(p) : null)

  const placements = jours.map(({ creneaux, progressionDe }) => {
    const parCreneau = placerNotionsDuJour(creneaux.map((c, i) => {
      const p = progressionDe[i]
      return {
        nom: c.matiere,
        progression: rangDe(p),
        general: p ? estCreneauGenerique(c.matiere, p) : false,
        ouvert: c.type !== 'routine' && !(p && horsNotions(p)),
      }
    }), notions)
    for (const liste of parCreneau) for (const n of liste) montrees[n.progression][n.rang] = true
    return parCreneau
  })

  const textes = placements.map((parCreneau, d) => {
    const { creneaux, progressionDe } = jours[d]
    const lignes = parCreneau.map(liste => liste.map(n => notions[n.progression][n.rang]))
    notions.forEach((_, k) => {
      const suffixe = pagesEtMots(progression[k])
      const porteurs = parCreneau.flatMap((liste, i) => (liste.some(n => n.progression === k) ? [i] : []))
      if (!suffixe || porteurs.length === 0) return
      const siens = porteurs.filter(i => progressionDe[i] === progression[k])
      const ancre = siens.find(i => estCreneauGenerique(creneaux[i].matiere, progression[k]))
        ?? siens[0] ?? porteurs[0]
      const derniere = parCreneau[ancre].map((n: NotionPlacee) => n.progression).lastIndexOf(k)
      lignes[ancre][derniere] += suffixe
    })
    return new Map(lignes.flatMap((l, i): [number, string][] => (l.length ? [[i, l.join('\n')]] : [])))
  })

  const sansCreneau = notions.flatMap((liste, k): SeancePlacer[] => {
    const restantes = liste.filter((_, r) => !montrees[k][r])
    if (restantes.length === 0) return []
    if (!montrees[k].some(Boolean)) restantes[restantes.length - 1] += pagesEtMots(progression[k])
    return restantes.map(libelle => ({ libelle, origine: 'semaine' }))
  })

  return { textes, sansCreneau }
}

/**
 * Une séance par créneau (tâche 5, décisions de Cécile du 09/09/2026), placée
 * PAR LE SENS depuis la décision de Christophe du 17/10/2026.
 *
 * Pour une progression qui date ses séances, chaque jour reçoit les séances de
 * CE jour, et chacune va dans le créneau dont le NOM lui correspond sans
 * hésitation (`repartirSeances`, `src/lib/familles-seances.ts`, qui explique
 * pourquoi le remplissage dans l'ordre a été abandonné). Un créneau qui ne
 * porte que le nom de la matière (« Français ») prend ensuite le reste, dans
 * l'ordre. Plus de concaténation : « une puce, une séance, un créneau ».
 *
 * Les séances passent d'abord par `lireSeances`, la lecture commune à l'import :
 * une ligne jsonb mal formée ne fait ni planter le journal ni disparaître un
 * vrai texte. Un jour écrit « 1 » vaut le jour 1, un jour illisible rend la
 * séance non datée, un libellé vide n'est pas une séance. L'affichage en
 * hérite aussi : un domaine long s'écrit « LC », un domaine absent du libellé
 * est écrit devant.
 *
 * Ce qui ne trouve aucun créneau n'est ni empilé ni perdu, il part dans
 * `aPlacer` et l'enseignante le pose elle-même (pas de placement au jugé) :
 * - les séances du jour sans créneau sûr (aucun créneau à leur nom, plusieurs
 *   possibles, séance qui parle de deux choses, ou créneau déjà pris) ;
 * - un « Jour 5 » sur une semaine de quatre jours, au dernier jour, avec sa
 *   mention d'origine ;
 * - une séance sans jour dans un document qui date les autres, le premier jour
 *   seulement, jamais répétée sur chaque jour.
 *
 * Un créneau sans séance affiche le nom de la matière (jamais une case vide).
 * Le domaine reste écrit dans le libellé de chaque ligne. Les routines ne
 * changent pas.
 *
 * Les progressions de NOTIONS (maths, arts, EMC : aucune séance datée) se
 * placent elles aussi par le sens depuis le 17/10/2026 (`notionsDeLaSemaine`) :
 * une notion par ligne, dans le créneau qui porte son nom, et plus toute la
 * semaine collée par des virgules dans chaque créneau de la matière. Les
 * anciennes lignes datées « Jour N » sans séances (`estAncienneLigneDatee`)
 * gardent leur découpage par jour, une ligne par item.
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

  // Les séances de chaque progression, relues une fois par la lecture commune.
  const lues = new Map<ProgressionMatiere, SeanceProgression[]>(
    progression.map(p => [p, lireSeances(p.seances)]),
  )
  const datees = progression.filter(p => porteDesSeancesDatees(lues.get(p) ?? []))
  const anciennes = progression.filter(p => !datees.includes(p) && estAncienneLigneDatee(p))

  const jours = joursEcole.map(jour => {
    const creneaux = [...(parJour.get(jour) ?? [])].sort((a, b) => a.ordre - b.ordre)
    const progressionDe = creneaux.map(c =>
      c.type === 'routine' ? null : progressionPourCreneau(c, progression))
    return { creneaux, progressionDe }
  })
  const notions = notionsDeLaSemaine(
    jours, progression, p => datees.includes(p) || anciennes.includes(p),
  )

  return joursEcole.map((jour, indexJour): JourJournal => {
    const { creneaux, progressionDe } = jours[indexJour]
    const aPlacer: SeancePlacer[] = []

    // Par progression datée : chaque séance du jour va dans le créneau qui
    // porte son nom, ou nulle part. Ce qui reste part à placer.
    const placees = new Map<number, SeanceProgression>()
    for (const p of datees) {
      const indices = creneaux.flatMap((_, i) => (progressionDe[i] === p ? [i] : []))
      const duJour = (lues.get(p) ?? []).filter(s => s.jour === indexJour + 1)
      const { parCreneau, restantes } = repartirSeances(
        indices.map(i => creneaux[i].matiere), duJour, nom => estCreneauGenerique(nom, p),
      )
      indices.forEach((i, k) => {
        const s = parCreneau[k]
        if (s) placees.set(i, s)
      })
      for (const s of restantes) aPlacer.push({ libelle: s.libelle, origine: null })
    }

    const seances = creneaux.map((c, i): SeanceJournal => {
      const base = {
        matiere: c.matiere, heure_debut: c.heure_debut,
        heure_fin: c.heure_fin, type: c.type,
      }
      // Les routines (récréation, accueil, rituels) ne se remplissent pas.
      if (c.type === 'routine') return { ...base, deroulement: '' }

      const p = progressionDe[i]
      // Sans progression, il peut encore porter le nom d'une notion (17/10).
      if (!p) return { ...base, deroulement: notions.textes[indexJour].get(i) ?? c.matiere }
      if (anciennes.includes(p)) {
        return { ...base, deroulement: itemsAnciens(p, indexJour, joursEcole.length) || c.matiere }
      }
      if (!datees.includes(p)) {
        // Un créneau sans notion (un rituel) affiche son nom.
        return { ...base, deroulement: notions.textes[indexJour].get(i) ?? c.matiere }
      }
      // Un créneau sans séance affiche son nom, jamais une case vide (31/07).
      return { ...base, deroulement: placees.get(i)?.libelle ?? c.matiere }
    })

    // Les séances hors des jours d'école : rien n'est empilé, rien n'est perdu.
    for (const p of datees) {
      for (const s of lues.get(p) ?? []) {
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

    // Les notions qu'aucun créneau de la semaine n'a montrées : une fois, le
    // premier jour, comme une séance non datée.
    if (indexJour === 0) aPlacer.push(...notions.sansCreneau)

    return aPlacer.length ? { jour, seances, aPlacer } : { jour, seances }
  })
}
