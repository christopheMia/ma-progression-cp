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

  // ATTENTE MODIFIÉE le 21/08, DÉCISION DE CHRISTOPHE : le domaine reste
  // VISIBLE dans le cahier journal. Dans son planning réel, deux séances portent
  // le même texte de Rimbaud, l'une en langage oral, l'autre en production
  // d'écrits ; sans « LC : » et « PDE : » devant, les deux lignes sont
  // identiques à l'écran.
  //
  // La consigne inverse existait pour supprimer les doublons. Elle est retirée,
  // et la protection contre le doublon vient désormais du CODE (comparaison
  // tolérante, `memePuceAuDomainePres`). C'est le principe qui a débloqué ce
  // chantier : le code ne doit jamais exiger de l'IA une perfection au caractère
  // près. Suivie à la lettre, cette consigne faisait d'ailleurs disparaître du
  // texte : « Vocabulaire (séance 3) », dont le domaine n'est pas séparé par des
  // deux points, arrivait à l'écran en « (séance 3) ».
  it('demande de garder le domaine devant le texte de la puce', () => {
    expect(prompt).not.toMatch(/Ne préfixe pas les contenus de "items" par leur domaine/i)
    expect(prompt).not.toMatch(/Ne recopie pas non plus le domaine devant le texte/i)
    expect(prompt).toMatch(/GARDE le domaine devant le texte/)
    expect(prompt).toMatch(/Garde le domaine devant le contenu dans "items"/)
  })

  it('dit pourquoi le domaine doit rester lisible', () => {
    expect(prompt).toMatch(/distingue deux séances portant le même texte/i)
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
  // de la puce sans préfixe de jour, "items" reprenant mot pour mot ces libellés
  // dans le même ordre, intervalle non daté et gardé entier, case vide ignorée.
  //
  // Deux des quatre puces ci-dessous portent un "domaine" que leur texte
  // n'écrit pas : le document le donnait dans un en-tête de colonne. C'est le
  // cas que la décision du 21/08 vise, et le code repose ce domaine devant le
  // texte pour qu'il atteigne l'écran (`avecDomaine`).
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

  // ATTENTES MODIFIÉES le 21/08 (décision de Christophe) : les deux puces dont
  // le domaine vient d'un en-tête de colonne le portent maintenant devant leur
  // texte, dans le libellé comme dans l'item, donc à l'écran. Les deux autres ne
  // bougent pas : « Geste d’écriture : a » annonce déjà un domaine dans son
  // texte (on n'en empile pas un second devant), et l'intervalle n'en a aucun.
  it('garde le texte de chaque puce et l’ordre de lecture', () => {
    const [semaine] = normalizeProgression(reponseConforme)
    expect(semaine.seances?.map(s => s.libelle)).toEqual([
      'LC : Découverte du son [a]',
      'Geste d’écriture : a',
      'LC : La petite poule (séance 1)',
      'Jours 3-4 : révisions',
    ])
    expect(semaine.items).toEqual([
      'Jour 1 : LC : Découverte du son [a]',
      'Jour 1 : Geste d’écriture : a',
      'Jour 2 : LC : La petite poule (séance 1)',
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
