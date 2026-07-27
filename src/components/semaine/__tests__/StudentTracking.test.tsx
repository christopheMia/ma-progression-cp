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
    ;(definirAcquisitionCritere as jest.Mock).mockResolvedValue(undefined)
    ;(supprimerCritereObservation as jest.Mock).mockResolvedValue(undefined)
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
    ;(ajouterCritereObservation as jest.Mock).mockResolvedValue(ajoute)
    ;(modifierCritereObservation as jest.Mock).mockResolvedValue({
      ...critere,
      libelle: 'Identifie le son entendu',
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
