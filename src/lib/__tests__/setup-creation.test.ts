import fs from 'node:fs'
import path from 'node:path'
import type { SourceProgression } from '@/lib/progression-sources'
import { genererCahierJournal } from '@/lib/cahier-journal'
import { construirePlanningAnnuel } from '@/lib/planning-annuel'
import type { CreneauHoraire, ProgressionMatiere } from '@/types'
import {
  executerCreationClasse,
  type CreationClasseDependances,
  type DonneesCreationClasse,
} from '@/lib/setup-creation'

const sourceGenerale: SourceProgression = {
  clientId: 'source-generale',
  creeLe: '2026-07-23T08:00:00.000Z',
  nomSource: 'sommaire-francais.pdf',
  matiere: 'Français',
  nomMethode: "Les P'tites Poules",
  typeDocument: 'manuel',
  periodeNumero: null,
  semaines: [{
    numero: 1,
    items: ['Découvrir le son a'],
    pages: '4-5',
    mots_exemple: ['ami'],
  }, {
    numero: 8,
    items: ['Lire une phrase'],
    pages: '24',
    mots_exemple: [],
  }],
  periodes: [],
  empreinteContenu: 'empreinte-generale',
}

const sourcePeriode: SourceProgression = {
  clientId: 'source-periode',
  creeLe: '2026-07-23T08:05:00.000Z',
  nomSource: 'planning-p2.pdf',
  matiere: 'Français',
  nomMethode: "Les P'tites Poules",
  typeDocument: 'periode',
  periodeNumero: 2,
  semaines: [{
    numero: 1,
    items: ['Lire des phrases'],
    pages: '',
    mots_exemple: [],
  }],
  periodes: [],
  empreinteContenu: 'empreinte-periode',
}

const sourceMaths: SourceProgression = {
  clientId: 'source-maths',
  creeLe: '2026-07-23T08:10:00.000Z',
  nomSource: 'programmation-maths.pdf',
  matiere: 'Mathématiques',
  nomMethode: 'Maths en CP',
  typeDocument: 'programmation',
  periodeNumero: null,
  semaines: [],
  periodes: [{
    numero: 1,
    domaines: [{
      nom: 'Nombres et calcul',
      items: ['Comparer des collections'],
    }],
  }],
  empreinteContenu: 'empreinte-maths',
}

function donnees(
  sourcesProgression: SourceProgression[] = [],
): DonneesCreationClasse {
  return {
    sourcesProgression,
    rentreeDate: '2026-09-01',
    zoneScolaire: 'A',
    eleves: ['Lina', 'Noé'],
    emploiDuTemps: [{
      jour: 'lundi',
      heure_debut: '08:30',
      heure_fin: '09:15',
      matiere: 'Français',
      ordre: 0,
      type: 'cours',
    }],
  }
}

function creerDependances() {
  const operations: string[] = []
  let sourceIndex = 0
  const dependances: CreationClasseDependances = {
    lireAnciennesClasses: jest.fn(async () => {
      operations.push('lire-anciennes')
      return ['ancienne-classe']
    }),
    insererClasse: jest.fn(async classe => {
      operations.push(`classe:${classe.manuel_id}`)
      return 'nouvelle-classe'
    }),
    insererEleves: jest.fn(async () => {
      operations.push('eleves')
    }),
    insererPeriodes: jest.fn(async () => {
      operations.push('periodes')
    }),
    insererSemaines: jest.fn(async () => {
      operations.push('semaines')
    }),
    assurerMethode: jest.fn(async (_classeId, matiere) => {
      operations.push(`methode:${matiere}`)
      return `methode-${matiere}`
    }),
    enregistrerSource: jest.fn(async params => {
      sourceIndex += 1
      operations.push(`source:${params.p_nom_source}`)
      return `source-bdd-${sourceIndex}`
    }),
    insererEmploiDuTemps: jest.fn(async () => {
      operations.push('edt')
    }),
    supprimerClasses: jest.fn(async ids => {
      operations.push(`supprimer:${ids.join(',')}`)
    }),
  }
  return { dependances, operations }
}

describe('executerCreationClasse', () => {
  test('crée une classe sans méthode avec un squelette officiel de 36 semaines', async () => {
    const { dependances, operations } = creerDependances()

    await executerCreationClasse(donnees(), 'utilisateur-1', dependances)

    expect(dependances.insererClasse).toHaveBeenCalledWith({
      user_id: 'utilisateur-1',
      manuel_id: 'sans-methode',
      rentree_date: '2026-09-01',
      zone_scolaire: 'A',
    })
    const semaines = jest.mocked(dependances.insererSemaines).mock.calls[0][0]
    expect(semaines).toHaveLength(36)
    expect(semaines[0]).toEqual(expect.objectContaining({
      class_id: 'nouvelle-classe',
      numero: 1,
      date_debut: '2026-08-31',
      periode_numero: 1,
      graphemes: [],
    }))
    expect(dependances.assurerMethode).not.toHaveBeenCalled()
    expect(dependances.enregistrerSource).not.toHaveBeenCalled()
    const planning = construirePlanningAnnuel(
      semaines.map(semaine => ({ ...semaine, id: `semaine-${semaine.numero}` })),
      [],
      [],
    )
    expect(planning).toHaveLength(36)
    expect(planning.every(semaine => semaine.contenus.length === 0)).toBe(true)
    expect(operations).toEqual([
      'lire-anciennes',
      'classe:sans-methode',
      'eleves',
      'periodes',
      'semaines',
      'edt',
      'supprimer:ancienne-classe',
    ])
  })

  test('enregistre les méthodes et leurs sources séquentiellement avec le snapshot courant', async () => {
    const { dependances, operations } = creerDependances()
    // L ordre d entree est volontairement inverse pour la methode de francais.
    // La persistance doit suivre creeLe sans muter le brouillon.
    const sources = [sourcePeriode, sourceGenerale, sourceMaths]
    const copie = structuredClone(sources)

    await executerCreationClasse(donnees(sources), 'utilisateur-1', dependances)

    expect(dependances.insererClasse).toHaveBeenCalledWith(expect.objectContaining({
      manuel_id: 'custom',
    }))
    expect(dependances.assurerMethode).toHaveBeenNthCalledWith(
      1,
      'nouvelle-classe',
      'francais',
      "Les P'tites Poules",
    )
    expect(dependances.assurerMethode).toHaveBeenNthCalledWith(
      2,
      'nouvelle-classe',
      'maths',
      'Maths en CP',
    )

    const appels = jest.mocked(dependances.enregistrerSource).mock.calls.map(([params]) => params)
    expect(appels).toHaveLength(3)
    expect(appels[0]).toEqual(expect.objectContaining({
      p_class_id: 'nouvelle-classe',
      p_methode_id: 'methode-francais',
      p_matiere: 'francais',
      p_nom_source: 'sommaire-francais.pdf',
      p_type_document: 'manuel',
      p_periode_numero: null,
      p_niveau_precision: 1,
      p_contenu_structure: {
        semaines: sourceGenerale.semaines,
        periodes: [],
      },
      p_empreinte_contenu: 'empreinte-generale',
      p_source_ids_attendus: [],
    }))
    expect(appels[1].p_source_ids_attendus).toEqual(['source-bdd-1'])
    expect(appels[2].p_source_ids_attendus).toEqual([])
    expect(appels[1].p_niveau_precision).toBe(3)
    expect(appels[2].p_niveau_precision).toBe(2)

    const semaines = jest.mocked(dependances.insererSemaines).mock.calls[0][0]
    const premiereSemaineP2 = semaines.find(semaine => semaine.periode_numero === 2)?.numero
    expect(appels[1].p_lignes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        numero: premiereSemaineP2,
        items: ['Lire des phrases'],
      }),
    ]))
    expect(sources).toEqual(copie)
    expect(operations.filter(operation =>
      operation.startsWith('methode:') || operation.startsWith('source:')
    )).toEqual([
      'methode:francais',
      'source:sommaire-francais.pdf',
      'source:planning-p2.pdf',
      'methode:maths',
      'source:programmation-maths.pdf',
    ])
    expect(operations.indexOf('supprimer:ancienne-classe')).toBeGreaterThan(
      operations.indexOf('edt'),
    )
  })

  test('refuse deux noms de méthode pour une même matière avant toute écriture', async () => {
    const { dependances } = creerDependances()
    const autreMethode = {
      ...sourceGenerale,
      clientId: 'source-autre-methode',
      nomMethode: 'Pilotis',
      empreinteContenu: 'empreinte-pilotis',
    }

    await expect(executerCreationClasse(
      donnees([sourceGenerale, autreMethode]),
      'utilisateur-1',
      dependances,
    )).rejects.toThrow(
      "Deux méthodes différentes sont indiquées pour la matière Français",
    )
    expect(dependances.lireAnciennesClasses).not.toHaveBeenCalled()
    expect(dependances.insererClasse).not.toHaveBeenCalled()
  })

  test('détecte aussi le conflit quand deux alias désignent la même matière', async () => {
    const { dependances } = creerDependances()
    const alias = {
      ...sourceGenerale,
      clientId: 'source-alias',
      matiere: 'FRANCAIS',
      nomMethode: 'Pilotis',
      empreinteContenu: 'empreinte-alias',
    }

    await expect(executerCreationClasse(
      donnees([sourceGenerale, alias]),
      'utilisateur-1',
      dependances,
    )).rejects.toThrow(
      "Deux méthodes différentes sont indiquées pour la matière Français",
    )
    expect(dependances.insererClasse).not.toHaveBeenCalled()
  })

  test('canonise des copies, relie l’emploi du temps et alimente le cahier journal', async () => {
    const { dependances } = creerDependances()
    const sources = [sourceGenerale, sourceMaths]
    const copie = structuredClone(sources)
    const formulaire = donnees(sources)
    formulaire.emploiDuTemps = [
      {
        jour: 'lundi',
        heure_debut: '08:45',
        heure_fin: '09:15',
        matiere: 'Appropriation des graphèmes',
        ordre: 0,
        type: 'cours',
      },
      {
        jour: 'lundi',
        heure_debut: '10:15',
        heure_fin: '10:45',
        matiere: 'Calcul mental',
        ordre: 1,
        type: 'cours',
      },
      {
        jour: 'lundi',
        heure_debut: '10:45',
        heure_fin: '11:00',
        matiere: 'Arts visuels',
        ordre: 2,
        type: 'cours',
      },
      {
        jour: 'lundi',
        heure_debut: '11:00',
        heure_fin: '11:15',
        matiere: 'Récréation',
        ordre: 3,
        type: 'routine',
      },
    ]

    await executerCreationClasse(formulaire, 'utilisateur-1', dependances)

    expect(sources).toEqual(copie)
    const edt = jest.mocked(dependances.insererEmploiDuTemps).mock.calls[0][0]
    expect(edt.map(creneau => ({
      matiere: creneau.matiere,
      methode_id: creneau.methode_id,
    }))).toEqual([
      { matiere: 'Appropriation des graphèmes', methode_id: 'methode-francais' },
      { matiere: 'Calcul mental', methode_id: 'methode-maths' },
      { matiere: 'Arts visuels', methode_id: null },
      { matiere: 'Récréation', methode_id: null },
    ])

    const progressionPlanning = jest.mocked(dependances.enregistrerSource)
      .mock.calls
      .flatMap(([params]) => params.p_lignes
        .filter(ligne => ligne.numero === 1)
        .map(ligne => ({
          numero: ligne.numero,
          methode_id: params.p_methode_id,
          matiere: params.p_matiere,
          items: ligne.items,
          pages: ligne.pages,
          mots_exemple: ligne.mots_exemple,
        })))
    const progression: ProgressionMatiere[] = progressionPlanning.map(({
      methode_id,
      matiere,
      items,
      pages,
      mots_exemple,
    }) => ({
      methode_id,
      matiere,
      items,
      pages,
      mots_exemple,
    }))
    const journal = genererCahierJournal(
      edt.map((creneau, index): CreneauHoraire => ({
        ...creneau,
        id: `creneau-${index}`,
        jour: creneau.jour as CreneauHoraire['jour'],
        visible_journal: true,
      })),
      progression,
    )

    expect(journal[0].seances[0].deroulement).toContain('Découvrir le son a')
    expect(journal[0].seances[1].deroulement).toContain('Comparer des collections')
    expect(journal[0].seances[2].deroulement).toBe('')
    expect(journal[0].seances[3].deroulement).toBe('')

    const semaines = jest.mocked(dependances.insererSemaines).mock.calls[0][0]
    const planning = construirePlanningAnnuel(
      semaines.map(semaine => ({ ...semaine, id: `semaine-${semaine.numero}` })),
      progressionPlanning,
      [
        { id: 'methode-francais', matiere: 'francais', manuel: "Les P'tites Poules", suivi_actif: true },
        { id: 'methode-maths', matiere: 'maths', manuel: 'Maths en CP', suivi_actif: true },
      ],
    )
    expect(planning).toHaveLength(36)
    expect(planning[0].contenus.map(contenu => ({
      code: contenu.codeMatiere,
      methode: contenu.nomMethode,
    }))).toEqual([
      { code: 'francais', methode: "Les P'tites Poules" },
      { code: 'maths', methode: 'Maths en CP' },
    ])
  })

  test('supprime la nouvelle classe si le second RPC échoue et conserve l’ancienne', async () => {
    const { dependances } = creerDependances()
    jest.mocked(dependances.enregistrerSource)
      .mockResolvedValueOnce('source-bdd-1')
      .mockRejectedValueOnce(new Error('Ce document est déjà importé.'))

    await expect(executerCreationClasse(
      donnees([sourceGenerale, sourcePeriode]),
      'utilisateur-1',
      dependances,
    )).rejects.toThrow('Ce document est déjà importé.')

    expect(dependances.supprimerClasses).toHaveBeenCalledTimes(1)
    expect(dependances.supprimerClasses).toHaveBeenCalledWith(['nouvelle-classe'])
    expect(dependances.supprimerClasses).not.toHaveBeenCalledWith(['ancienne-classe'])
    expect(dependances.insererEmploiDuTemps).not.toHaveBeenCalled()
  })

  test('la Server Action passe par le RPC sans DML direct sur les sources', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/actions/setup.ts'),
      'utf8',
    )
    const orchestration = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/setup-creation.ts'),
      'utf8',
    )

    expect(source).toContain("rpc(\n        'enregistrer_source_progression'")
    expect(source).not.toMatch(/from\(['"]methode_sources['"]\)/)
    expect(source).not.toMatch(/from\(['"]progression['"]\)\.insert/)
    for (const parametre of [
      'p_class_id',
      'p_methode_id',
      'p_matiere',
      'p_nom_source',
      'p_type_document',
      'p_periode_numero',
      'p_niveau_precision',
      'p_contenu_structure',
      'p_empreinte_contenu',
      'p_lignes',
      'p_source_ids_attendus',
    ]) {
      expect(orchestration).toContain(parametre)
    }
  })
})
