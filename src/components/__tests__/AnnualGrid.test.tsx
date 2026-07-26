/**
 * @jest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react'
import AnnualGrid from '../planning/AnnualGrid'
import type { SemainePlanning } from '@/lib/planning-annuel'

function semaine(numero: number, periode_numero: number | null): SemainePlanning {
  return {
    id: `s${numero}`,
    class_id: 'classe',
    numero,
    date_debut: `2026-09-${String(numero).padStart(2, '0')}`,
    graphemes: [],
    edm_theme: '',
    edm_competences: '',
    manuel_pages: null,
    mots_exemple: null,
    note: null,
    periode_numero,
    contenus: [],
    avancement: { acquis: 0, total: 0 },
  }
}

describe('AnnualGrid', () => {
  test('utilise les vraies periodes enregistrees plutot que les bornes fixes', () => {
    render(
      <AnnualGrid
        semaines={[semaine(1, 1), semaine(8, 1), semaine(9, 2)]}
        periodes={[
          { numero: 1, nom: 'P1 réelle', date_debut: '2026-09-01', date_fin: '2026-10-23', ordre: 1 },
          { numero: 2, nom: 'P2 réelle', date_debut: '2026-11-09', date_fin: '2026-12-18', ordre: 2 },
        ]}
      />,
    )

    const p1 = screen.getByText('P1 réelle').closest('.print-section')
    const p2 = screen.getByText('P2 réelle').closest('.print-section')
    expect(p1).not.toBeNull()
    expect(p2).not.toBeNull()
    expect(within(p1 as HTMLElement).getByText('S8')).toBeTruthy()
    expect(within(p2 as HTMLElement).getByText('S9')).toBeTruthy()
  })

  test('isole les semaines non rattachees sans les faire disparaitre', () => {
    render(
      <AnnualGrid
        semaines={[semaine(1, 1), semaine(2, null)]}
        periodes={[
          { numero: 1, nom: 'Période 1', date_debut: '2026-09-01', date_fin: '2026-10-23', ordre: 1 },
        ]}
      />,
    )

    const aRattacher = screen.getByText('Semaines à rattacher').closest('.print-section')
    expect(aRattacher).not.toBeNull()
    expect(within(aRattacher as HTMLElement).getByText('S2')).toBeTruthy()
  })

  test('affiche séparément les matières et les vrais noms de méthodes', () => {
    const avecContenu = semaine(1, 1)
    avecContenu.contenus = [
      {
        codeMatiere: 'francais',
        libelleMatiere: 'Français',
        nomMethode: "Les P'tites Poules",
        suiviActif: true,
        items: ['Son a'],
      },
      {
        codeMatiere: 'maths',
        libelleMatiere: 'Mathématiques',
        nomMethode: 'Maths en CP',
        suiviActif: false,
        items: ['Comparer'],
      },
    ]

    render(<AnnualGrid semaines={[avecContenu]} />)

    expect(screen.getByText('Français')).toBeTruthy()
    expect(screen.getByText("Les P'tites Poules")).toBeTruthy()
    expect(screen.getByText('Mathématiques')).toBeTruthy()
    expect(screen.getByText('Maths en CP')).toBeTruthy()
    expect(screen.getByText('Son a')).toBeTruthy()
    expect(screen.getByText('Comparer')).toBeTruthy()
  })

  test('garde le squelette et explique clairement l’absence de méthode', () => {
    const semaines = Array.from({ length: 36 }, (_, index) =>
      semaine(index + 1, index < 7 ? 1 : null)
    )

    render(<AnnualGrid semaines={semaines} aucuneMethode />)

    expect(screen.getByText(/Aucune méthode n’est encore configurée/i)).toBeTruthy()
    expect(screen.getByText('S1')).toBeTruthy()
    expect(screen.getByText('S36')).toBeTruthy()
  })
})
