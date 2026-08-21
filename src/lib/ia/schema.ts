import type { ProgressionSemaine } from '@/data/manuels'
import type { SeanceProgression } from '@/types'
import { completerSeances, itemsDepuisSeances, seanceDepuisTexte } from '@/lib/progression-seances'

// Anthropic exige un OBJET racine pour les sorties structurées (un array nu est
// refusé) : on enveloppe la liste des semaines dans { semaines: [...] }.
export const PROGRESSION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    semaines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          numero: { type: 'integer' },
          items: { type: 'array', items: { type: 'string' } },
          // La grille jours x puces du document, telle qu'elle est écrite : une
          // puce = une séance. `items` en est l'aplatissement texte, et reste le
          // champ que l'application lit pour afficher (le cahier journal ne lit
          // que lui) : les deux sont demandés, aucun n'est facultatif.
          seances: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                // `anyOf` et non `type: ['integer', 'null']` : c'est la forme
                // déjà utilisée pour les champs nullables des autres schémas du
                // dépôt (voir `periode_numero` dans schema-import-auto.ts), et
                // la seule dont on sait qu'elle passe la validation stricte des
                // sorties structurées.
                // Les descriptions ne sont pas décoratives : le schéma est le
                // second endroit que le modèle lit, après le prompt système, et
                // un champ sans description est un champ qu'il remplit au jugé.
                // Elles doivent dire EXACTEMENT la même chose que les consignes
                // de `systemImportAutomatique` (`prompts.ts`), sous peine de
                // demander au modèle un format que `toSeances` ne sait pas
                // relire.
                jour: {
                  anyOf: [{ type: 'integer' }, { type: 'null' }],
                  description: 'Rang du jour de classe dans la semaine (1 pour le premier jour) quand le document le dit vraiment, et jamais au-delà du nombre de jours de classe de la semaine. null si le document ne montre pas de jours, et null aussi si la puce vise plusieurs jours (« Jours 3-4 ») : n’invente aucun jour et n’en choisis aucun. Un « (séance 2) » écrit dans le texte n’est pas un numéro de jour.',
                },
                domaine: {
                  type: 'string',
                  description: 'Domaine tel que le document l’écrit, lu dans l’en-tête de colonne ou de ligne (« LC », « Vocabulaire », « Calcul mental »). "" si le document n’en donne pas. Ne le recopie pas en plus devant le libellé.',
                },
                libelle: {
                  type: 'string',
                  description: 'Texte exact de la puce, sans le préfixe « Jour N : » quand il désigne un seul jour (le jour se dit dans "jour", jamais deux fois) et sans le domaine devant. Une puce qui vise plusieurs jours garde son texte entier, « Jours 3-4 » compris. Une puce = une séance : ne fusionne pas deux puces et n’en découpe aucune. L’entrée correspondante de "items" reprend ce texte mot pour mot.',
                },
              },
              required: ['jour', 'domaine', 'libelle'],
            },
          },
          pages: { type: 'string' },
          mots_exemple: { type: 'array', items: { type: 'string' } },
        },
        required: ['numero', 'items', 'seances', 'pages', 'mots_exemple'],
      },
    },
  },
  required: ['semaines'],
} as const

const MAX_SEMAINES = 36

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
}

/**
 * Nettoie les séances rendues par le modèle.
 *
 * Tout le travail est délégué à `seanceDepuisTexte` (`progression-seances.ts`),
 * le point de passage unique qu'emprunte aussi le repli sur `items`. Rien de ce
 * qui concerne le préfixe « Jour N : » ne s'écrit ici : ce module ne connaît pas
 * cette convention, et l'avoir laissé l'ignorer est précisément ce qui faisait
 * diverger les deux chemins. Une séance rendue avec
 * `{ jour: null, libelle: 'Jour 3 : Fluence' }` sortait non datée et préfixée,
 * là où le même contenu arrivé par `items` sortait daté et nettoyé : deux champs
 * du même objet se contredisaient, et le contrat du type
 * (`src/types/index.ts`, « préfixe de jour retiré ») était faux une fois sur
 * deux.
 *
 * Ce que la délégation apporte, en plus de l'unicité :
 *
 * - le `jour` du modèle gagne quand il est valide (il a pu lire une colonne du
 *   tableau que le texte de la puce ne porte pas), celui du préfixe sinon,
 *   `null` en dernier recours. Jamais de jour deviné ;
 * - le `domaine` du modèle gagne quand il en donne un (il a pu le lire dans un
 *   en-tête de colonne absent du libellé), sinon il est dérivé du libellé.
 *   Ne pas surestimer ce gain : il ne survit pas à un aller-retour par `items`.
 *   Un `domaine: 'Lecture'` posé sur un libellé « La petite poule » qui ne
 *   contient pas de deux-points est perdu dès que la semaine est réécrite en
 *   texte puis relue (`itemsDepuisSeances` n'écrit pas le domaine, et
 *   `seancesDepuisItems` le redérive du libellé, donc `''`). Il tient le temps
 *   d'un affichage, pas d'un enregistrement suivi d'une relecture. Le contrat du
 *   type le dit déjà (`src/types/index.ts`, « DÉRIVÉ de `libelle`, jamais
 *   resérialisé ») : ce champ ne doit jamais servir de support de placement ;
 * - un intervalle (« Jours 3-4 : révisions ») n'est pas un rang de jour et
 *   ressort intact, non daté, même quand le modèle a rempli `jour` lui-même ;
 * - un `jour` du modèle qui contredit le préfixe écrit dans le libellé perd :
 *   c'est le texte du document qui date la puce (voir `seanceDepuisTexte`).
 *
 * Une séance sans libellé n'est pas une séance : une case vide du tableau ne
 * doit rien produire, sinon un créneau du cahier journal recevrait du vide au
 * lieu du nom de sa matière. C'est `seanceDepuisTexte` qui rend `null` dans ce
 * cas, y compris pour une puce réduite à son seul préfixe (« Jour 4 : », une
 * case vide dont le modèle recopie l'en-tête). Ce dernier cas manquait jusqu'au
 * 21/08 : la chaîne rendait `items: ['Jour 4 : ']` et le créneau s'affichait
 * VIDE, parce que `itemsDuJour` rendait `['']` et que le repli sur le nom de la
 * matière ne se déclenche que sur une liste vide.
 */
function toSeances(v: unknown): SeanceProgression[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((raw): SeanceProgression[] => {
    const o = (raw ?? {}) as Record<string, unknown>
    const seance = seanceDepuisTexte(
      typeof o.libelle === 'string' ? o.libelle : '',
      typeof o.jour === 'number' ? o.jour : null,
      typeof o.domaine === 'string' ? o.domaine : '',
    )
    return seance ? [seance] : []
  })
}

function nettoyerSemainesBrutes(brut: unknown[]): ProgressionSemaine[] {
  const items = Array.isArray(brut) ? brut : []
  return items.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    // Les séances du modèle font foi, MAIS elles ne remplacent pas les items :
    // elles les complètent. Une seule séance rendue suffisait à faire régénérer
    // `items` entièrement depuis les séances, donc à effacer les trois autres
    // apprentissages de la semaine, de l'écran ET de la base, sans un mot
    // (défaut du 20/08). Un modèle qui répond à moitié ne doit jamais pouvoir
    // supprimer le document de l'enseignante.
    //
    // `completerSeances` vit dans `progression-seances.ts` parce que comparer un
    // item à une séance demande de savoir retirer le préfixe « Jour N : », et
    // que ce module est le seul du dépôt à connaître cette convention.
    //
    // Quand le modèle ne rend aucune séance, la reconstruction depuis `items`
    // reste le repli : un modèle retombé sur l'ancien format ne fait pas perdre
    // la journée, elle est encore lisible dans le préfixe.
    const seances = toSeances(o.seances)
    const itemsPropres = toStringArray(o.items)
    const retenues = completerSeances(seances, itemsPropres)
    return {
      numero: typeof o.numero === 'number' ? o.numero : 0,
      // `items` redevient l'écriture texte des séances retenues : les deux
      // champs disent alors la même chose, et rien ne se perd puisque
      // `completerSeances` a garanti que chaque item a sa séance.
      //
      // Ce n'est pas un champ de compatibilité en sursis : `items` est ce que
      // le cahier journal lit aujourd'hui, et la seule chose qu'il lit (voir
      // `itemsDuJour` dans `src/lib/cahier-journal.ts`, qui retrouve le jour
      // dans le préfixe « Jour N : » de chaque item). Le préfixe reposé ici est
      // donc ce qui date réellement une séance à l'écran.
      items: retenues.length ? itemsDepuisSeances(retenues) : itemsPropres,
      pages: typeof o.pages === 'string' ? o.pages.trim() : '',
      mots_exemple: toStringArray(o.mots_exemple),
      seances: retenues,
    }
  })
}

/** Concatene en gardant l'ordre et sans repeter une valeur deja presente. */
function fusionnerListes(a: string[], b: string[]): string[] {
  const out = [...a]
  for (const v of b) if (!out.includes(v)) out.push(v)
  return out
}

/**
 * Regroupe les lignes qui portent le MEME numero de semaine.
 *
 * Les documents de maths, et beaucoup de programmations par periode, decrivent
 * une semaine sur plusieurs lignes : une par domaine (« Nombres », « Calcul »,
 * « Espace ») ou une par seance. Sans regroupement, l'application affichait
 * trois seances pour la semaine 1 au lieu d'une (retour du 26/07), et le
 * plafond de 36 amputait les deux tiers de l'annee.
 *
 * Une semaine du document reste une semaine de l'annee : ses apprentissages
 * s'additionnent dans l'ordre de lecture.
 */
function fusionnerParNumero(semaines: ProgressionSemaine[]): ProgressionSemaine[] {
  const parNumero = new Map<number, ProgressionSemaine>()
  for (const s of semaines) {
    const deja = parNumero.get(s.numero)
    if (!deja) {
      parNumero.set(s.numero, { ...s })
      continue
    }
    deja.items = fusionnerListes(deja.items, s.items)
    deja.mots_exemple = fusionnerListes(deja.mots_exemple, s.mots_exemple)
    // Les seances se concatenent, elles ne se dedoublonnent PAS : deux lignes
    // d'une meme semaine peuvent tres bien prevoir « Geste d'ecriture » chacune,
    // ce sont deux seances a placer dans deux creneaux, pas une repetition a
    // effacer. C'est pour cela que `fusionnerListes` ne sert pas ici.
    //
    // Consequence assumee, et seul endroit ou les deux champs peuvent encore se
    // contredire : `items`, lui, se dedoublonne (comportement du 26/07 qu'on ne
    // defait pas). Deux lignes de la meme semaine dont les seances rendent le
    // MEME texte d'item (meme libelle ET meme jour) donnent donc `items` plus
    // court que `seances`.
    //
    // Cela coute l'idempotence dans ce cas precis, et il faut dire comment
    // (mesure refaite le 21/08, apres correction des deux defauts qui, eux,
    // divergeaient sans borne) : renormaliser cette sortie reconstruit `items`
    // depuis les deux seances, donc RAJOUTE le doublon que la fusion venait
    // d'effacer. La conversion est stable a partir du deuxieme passage, elle
    // n'oscille pas et ne grandit pas indefiniment, mais son point fixe n'est
    // PAS sa premiere sortie : au second passage l'enseignante voit la seance
    // deux fois, ce qui defait avec un tour de retard la regle du 26/07. La
    // mesure exacte est ecrite en test (« se stabilise au second passage EN
    // AJOUTANT le doublon », src/lib/ia/__tests__/schema.test.ts).
    //
    // Le corriger demanderait soit de dedoublonner les seances (interdit, voir
    // ci-dessus), soit de cesser de dedoublonner `items` (le bug du 26/07 qui
    // affichait trois fois la meme semaine). On garde donc le cas ouvert plutot
    // que d'en casser une des deux regles.
    //
    // Aujourd'hui la contradiction ne se voit nulle part a l'ecran : le cahier
    // journal (`src/lib/cahier-journal.ts`) lit `items` et RIEN d'autre, jamais
    // `seances`. Le champ `seances` n'est pour l'instant lu par aucun affichage,
    // il attend le placement par creneau. Le jour ou un lecteur s'en servira,
    // c'est ce commentaire qu'il faudra relire en premier.
    deja.seances = [...(deja.seances ?? []), ...(s.seances ?? [])]
    // Les pages s'accumulent : « p.4, p.5 » dit ou chercher les deux domaines.
    const pages = fusionnerListes(
      deja.pages ? deja.pages.split(', ') : [],
      s.pages ? s.pages.split(', ') : [],
    )
    deja.pages = pages.join(', ')
  }
  return [...parNumero.values()]
}

/**
 * Vrai quand TOUS les numeros rendus par l'IA sont des semaines plausibles
 * (entiers de 1 a 36). Dans ce cas seulement ils peuvent servir au calage.
 * Sinon le calage ne repose que sur l'ordre de la liste, ce que l'ecran doit
 * dire franchement a l'enseignante.
 */
export function numerosSemainesFiables(brut: unknown[]): boolean {
  const cleaned = nettoyerSemainesBrutes(brut)
  if (cleaned.length === 0) return false
  return cleaned.every(s =>
    Number.isInteger(s.numero) && s.numero >= 1 && s.numero <= MAX_SEMAINES)
}

/**
 * Nettoie les semaines rendues par l'IA SANS toucher a leur numero quand il est
 * utilisable. Renumeroter detruisait l'information « ce manuel commence en
 * semaine 2 », donc decalait toute l'annee d'un cran : un sommaire qui laisse la
 * semaine de la rentree a l'accueil voyait son premier son remonter en semaine 1.
 * Le placement reel dans l'annee appartient a src/lib/calage-semaines.ts.
 */
export function normalizeProgression(brut: unknown[]): ProgressionSemaine[] {
  const cleaned = nettoyerSemainesBrutes(brut)
  if (!numerosSemainesFiables(brut)) {
    // Aucun numero exploitable : on numerote dans l'ordre recu.
    return cleaned.slice(0, MAX_SEMAINES).map((s, i) => ({ ...s, numero: i + 1 }))
  }
  // Fusion AVANT le plafond : sinon un document ecrit sur trois lignes par
  // semaine perdait les deux tiers de son annee.
  return fusionnerParNumero(cleaned)
    .sort((a, b) => a.numero - b.numero)
    .slice(0, MAX_SEMAINES)
}
