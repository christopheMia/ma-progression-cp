import { genererCahierJournal } from '../cahier-journal'
import type { CreneauHoraire } from '@/types'

/**
 * Le lundi RÉEL de Cécile, semaine 1, tel qu'il est en base le 31/07/2026.
 *
 * Ce fichier n'est pas un test de plus : c'est un filet. Christophe a posé le
 * critère, et il est juste : « si ça génère n'importe quoi je perdrai tous les
 * clients ». Un cahier journal faux est pire qu'un cahier journal vide, parce
 * qu'il a l'air juste et que personne ne le relit.
 *
 * On fige donc ce que chaque créneau reçoit, à partir des VRAIES données. Toute
 * évolution du générateur qui déplacerait un contenu fera échouer ce test et
 * demandera une décision explicite, au lieu de passer inaperçue.
 *
 * Les libellés sont recopiés tels quels, fautes de frappe comprises
 * (« production d'cérits ») : c'est ce que contient la base, et le test doit
 * refléter le réel, pas une version propre du réel.
 */

const c = (
  heure_debut: string, heure_fin: string, matiere: string,
  type: 'cours' | 'routine', visible_journal: boolean, ordre: number,
): CreneauHoraire => ({
  id: `l-${ordre}`, class_id: 'classe', jour: 'lundi',
  heure_debut, heure_fin, matiere, ordre, couleur: null, type,
  methode_id: null, visible_journal,
})

const LUNDI: CreneauHoraire[] = [
  c('08:20', '08:30', 'Accueil dans la cour', 'routine', false, 0),
  c('08:30', '08:35', 'Rituel date', 'routine', false, 1),
  c('08:35', '08:40', 'Rituel vocabulaire', 'routine', false, 2),
  c('08:40', '09:10', 'Phonologie encodage décodage', 'cours', true, 3),
  c('09:10', '09:40', 'Ateliers de français', 'cours', true, 4),
  c('09:40', '10:00', 'Etude de la langue : vocabulaire ou grammaire', 'cours', true, 5),
  c('10:00', '10:15', 'Récréation', 'routine', false, 6),
  c('10:15', '10:25', 'Chaque jour compte', 'cours', true, 7),
  c('10:25', '10:30', 'flash maths', 'cours', true, 8),
  c('10:30', '11:00', 'mathématiques', 'cours', true, 9),
  c('11:00', '11:30', 'calcul mental', 'cours', true, 10),
  c('13:30', '13:45', 'Chut, je lis.', 'cours', true, 12),
  c('13:45', '14:15', 'Anglais', 'cours', true, 13),
  c('14:25', '14:45', 'Histoire, géographie, sciences et technologie', 'cours', true, 14),
  c('15:20', '15:35', 'Ecriture', 'cours', true, 17),
  c('15:35', '15:45', 'EMC / Poésie', 'cours', true, 18),
  c('15:45', '16:15', "Compréhension écrite ou production d'cérits", 'cours', true, 19),
]

/** La semaine complète, pour que « Jour 1 » désigne bien le lundi. */
const SEMAINE: CreneauHoraire[] = [
  ...LUNDI,
  { ...c('08:40', '09:10', 'Phonologie encodage décodage', 'cours', true, 3), id: 'ma', jour: 'mardi' },
  { ...c('08:40', '09:10', 'Phonologie encodage décodage', 'cours', true, 3), id: 'je', jour: 'jeudi' },
  { ...c('08:40', '09:10', 'Phonologie encodage décodage', 'cours', true, 3), id: 've', jour: 'vendredi' },
]

/** La progression réelle de la semaine 1, recopiée de la base le 31/07/2026. */
const PROGRESSION = [
  {
    methode_id: null, matiere: 'francais', pages: null, mots_exemple: [],
    items: [
      'Jour 1 : LC : La petite poule qui voulait voir la mer (S1)',
      'Jour 1 : Les prénoms de la classe (alphabet)',
      "Jour 1 : Geste d'écriture",
      'Jour 2 : Grammaire (S1)',
      'Jour 2 : LC : La petite poule... (S2)',
      'Jour 3 : Vocabulaire (S1)',
      'Jour 4 : LC : La petite poule... (S4)',
    ],
  },
  {
    methode_id: null, matiere: 'maths', pages: null, mots_exemple: [],
    items: [
      'Numération : Nombres entiers jusqu’à 10',
      'Problèmes : Résoudre des problèmes additifs de type égalisation',
      "Calcul mental : Table d'addition les suivants",
    ],
  },
  {
    methode_id: null, matiere: 'emc', pages: null, mots_exemple: [],
    items: [
      'Histoire : Repérer le mois de son anniversaire et le jour sur un calendrier.',
      'Géographie : Le monde : L’Europe, la France et les Pays Bas',
      'Sciences : Le relevé de température : 1er septembre',
      "EMC/EVARS/PHARE : L'identité : le passeport, nom, prénom, la date de naissance",
    ],
  },
]

const lundi = () => genererCahierJournal(SEMAINE, PROGRESSION).find(j => j.jour === 'lundi')!
const deroulementDe = (matiere: string) =>
  lundi().seances.find(s => s.matiere === matiere)!.deroulement

describe('lundi réel de la semaine 1', () => {
  test('les routines ne sont pas remplies et restent visibles nulle part', () => {
    // `visible_journal: false` sur les récréations et les rituels : elles ne
    // doivent pas encombrer le cahier journal.
    const matieres = lundi().seances.map(s => s.matiere)
    expect(matieres).not.toContain('Récréation')
    expect(matieres).not.toContain('Accueil dans la cour')
  })

  test('AUCUN créneau du lundi ne mentionne un autre jour', () => {
    // Le bug d'origine, formulé par Christophe : « comment on peut avoir des
    // jour 1 jour 2 dans la première heure du lundi ».
    for (const seance of lundi().seances) {
      expect(seance.deroulement).not.toMatch(/jour\s*\d/i)
      expect(seance.deroulement).not.toContain('Grammaire')
      expect(seance.deroulement).not.toContain('Vocabulaire (S1)')
    }
  })

  test('les créneaux de français reçoivent les trois séances du Jour 1', () => {
    for (const matiere of [
      'Phonologie encodage décodage',
      'Ateliers de français',
      'Etude de la langue : vocabulaire ou grammaire',
      'Chut, je lis.',
      'Ecriture',
      "Compréhension écrite ou production d'cérits",
    ]) {
      const texte = deroulementDe(matiere)
      expect(texte).toContain('La petite poule qui voulait voir la mer (S1)')
      expect(texte).toContain('Les prénoms de la classe')
      expect(texte).toContain("Geste d'écriture")
    }
  })

  test('les créneaux de maths reçoivent la progression de maths', () => {
    for (const matiere of ['Chaque jour compte', 'flash maths', 'mathématiques', 'calcul mental']) {
      expect(deroulementDe(matiere)).toContain('Nombres entiers jusqu’à 10')
    }
  })

  test('EMC / Poésie reçoit la ligne EMC', () => {
    expect(deroulementDe('EMC / Poésie')).toContain('Repérer le mois de son anniversaire')
  })

  /**
   * DEUX TROUS CONNUS, volontairement figés ici plutôt que masqués.
   *
   * Ces deux créneaux ressortent VIDES, et c'est le comportement voulu tant
   * qu'on n'a pas décidé mieux : rien dans la progression ne leur correspond.
   *
   * - « Anglais » : aucune ligne de progression en anglais n'existe.
   * - « Histoire, géographie, sciences et technologie » : le contenu existe
   *   (les items « Histoire : », « Géographie : », « Sciences : ») mais il a été
   *   rangé dans la ligne `emc` à l'import, et un créneau d'histoire cherche la
   *   famille `qlm`. Le document « Programmation Histoire géographie
   *   sciences.pdf » mélange en réalité deux matières.
   *
   * Vide est le bon comportement par défaut : inventer un contenu plausible
   * serait pire, c'est exactement ce que faisait l'ancien bouton « Générer la
   * journée », supprimé le 26/07.
   *
   * Le jour où ces trous seront comblés, ce test échouera : c'est voulu, il
   * faudra alors le mettre à jour EN CONNAISSANCE DE CAUSE.
   */
  test('les créneaux sans progression correspondante restent vides, pas inventés', () => {
    expect(deroulementDe('Anglais')).toBe('')
    expect(deroulementDe('Histoire, géographie, sciences et technologie')).toBe('')
  })
})
