/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CahierJournalEditor from '../CahierJournalEditor'
import {
  genererOuChargerJournal,
  lireJournal,
  sauvegarderJournal,
} from '@/lib/actions/journal'
import type { JourJournal } from '@/types'

jest.mock('@/lib/actions/journal', () => ({
  genererOuChargerJournal: jest.fn(),
  lireJournal: jest.fn(),
  sauvegarderJournal: jest.fn(),
  regenererJournal: jest.fn(),
}))
jest.mock('@/lib/export-word', () => ({
  exporterJournalWord: jest.fn(),
}))
jest.mock('@/lib/print', () => ({
  imprimerElement: jest.fn(),
}))
jest.mock('../GoogleDocsButton', () => function GoogleDocsButtonMock() {
  return null
})

const journal: JourJournal[] = [{
  jour: 'lundi',
  seances: [
    {
      matiere: 'Lecture',
      heure_debut: '08:45',
      heure_fin: '09:15',
      type: 'cours',
      deroulement: 'Son a',
    },
    {
      matiere: 'Mathématiques',
      heure_debut: '09:15',
      heure_fin: '10:00',
      type: 'cours',
      deroulement: 'Nombres jusqu’à 10',
    },
  ],
}]

async function ouvrirJournal() {
  const user = userEvent.setup()
  render(<CahierJournalEditor semaineId="s1" numeroSemaine={3} />)
  // Le bouton n'apparaît qu'une fois la relecture terminée : tant qu'on ne sait
  // pas si la semaine existe déjà, on ne propose pas de la générer.
  await user.click(await screen.findByRole('button', { name: /générer le cahier journal/i }))
  await screen.findByText('Son a')
  return user
}

describe('CahierJournalEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Les actions serveur renvoient un resultat, elles ne levent plus : en
    // production Next.js efface le texte d'une erreur levee dans une action.
    ;(genererOuChargerJournal as jest.Mock).mockResolvedValue({ ok: true, valeur: journal })
    ;(sauvegarderJournal as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    // Par défaut : aucune semaine déjà enregistrée, donc le bouton est proposé.
    ;(lireJournal as jest.Mock).mockResolvedValue({ ok: true, valeur: null })
  })

  // Retour de Christophe du 31/07 : « quand je génère mes cahiers journaux ils
  // s'effacent quand je change d'onglet ». Rien ne s'effaçait : le composant
  // repartait d'un état vide à chaque montage et ne relisait jamais la base,
  // donc il réaffichait le bouton « Générer » comme si le travail avait disparu.
  describe('retour sur une semaine déjà travaillée', () => {
    test('réaffiche le cahier journal enregistré, sans rien redemander', async () => {
      ;(lireJournal as jest.Mock).mockResolvedValue({ ok: true, valeur: journal })
      render(<CahierJournalEditor semaineId="s1" numeroSemaine={3} />)

      expect(await screen.findByText('Son a')).toBeTruthy()
      expect(screen.queryByRole('button', { name: /générer le cahier journal/i })).toBeNull()
      // La relecture ne doit RIEN créer : sinon chaque semaine survolée se
      // figerait en photo au lieu de continuer à suivre l'emploi du temps.
      expect(genererOuChargerJournal).not.toHaveBeenCalled()
    })

    test('propose de générer quand la semaine n’a jamais été ouverte', async () => {
      render(<CahierJournalEditor semaineId="s1" numeroSemaine={3} />)

      expect(await screen.findByRole('button', { name: /générer le cahier journal/i })).toBeTruthy()
    })

    test('ne propose pas de générer tant que la relecture n’a pas répondu', () => {
      ;(lireJournal as jest.Mock).mockReturnValue(new Promise(() => {}))
      render(<CahierJournalEditor semaineId="s1" numeroSemaine={3} />)

      // Proposer « Générer » pendant le chargement inviterait à recréer un
      // cahier journal qui existe déjà.
      expect(screen.queryByRole('button', { name: /générer le cahier journal/i })).toBeNull()
    })
  })

  test('ne propose plus de générer une journée avec l’IA', async () => {
    await ouvrirJournal()

    expect(screen.queryByRole('button', { name: /générer la journée/i })).toBeNull()
  })

  test('modifie une entrée et sauvegarde les autres sans changement', async () => {
    const user = await ouvrirJournal()

    await user.click(screen.getByRole('button', { name: /modifier mathématiques/i }))
    const matiere = screen.getByLabelText('Matière')
    await user.clear(matiere)
    await user.type(matiere, 'Calcul mental')
    const deroulement = screen.getByLabelText('Déroulement')
    await user.clear(deroulement)
    await user.type(deroulement, 'Jeu des compléments à 10')
    await user.click(screen.getByRole('button', { name: /enregistrer les modifications/i }))

    await waitFor(() => expect(sauvegarderJournal).toHaveBeenCalledTimes(1))
    const contenu = (sauvegarderJournal as jest.Mock).mock.calls[0][1] as JourJournal[]
    expect(contenu[0].seances[0]).toEqual(journal[0].seances[0])
    expect(contenu[0].seances[1]).toMatchObject({
      matiere: 'Calcul mental',
      deroulement: 'Jeu des compléments à 10',
    })
  })

  test('demande confirmation puis supprime uniquement l’entrée choisie', async () => {
    const confirmer = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const user = await ouvrirJournal()

    await user.click(screen.getByRole('button', { name: /supprimer lecture/i }))

    expect(confirmer).toHaveBeenCalledWith(expect.stringMatching(/autres entrées seront conservées/i))
    await waitFor(() => expect(sauvegarderJournal).toHaveBeenCalledTimes(1))
    const contenu = (sauvegarderJournal as jest.Mock).mock.calls[0][1] as JourJournal[]
    expect(contenu[0].seances).toEqual([journal[0].seances[1]])
    confirmer.mockRestore()
  })

  test('annule la suppression quand la confirmation est refusée', async () => {
    const confirmer = jest.spyOn(window, 'confirm').mockReturnValue(false)
    const user = await ouvrirJournal()

    await user.click(screen.getByRole('button', { name: /supprimer lecture/i }))

    expect(sauvegarderJournal).not.toHaveBeenCalled()
    expect(screen.getByText('Son a')).toBeTruthy()
    confirmer.mockRestore()
  })

  // Décision du 17/10 : les séances se placent selon leur sens (le nom du
  // créneau), pas selon leur nombre. Celles qu'aucune case ne reçoit à coup sûr
  // sont montrées à l'enseignante, calmement : ce n'est pas une erreur, certaines
  // (Fluence, Lettres muettes...) n'ont simplement pas de case fixe.
  describe('séances à placer', () => {
    const jourAvecAPlacer = (aPlacer?: { libelle: string; origine: string | null }[]): JourJournal[] => [{
      jour: 'lundi',
      seances: [{
        matiere: 'Français',
        heure_debut: '09:00',
        heure_fin: '09:30',
        type: 'cours',
        deroulement: 'Séance A',
      }],
      ...(aPlacer ? { aPlacer } : {}),
    }]

    async function afficher(contenu: JourJournal[]) {
      ;(lireJournal as jest.Mock).mockResolvedValue({ ok: true, valeur: contenu })
      render(<CahierJournalEditor semaineId="s1" numeroSemaine={3} />)
      await screen.findByText('Séance A')
    }

    test('affiche les séances qu’aucune case n’a pu accueillir', async () => {
      await afficher(jourAvecAPlacer([{ libelle: 'Geste d’écriture', origine: null }]))

      expect(screen.getByRole('heading', { name: /à placer ce jour \(1\)/i })).toBeTruthy()
      expect(screen.getByText('Geste d’écriture')).toBeTruthy()
      expect(screen.getByText(/aucune case de ton emploi du temps/i)).toBeTruthy()
      // Texte d'avant la décision du 17/10 : il parlait d'un manque de créneaux.
      expect(screen.queryByText(/pas assez de créneaux/i)).toBeNull()
    })

    test('présente la liste comme une liste, rattachée à son titre', async () => {
      await afficher(jourAvecAPlacer([
        { libelle: 'Fluence', origine: null },
        { libelle: 'Lettres muettes', origine: null },
      ]))

      const region = screen.getByRole('region', { name: /à placer ce jour \(2\)/i })
      expect(within(region).getAllByRole('listitem').map(li => li.textContent))
        .toEqual(['Fluence', 'Lettres muettes'])
    })

    test('reste calme : ni alerte ni bouton inventé', async () => {
      await afficher(jourAvecAPlacer([{ libelle: 'Fluence', origine: null }]))

      expect(screen.queryByRole('alert')).toBeNull()
      const region = screen.getByRole('region', { name: /à placer ce jour/i })
      expect(within(region).queryByRole('button')).toBeNull()
    })

    test('dit d’où vient la séance : semaine, jour numéroté, autre, ou rien', async () => {
      await afficher(jourAvecAPlacer([
        { libelle: 'Séance sans origine', origine: null },
        { libelle: 'Séance de semaine', origine: 'semaine' },
        { libelle: 'Séance du jour', origine: 'Jour 5' },
        { libelle: 'Séance autre', origine: 'Période 2' },
      ]))

      const [sansOrigine, deSemaine, duJour, autre] = screen.getAllByRole('listitem')
      expect(sansOrigine.textContent).toBe('Séance sans origine')
      expect(deSemaine.textContent).toBe('Séance de semaine(pour la semaine)')
      expect(duJour.textContent).toBe('Séance du jour(prévue jour 5)')
      expect(autre.textContent).toBe('Séance autre(Période 2)')
    })

    test('n’affiche aucun bloc quand aPlacer est absent', async () => {
      await afficher(jourAvecAPlacer())

      expect(screen.queryByText(/à placer ce jour/i)).toBeNull()
      expect(screen.queryByRole('region')).toBeNull()
    })

    test('n’affiche aucun bloc quand aPlacer est vide', async () => {
      await afficher(jourAvecAPlacer([]))

      expect(screen.queryByText(/à placer ce jour/i)).toBeNull()
    })

    test('montre le bloc même pour une journée sans aucune entrée', async () => {
      ;(lireJournal as jest.Mock).mockResolvedValue({
        ok: true,
        valeur: [{ jour: 'mardi', seances: [], aPlacer: [{ libelle: 'Langage oral', origine: null }] }],
      })
      render(<CahierJournalEditor semaineId="s1" numeroSemaine={3} />)

      expect(await screen.findByText('Langage oral')).toBeTruthy()
      expect(screen.getByText(/aucune entrée pour cette journée/i)).toBeTruthy()
    })
  })
})
