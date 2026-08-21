import { normalizeProgression } from '../schema'
import { itemsDuJour } from '@/lib/cahier-journal'

/**
 * LE TEST QUI COMPTE : les semaines 1 et 2 du vrai document de Christophe
 * (`partage/exemple de planning p1.pdf`), de la réponse du modèle jusqu'à
 * l'écran du cahier journal.
 *
 * Ce document est la référence du chantier « une puce = une séance = un
 * créneau ». Il porte à lui seul tous les pièges déjà payés :
 *
 * - deux écritures du même domaine (« Lecture compréhension : » et « LC : ») ;
 * - un domaine SANS deux points (« Vocabulaire (séance 1) ») ;
 * - la même puce, mot pour mot, deux fois dans la semaine à deux jours
 *   différents (« Geste d’écriture », « Graphèmes A et I ») ;
 * - l'apostrophe typographique U+2019, six fois ;
 * - et surtout LE CAS DE CHRISTOPHE : le même texte de Rimbaud porté par deux
 *   domaines différents (« Langage oral » en semaine 1, « PDE » en semaine 2).
 *   Sans le préfixe de domaine à l'écran, l'enseignante ne sait plus laquelle
 *   des deux lignes est laquelle. C'est la raison de la décision du 21/08 :
 *   le domaine reste visible dans le cahier journal.
 */

/** Les 26 puces du document, dans l'ordre de lecture, colonne par colonne. */
const SEMAINE_1 = [
  { jour: 1, texte: 'Lecture compréhension : La petite poule qui voulait voir la mer (séance 1)' },
  { jour: 1, texte: 'Les prénoms de la classe (les lettres de l’alphabet)' },
  { jour: 1, texte: 'Geste d’écriture' },
  { jour: 2, texte: 'LC : La petite poule qui voulait voir la mer (séance 2)' },
  { jour: 2, texte: 'Les prénoms de la classe (le nombre de lettres)' },
  { jour: 3, texte: 'LC : La petite poule qui voulait voir la mer (séance 3)' },
  { jour: 3, texte: 'Vocabulaire (séance 1)' },
  { jour: 3, texte: 'Les prénoms de la classe (le nombre de syllabes)' },
  { jour: 3, texte: 'Geste d’écriture' },
  { jour: 4, texte: 'LC : La petite poule qui voulait voir la mer (séance 4)' },
  { jour: 4, texte: 'Vocabulaire (séance 2)' },
  { jour: 4, texte: 'Langage oral : Voyelles, de Rimbaud (séance 1)' },
]

const SEMAINE_2 = [
  { jour: 1, texte: 'Graphèmes A et I (phonologie, lecture)' },
  { jour: 1, texte: 'Vocabulaire (séance 3)' },
  { jour: 1, texte: 'LC : La petite poule qui voulait voir la mer (séance 5)' },
  { jour: 1, texte: 'Geste d’écriture' },
  { jour: 2, texte: 'Graphèmes A et I (phonologie, lecture)' },
  { jour: 2, texte: 'PDE : Voyelles, de Rimbaud (séance 2)' },
  { jour: 2, texte: 'Vocabulaire (séance 4)' },
  { jour: 3, texte: 'Graphèmes O et U (phonologie, lecture)' },
  { jour: 3, texte: 'LC : La petite poule qui voulait voir la mer (séance 6)' },
  { jour: 3, texte: 'Vocabulaire (séance 5)' },
  { jour: 3, texte: 'Geste d’écriture' },
  { jour: 4, texte: 'Graphèmes O et U (phonologie, lecture)' },
  { jour: 4, texte: 'PDE : Voyelles, de Rimbaud (séance 3)' },
  { jour: 4, texte: 'Vocabulaire (séance 6)' },
]

const NB_JOURS = 4

/** Le domaine écrit devant les deux points, quand le document en met un. */
function domaineEcrit(texte: string): string {
  const coupe = texte.indexOf(' : ')
  return coupe > 0 ? texte.slice(0, coupe) : ''
}

/**
 * La réponse du modèle qui obéit à la LETTRE du prompt : « libelle » = le texte
 * exact de la puce, domaine compris, et chaque entrée de « items » reprend ce
 * libellé mot pour mot.
 */
function reponseConforme(puces: typeof SEMAINE_1, numero: number) {
  return {
    numero,
    pages: '',
    mots_exemple: [],
    items: puces.map(p => p.texte),
    seances: puces.map(p => ({
      jour: p.jour,
      domaine: domaineEcrit(p.texte),
      libelle: p.texte,
    })),
  }
}

/**
 * La réponse d'un modèle qui range le domaine à part, comme l'ancienne consigne
 * le lui demandait : « domaine » porte l'en-tête, « libelle » et « items » ne
 * l'écrivent plus. Le code doit rendre le domaine à l'écran tout seul, sans
 * exiger du modèle qu'il l'ait recopié.
 */
function reponseDomaineAPart(puces: typeof SEMAINE_1, numero: number) {
  const nues = puces.map(p => {
    const domaine = domaineEcrit(p.texte)
    return { domaine, libelle: domaine ? p.texte.slice(domaine.length + 3) : p.texte, jour: p.jour }
  })
  return {
    numero,
    pages: '',
    mots_exemple: [],
    items: nues.map(n => n.libelle),
    seances: nues,
  }
}

/** Ce que l'enseignante lit dans son cahier journal, jour après jour. */
function ecran(items: string[]): string[] {
  return Array.from({ length: NB_JOURS }, (_, i) => itemsDuJour(items, i, NB_JOURS)).flat()
}

describe('semaines 1 et 2 du planning de période réel', () => {
  it('rend les 26 puces avec leur domaine visible, sans doublon et dans l’ordre', () => {
    const brut = [reponseConforme(SEMAINE_1, 1), reponseConforme(SEMAINE_2, 2)]
    const [s1, s2] = normalizeProgression(brut)

    expect(s1.seances).toHaveLength(SEMAINE_1.length)
    expect(s2.seances).toHaveLength(SEMAINE_2.length)
    expect(ecran(s1.items)).toEqual(SEMAINE_1.map(p => p.texte))
    expect(ecran(s2.items)).toEqual(SEMAINE_2.map(p => p.texte))
  })

  it('rend le même écran quand le modèle range le domaine dans son champ', () => {
    const brut = [reponseDomaineAPart(SEMAINE_1, 1), reponseDomaineAPart(SEMAINE_2, 2)]
    const [s1, s2] = normalizeProgression(brut)

    expect(s1.seances).toHaveLength(SEMAINE_1.length)
    expect(s2.seances).toHaveLength(SEMAINE_2.length)
    expect(ecran(s1.items)).toEqual(SEMAINE_1.map(p => p.texte))
    expect(ecran(s2.items)).toEqual(SEMAINE_2.map(p => p.texte))
  })

  // LE CAS DE CHRISTOPHE : deux lignes que rien ne distinguerait sans domaine.
  it('distingue les deux séances qui portent le même texte de Rimbaud', () => {
    const rimbaud = [
      { jour: 1, texte: 'Langage oral : Voyelles, de Rimbaud (séance 1)' },
      { jour: 2, texte: 'PDE : Voyelles, de Rimbaud (séance 1)' },
    ]
    const [semaine] = normalizeProgression([reponseDomaineAPart(rimbaud, 1)])
    expect(semaine.seances).toHaveLength(2)
    expect(ecran(semaine.items)).toEqual(rimbaud.map(p => p.texte))
  })

  it('garde les 26 puces stables au deuxième et au troisième passage', () => {
    const brut = [reponseConforme(SEMAINE_1, 1), reponseConforme(SEMAINE_2, 2)]
    const un = normalizeProgression(brut)
    expect(normalizeProgression(un)).toEqual(un)
    expect(normalizeProgression(normalizeProgression(un))).toEqual(un)
  })

  // Idempotence STRICTE dès le premier passage, et pas seulement à partir du
  // second : c'est ce que le domaine réécrit dans le LIBELLÉ apporte. S'il
  // n'était reposé qu'au moment d'écrire `items`, la séance l'apprendrait au
  // passage suivant et les deux sorties différeraient.
  it('converge dès le premier passage quand le modèle a rangé le domaine à part', () => {
    const brut = [reponseDomaineAPart(SEMAINE_1, 1), reponseDomaineAPart(SEMAINE_2, 2)]
    const un = normalizeProgression(brut)
    expect(normalizeProgression(un)).toEqual(un)
    expect(normalizeProgression(normalizeProgression(un))).toEqual(un)
  })

  // Pire cas mesuré par la relecture : le document écrit « Vocabulaire » sans
  // deux points. Un modèle qui obéissait à « ne recopie pas le domaine devant
  // le texte » rendait « libelle: "(séance 3)" », et l'écran affichait
  // « (séance 3) » : le mot « Vocabulaire » avait disparu.
  it('ne perd pas un domaine que le document n’écrit pas avant des deux points', () => {
    const brut = [{
      numero: 1, pages: '', mots_exemple: [],
      items: ['(séance 3)'],
      seances: [{ jour: 1, domaine: 'Vocabulaire', libelle: '(séance 3)' }],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(ecran(semaine.items)).toEqual(['Vocabulaire : (séance 3)'])
  })
})
