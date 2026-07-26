import {
  executerAjoutSourceProgression,
  executerRetraitSourceProgression,
  sourceProgressionDepuisBdd,
  type MethodeSourcesDependances,
  type SourceProgressionBdd,
} from '@/lib/methode-sources'
import type { SourceProgression } from '@/lib/progression-sources'

const sourceManuel: SourceProgression = {
  clientId: 'candidate-manuel',
  creeLe: '2026-07-23T08:00:00.000Z',
  nomSource: 'manuel.pdf',
  matiere: 'Français',
  nomMethode: 'Lecture CP',
  typeDocument: 'manuel',
  periodeNumero: null,
  semaines: [
    { numero: 1, items: ['Base générale'], pages: '4', mots_exemple: [] },
    { numero: 8, items: ['Semaine huit'], pages: '30', mots_exemple: [] },
  ],
  periodes: [],
  empreinteContenu: 'empreinte-manuel',
}

const sourcePeriode: SourceProgression = {
  clientId: 'candidate-periode',
  creeLe: '2026-07-23T09:00:00.000Z',
  nomSource: 'periode-1.pdf',
  matiere: 'francais',
  nomMethode: 'Lecture CP',
  typeDocument: 'periode',
  periodeNumero: 1,
  semaines: [
    { numero: 1, items: ['Détail P1'], pages: '10', mots_exemple: [] },
  ],
  periodes: [],
  empreinteContenu: 'empreinte-periode',
}

function ligneBdd(
  id: string,
  source: SourceProgression,
  createdAt = source.creeLe,
): SourceProgressionBdd {
  return {
    id,
    methode_id: 'm-fr',
    nom_source: source.nomSource,
    type_document: source.typeDocument,
    periode_numero: source.periodeNumero,
    niveau_precision: source.typeDocument === 'periode'
      ? 3
      : source.typeDocument === 'programmation' ? 2 : 1,
    contenu_structure: {
      semaines: source.semaines,
      periodes: source.periodes,
    },
    empreinte_contenu: source.empreinteContenu,
    created_at: createdAt,
  }
}

function creerDependances(
  overrides: Partial<MethodeSourcesDependances> = {},
): MethodeSourcesDependances {
  return {
    lireContexte: jest.fn(async () => ({ classId: 'classe-1' })),
    trouverMethode: jest.fn(async () => ({
      id: 'm-fr',
      matiere: 'francais',
      manuel: 'Lecture CP',
    })),
    lireMethodeParId: jest.fn(async () => ({
      id: 'm-fr',
      matiere: 'francais',
      manuel: 'Lecture CP',
    })),
    creerMethode: jest.fn(async () => 'm-nouvelle'),
    lireSource: jest.fn(async sourceId =>
      ligneBdd(sourceId, sourcePeriode)
    ),
    lireSources: jest.fn(async () => []),
    lireSemaines: jest.fn(async () => [
      { id: 'sem-1', numero: 1, periode_numero: 1 },
      { id: 'sem-2', numero: 2, periode_numero: 1 },
      { id: 'sem-8', numero: 8, periode_numero: 2 },
    ]),
    enregistrerSource: jest.fn(async () => 'source-nouvelle'),
    retirerSource: jest.fn(async () => undefined),
    methodeEstVide: jest.fn(async () => true),
    supprimerMethodeCreee: jest.fn(async () => undefined),
    revalider: jest.fn(async () => undefined),
    ...overrides,
  }
}

describe('gestion atomique des sources de méthode', () => {
  test('reconstitue created_at vers creeLe avec validation runtime', () => {
    const ligne = ligneBdd('source-1', sourceManuel, '2026-07-20T12:34:56.000Z')

    expect(sourceProgressionDepuisBdd(ligne, 'Lecture CP')).toEqual(
      expect.objectContaining({
        clientId: 'source-1',
        creeLe: '2026-07-20T12:34:56.000Z',
        matiere: 'francais',
        nomMethode: 'Lecture CP',
        typeDocument: 'manuel',
      }),
    )
    expect(() => sourceProgressionDepuisBdd({
      ...ligne,
      contenu_structure: { semaines: 'invalide', periodes: [] },
    }, 'Lecture CP')).toThrow('source enregistrée est invalide')
  })

  test('ajoute par le RPC avec les 11 paramètres et le snapshot complet', async () => {
    const existante = ligneBdd('source-1', sourceManuel)
    const dependances = creerDependances({
      lireSources: jest.fn(async () => [existante]),
    })

    await executerAjoutSourceProgression(sourcePeriode, dependances)

    expect(dependances.enregistrerSource).toHaveBeenCalledWith({
      p_class_id: 'classe-1',
      p_methode_id: 'm-fr',
      p_matiere: 'francais',
      p_nom_source: 'periode-1.pdf',
      p_type_document: 'periode',
      p_periode_numero: 1,
      p_niveau_precision: 3,
      p_contenu_structure: {
        semaines: sourcePeriode.semaines,
        periodes: [],
      },
      p_empreinte_contenu: 'empreinte-periode',
      p_lignes: expect.arrayContaining([
        expect.objectContaining({ numero: 1, items: ['Détail P1'] }),
        expect.objectContaining({ numero: 8, items: ['Semaine huit'] }),
      ]),
      p_source_ids_attendus: ['source-1'],
    })
    expect(dependances.retirerSource).not.toHaveBeenCalled()
  })

  test('rejette un doublon avant le RPC', async () => {
    const dependances = creerDependances({
      lireSources: jest.fn(async () => [ligneBdd('source-1', sourceManuel)]),
    })

    await expect(
      executerAjoutSourceProgression({ ...sourceManuel }, dependances),
    ).rejects.toThrow('déjà importé')
    expect(dependances.enregistrerSource).not.toHaveBeenCalled()
  })

  test('refuse de fusionner deux noms de méthode pour la même matière', async () => {
    const dependances = creerDependances({
      trouverMethode: jest.fn(async () => ({
        id: 'm-fr',
        matiere: 'francais',
        manuel: 'Pilotis',
      })),
    })

    await expect(
      executerAjoutSourceProgression(sourceManuel, dependances),
    ).rejects.toThrow('Pilotis')
    expect(dependances.lireSources).not.toHaveBeenCalled()
    expect(dependances.enregistrerSource).not.toHaveBeenCalled()
  })

  test('retire par le RPC avec la cible comprise dans le snapshot et restaure la priorité', async () => {
    const manuel = ligneBdd('source-manuel', sourceManuel)
    const periode = ligneBdd('source-periode', sourcePeriode)
    const dependances = creerDependances({
      lireSources: jest.fn(async () => [manuel, periode]),
    })

    await executerRetraitSourceProgression('source-periode', dependances)

    expect(dependances.retirerSource).toHaveBeenCalledWith({
      p_source_id: 'source-periode',
      p_lignes: expect.arrayContaining([
        expect.objectContaining({ numero: 1, items: ['Base générale'] }),
        expect.objectContaining({ numero: 8, items: ['Semaine huit'] }),
      ]),
      p_source_ids_attendus: ['source-manuel', 'source-periode'],
    })
  })

  test('supprime seulement la nouvelle méthode vide si le premier RPC échoue', async () => {
    const dependances = creerDependances({
      trouverMethode: jest.fn(async () => null),
      enregistrerSource: jest.fn(async () => {
        throw new Error('Les documents ont changé, recharge puis réessaie')
      }),
      methodeEstVide: jest.fn(async () => true),
    })

    await expect(
      executerAjoutSourceProgression(sourceManuel, dependances),
    ).rejects.toThrow('documents ont changé')
    expect(dependances.supprimerMethodeCreee).toHaveBeenCalledWith(
      'classe-1',
      'm-nouvelle',
    )
  })

  test('ne supprime jamais une méthode existante ni une nouvelle méthode devenue non vide', async () => {
    const methodeExistante = creerDependances({
      enregistrerSource: jest.fn(async () => {
        throw new Error('échec RPC')
      }),
    })
    await expect(
      executerAjoutSourceProgression(sourceManuel, methodeExistante),
    ).rejects.toThrow('échec RPC')
    expect(methodeExistante.supprimerMethodeCreee).not.toHaveBeenCalled()

    const nouvelleNonVide = creerDependances({
      trouverMethode: jest.fn(async () => null),
      enregistrerSource: jest.fn(async () => {
        throw new Error('réponse réseau perdue')
      }),
      methodeEstVide: jest.fn(async () => false),
    })
    await expect(
      executerAjoutSourceProgression(sourceManuel, nouvelleNonVide),
    ).rejects.toThrow('réponse réseau perdue')
    expect(nouvelleNonVide.supprimerMethodeCreee).not.toHaveBeenCalled()
  })
})
