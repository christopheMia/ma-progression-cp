/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentTracking from '../StudentTracking'
import {
  ajouterCritereObservation,
  definirAcquisitionCritere,
  modifierCritereObservation,
  supprimerCritereObservation,
} from '@/lib/actions/criteres-observation'
import { toggleAcquisition } from '@/lib/actions/semaine'
import type {
  Acquisition,
  AcquisitionCritere,
  CritereObservation,
  Eleve,
  Semaine,
} from '@/types'

jest.mock('@/lib/actions/criteres-observation', () => ({
  ajouterCritereObservation: jest.fn(),
  definirAcquisitionCritere: jest.fn(),
  modifierCritereObservation: jest.fn(),
  supprimerCritereObservation: jest.fn(),
}))
jest.mock('@/lib/actions/semaine', () => ({
  toggleAcquisition: jest.fn(),
}))
jest.mock('@/lib/actions/appreciation', () => ({
  upsertAppreciation: jest.fn(),
}))
jest.mock('@/lib/export-word', () => ({
  exporterSuiviWord: jest.fn(),
}))
jest.mock('@/lib/print', () => ({
  imprimerElement: jest.fn(),
}))
jest.mock('@/lib/confetti', () => ({
  celebrate: jest.fn(),
}))

const semaine: Semaine = {
  id: 'semaine-1',
  class_id: 'classe-1',
  numero: 3,
  date_debut: '2026-09-14',
  graphemes: ['a'],
  edm_theme: '',
  edm_competences: '',
  manuel_pages: null,
  mots_exemple: null,
  note: null,
}

const eleves: Eleve[] = [
  { id: 'eleve-1', class_id: 'classe-1', prenom: 'Lina', ordre: 0 },
  { id: 'eleve-2', class_id: 'classe-1', prenom: 'Tom', ordre: 1 },
]

const acquisitions: Acquisition[] = [
  {
    id: 'acquisition-1',
    semaine_id: 'semaine-1',
    eleve_id: 'eleve-1',
    matiere: 'francais',
    grapheme: 'Lire a',
    acquis: true,
  },
  {
    id: 'acquisition-2',
    semaine_id: 'semaine-1',
    eleve_id: 'eleve-2',
    matiere: 'francais',
    grapheme: 'Lire a',
    acquis: false,
  },
]

const critere: CritereObservation = {
  id: 'critere-1',
  semaine_id: 'semaine-1',
  matiere: 'francais',
  notion: 'Lire a',
  libelle: 'Repère le son dans un mot',
  ordre: 0,
}

const acquisitionsCriteres: AcquisitionCritere[] = [
  { critere_id: 'critere-1', eleve_id: 'eleve-1', acquis: true },
  { critere_id: 'critere-1', eleve_id: 'eleve-2', acquis: false },
]

function afficherSuivi() {
  render(
    <StudentTracking
      semaine={semaine}
      eleves={eleves}
      acquisitions={acquisitions}
      appreciations={[]}
      methodes={[{
        methode_id: 'methode-1',
        matiere: 'francais',
        suivi_actif: true,
        items: ['Lire a'],
      }]}
      criteresObservation={[critere]}
      acquisitionsCriteres={acquisitionsCriteres}
    />,
  )
}

describe('StudentTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(toggleAcquisition as jest.Mock).mockResolvedValue(undefined)
    // Les actions de critères renvoient un resultat, elles ne levent plus : en
    // production Next.js efface le texte d'une erreur levee dans une action.
    ;(definirAcquisitionCritere as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(supprimerCritereObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
  })

  test('rend lisibles le suivi historique et les deux états du critère', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    expect(screen.getByRole('button', {
      name: /lina, lire a, notion dans son ensemble : acquis/i,
    }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', {
      name: /tom, lire a, notion dans son ensemble : non acquis/i,
    }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', {
      name: /lina, lire a, repère le son dans un mot : acquis/i,
    }).getAttribute('aria-pressed')).toBe('true')

    await user.click(screen.getByRole('button', {
      name: /tom, lire a, repère le son dans un mot : acquis/i,
    }))
    await waitFor(() => expect(definirAcquisitionCritere).toHaveBeenCalledWith(
      'critere-1',
      'eleve-2',
      true,
    ))
  })

  test('ajoute puis modifie un critère sans toucher aux autres suivis', async () => {
    const user = userEvent.setup()
    const ajoute: CritereObservation = {
      ...critere,
      id: 'critere-2',
      libelle: 'Explique sa démarche',
      ordre: 1,
    }
    ;(ajouterCritereObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: ajoute })
    ;(modifierCritereObservation as jest.Mock).mockResolvedValue({
      ok: true,
      valeur: { ...critere, libelle: 'Identifie le son entendu' },
    })
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    await user.type(screen.getByLabelText(/nouveau critère pour lire a/i), 'Explique sa démarche')
    await user.click(screen.getByRole('button', { name: /ajouter ce critère/i }))
    await waitFor(() => expect(ajouterCritereObservation).toHaveBeenCalledWith(
      'semaine-1',
      'francais',
      'Lire a',
      'Explique sa démarche',
    ))
    expect(screen.getAllByText('Explique sa démarche').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', {
      name: /modifier le critère repère le son dans un mot/i,
    }))
    const champ = screen.getByDisplayValue('Repère le son dans un mot')
    await user.clear(champ)
    await user.type(champ, 'Identifie le son entendu')
    await user.click(screen.getByRole('button', {
      name: /enregistrer le critère repère le son dans un mot/i,
    }))
    await waitFor(() => expect(modifierCritereObservation).toHaveBeenCalledWith(
      'critere-1',
      'Identifie le son entendu',
    ))
  })

  // Retour de Christophe du 2026-07-27 : « on ne voit pas ce qui est ajouté au
  // final et à quoi ». La notion n'etait nommee que dans un label `sr-only`,
  // donc lisible par un lecteur d'ecran mais invisible a l'oeil.
  test('nomme la notion a l’ecran au-dessus du champ d’ajout', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    expect(screen.getByText(/mes critères d’observation pour/i)).toBeTruthy()

    const etiquette = screen.getByText(/nouveau critère pour/i)
    expect(etiquette.className).not.toContain('sr-only')
    expect(etiquette.textContent).toContain('Lire a')
    expect(screen.getByText(/1 critère pour cette notion/i)).toBeTruthy()
  })

  // Incident du 2026-07-27, vu en production : cliquer « Ajouter ce critère »
  // avec le champ vide partait au serveur, qui LEVAIT « Écris le critère que tu
  // veux observer. ». Next.js efface le texte des erreurs levees en production,
  // donc Christophe lisait le pave « An error occurred in the Server Components
  // render... » a la place du message.
  test('refuse un critère vide sur place, sans appeler le serveur', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    await user.click(screen.getByRole('button', { name: /ajouter ce critère/i }))

    expect(await screen.findByText(/écris le critère que tu veux observer/i)).toBeTruthy()
    expect(ajouterCritereObservation).not.toHaveBeenCalled()
  })

  test('affiche le message renvoyé par le serveur quand l’ajout échoue', async () => {
    const user = userEvent.setup()
    ;(ajouterCritereObservation as jest.Mock).mockResolvedValue({
      ok: false,
      message: 'Ce critère existe déjà pour cette notion.',
    })
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    await user.type(screen.getByLabelText(/nouveau critère pour lire a/i), 'Repère le son dans un mot')
    await user.click(screen.getByRole('button', { name: /ajouter ce critère/i }))

    expect(await screen.findByText(/ce critère existe déjà pour cette notion/i)).toBeTruthy()
  })

  test('confirme la suppression d’un seul critère', async () => {
    const confirmer = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    await user.click(screen.getByRole('button', {
      name: /supprimer le critère repère le son dans un mot/i,
    }))

    expect(confirmer).toHaveBeenCalledWith(expect.stringMatching(/autres critères et suivis seront conservés/i))
    await waitFor(() =>
      expect(supprimerCritereObservation).toHaveBeenCalledWith('critere-1'))
    expect(screen.queryByText('Repère le son dans un mot')).toBeNull()
    confirmer.mockRestore()
  })

  test('affiche une notion longue sur deux lignes avec accès au titre complet', async () => {
    const user = userEvent.setup()
    render(
      <StudentTracking
        semaine={semaine}
        eleves={eleves}
        acquisitions={[]}
        appreciations={[]}
        methodes={[{
          methode_id: 'methode-1',
          matiere: 'francais',
          suivi_actif: true,
          items: [
            'Identifier les informations importantes d’un texte très long et expliquer la stratégie utilisée pour les retrouver',
          ],
        }]}
        criteresObservation={[]}
        acquisitionsCriteres={[]}
      />,
    )
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    const bouton = screen.getByRole('button', { name: /voir le titre complet/i })
    const titre = screen.getByTitle(/identifier les informations importantes/i)
    expect(titre.className).toContain('line-clamp-2')

    await user.click(bouton)
    expect(titre.className).not.toContain('line-clamp-2')
    expect(screen.getByRole('button', { name: /réduire le titre/i })).toBeTruthy()
  })
})
