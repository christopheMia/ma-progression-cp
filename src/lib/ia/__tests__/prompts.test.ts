import {
  systemImport,
  systemChat,
  userImport,
  SYSTEM_BILAN,
  userBilan,
  systemImportAutomatique,
} from '../prompts'
import { normalizeProgression, PROGRESSION_JSON_SCHEMA } from '../schema'

describe('systemImport par matière', () => {
  test('français parle de sons/graphèmes', () => {
    const s = systemImport('francais')
    expect(s.toLowerCase()).toContain('graphème')
  })
  test('maths parle de notions et de répartition par semaine', () => {
    const s = systemImport('maths')
    expect(s.toLowerCase()).toContain('notion')
    expect(s.toLowerCase()).toContain('semaine')
  })
  test('consigne d’exhaustivité présente dans les deux', () => {
    expect(systemImport('francais').toLowerCase()).toContain('aucun')
    expect(systemImport('maths').toLowerCase()).toContain('aucun')
  })
})

describe('prompts', () => {
  test('userImport insère le texte du manuel', () => {
    const u = userImport('Semaine 1 : a — p.10')
    expect(u).toContain('Semaine 1 : a — p.10')
  })

  test('systemChat tutoie l’enseignant par son prénom', () => {
    expect(systemChat('Cécile')).toContain('Cécile')
  })

  test('systemChat sans prénom reste valide', () => {
    expect(systemChat(undefined)).toMatch(/assistant/i)
  })

  test('SYSTEM_BILAN impose le placeholder [ELEVE]', () => {
    expect(SYSTEM_BILAN).toContain('[ELEVE]')
  })

  test('userBilan liste les notions acquises et à retravailler', () => {
    const u = userBilan({ numeroSemaine: 3, matiere: 'francais', itemsAcquis: ['a', 'i'], itemsNonAcquis: ['r'], statut: 'acquis' })
    expect(u).toContain('Semaine 3')
    expect(u).toContain('a, i')
    expect(u).toContain('r')
  })
})

// Les consignes de séances vivent dans systemImportAutomatique, la SEULE
// fonction que la route d'import appelle (`src/app/api/ia-manuel/route.ts`).
// Le plan visait systemImportPeriode, qui n'a plus aucun appelant : les
// consignes y auraient été écrites pour personne, alors que le schéma exige
// désormais « seances » de chaque semaine.
describe('consignes de séances (systemImportAutomatique)', () => {
  const prompt = systemImportAutomatique()

  it('nomme les trois champs d’une séance', () => {
    expect(prompt).toContain('"seances"')
    expect(prompt).toContain('"jour"')
    expect(prompt).toContain('"domaine"')
    expect(prompt).toContain('"libelle"')
  })

  it('dit qu’une puce est une séance', () => {
    expect(prompt).toMatch(/une puce[^\n]*= UNE séance/i)
  })

  it('interdit de fusionner ou de découper une puce', () => {
    expect(prompt).toMatch(/ne fusionne jamais deux puces/i)
    expect(prompt).toMatch(/ne découpe jamais une puce/i)
  })

  it('interdit d’inventer un jour et impose null quand il est inconnu', () => {
    expect(prompt).toMatch(/n['’]invente aucun jour/i)
    expect(prompt).toMatch(/mets null/i)
  })

  it('dit que le « (séance N) » du document n’est pas un jour', () => {
    expect(prompt).toMatch(/\(séance/i)
    expect(prompt).toMatch(/pas un numéro de jour/i)
  })

  it('demande un libellé sans préfixe de jour, la forme que le code sait relire', () => {
    expect(prompt).toMatch(/sans le préfixe/i)
  })

  it('dit qu’une case vide ne produit aucune séance', () => {
    expect(prompt).toMatch(/case vide[^\n]*aucune séance/i)
  })

  it('dit qu’une puce visant plusieurs jours n’est pas datée et garde son texte', () => {
    expect(prompt).toMatch(/plusieurs jours[^\n]*null/i)
    expect(prompt).toMatch(/Jours 3-4/)
  })

  it('demande le MÊME texte dans items et dans libelle, pas seulement le même sens', () => {
    expect(prompt).toMatch(/"items" reprend MOT POUR MOT le "libelle"/i)
  })

  it('borne le rang de jour au nombre de jours de classe de la semaine', () => {
    expect(prompt).toMatch(/ne dépasse jamais le nombre de jours de classe/i)
  })

  // La règle "periode" demandait « Préfixe chaque contenu par son domaine »
  // pendant que les règles "seances" demandaient le texte de la puce dans
  // "libelle" et l'en-tête dans "domaine". Un modèle qui obéissait aux deux
  // écrivait deux formes de la même puce, et la semaine ressortait doublée.
  it('ne demande plus de préfixer les items par leur domaine', () => {
    expect(prompt).not.toMatch(/Préfixe chaque contenu par son domaine/i)
    expect(prompt).toMatch(/Ne préfixe pas les contenus de "items" par leur domaine/i)
  })
})

// Sept tests qui cherchent des chaînes dans un prompt ne prouvent rien du
// dialogue entre le prompt et le code. Le test qui compte fait tourner le
// format PROMIS PAR LE PROMPT à travers le code et vérifie qu'il en ressort
// intact. Règle à ne pas rouvrir : ne jamais demander au modèle un format que
// `toSeances` ne sait pas relire.
describe('le format promis par le prompt traverse le code sans être déformé', () => {
  const prompt = systemImportAutomatique()


  // Une réponse de modèle qui obéit à la lettre aux consignes de
  // systemImportAutomatique : une puce = une séance, "libelle" = le texte exact
  // de la puce sans préfixe de jour ni domaine devant, "items" reprenant mot
  // pour mot ces libellés dans le même ordre, intervalle non daté et gardé
  // entier, case vide ignorée.
  const reponseConforme = [{
    numero: 1,
    pages: 'p.12',
    mots_exemple: ['ami'],
    items: [
      'Découverte du son [a]',
      'Geste d’écriture : a',
      'La petite poule (séance 1)',
      'Jours 3-4 : révisions',
    ],
    seances: [
      { jour: 1, domaine: 'LC', libelle: 'Découverte du son [a]' },
      { jour: 1, domaine: 'Écriture', libelle: 'Geste d’écriture : a' },
      { jour: 2, domaine: 'LC', libelle: 'La petite poule (séance 1)' },
      { jour: null, domaine: '', libelle: 'Jours 3-4 : révisions' },
    ],
  }]

  it('rend une séance par puce, ni plus ni moins', () => {
    expect(normalizeProgression(reponseConforme)[0].seances).toHaveLength(4)
  })

  it('garde le texte de chaque puce et l’ordre de lecture', () => {
    const [semaine] = normalizeProgression(reponseConforme)
    expect(semaine.seances?.map(s => s.libelle)).toEqual([
      'Découverte du son [a]',
      'Geste d’écriture : a',
      'La petite poule (séance 1)',
      'Jours 3-4 : révisions',
    ])
    expect(semaine.items).toEqual([
      'Jour 1 : Découverte du son [a]',
      'Jour 1 : Geste d’écriture : a',
      'Jour 2 : La petite poule (séance 1)',
      'Jours 3-4 : révisions',
    ])
  })

  it('ne bouge plus aux passages suivants', () => {
    const une = normalizeProgression(reponseConforme)
    const deux = normalizeProgression(une)
    expect(deux).toEqual(une)
    expect(normalizeProgression(normalizeProgression(deux))).toEqual(une)
  })

  // Le prompt et le schéma sont les deux endroits que le modèle lit : ils
  // doivent dire la même chose, sinon la sortie est nettoyée en silence.
  it('dit la même chose dans le schéma JSON que dans le prompt', () => {
    const seance = PROGRESSION_JSON_SCHEMA.properties.semaines.items.properties.seances.items
    const descriptions = [
      seance.properties.jour.description,
      seance.properties.domaine.description,
      seance.properties.libelle.description,
    ].join('\n')
    for (const regle of [
      /rang du jour/i,
      /n[’']invente aucun jour/i,
      /plusieurs jours/i,
      /séance 2/i,
      /en-tête de colonne/i,
      /sans le préfixe/i,
      /mot pour mot/i,
    ]) {
      expect(descriptions).toMatch(regle)
      expect(prompt).toMatch(regle)
    }
  })
})
