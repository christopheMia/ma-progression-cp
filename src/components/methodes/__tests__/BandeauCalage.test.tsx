/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import BandeauCalage from '../BandeauCalage'
import type { Calage } from '@/lib/calage-semaines'

const CALAGE: Calage = {
  lignes: [
    {
      numero: 1,
      dateLundi: '2026-08-31',
      periodeNumero: 1,
      items: ['a'],
      pages: '',
      motsExemple: [],
      vide: false,
    },
  ],
  base: 'numeros',
  decalage: 0,
  semaineDepart: 1,
  avertissements: [],
  peutAvancer: true,
  peutReculer: true,
}

function avecSemainesVides(numeros: number[]): Calage {
  return {
    ...CALAGE,
    lignes: [
      ...numeros.map(numero => ({
        numero,
        dateLundi: '2026-08-31',
        periodeNumero: 1,
        items: [],
        pages: '',
        motsExemple: [],
        vide: true,
      })),
      ...CALAGE.lignes.map(ligne => ({ ...ligne, numero: 9 })),
    ],
  }
}

describe('BandeauCalage', () => {
  test('demande à quelle semaine la progression démarre', () => {
    render(<BandeauCalage calage={CALAGE} onSemaineDepart={() => {}} />)

    expect(screen.getByLabelText('Ta progression démarre à quelle semaine ?'))
      .toHaveValue('1')
  })

  test('remonte la semaine de départ choisie', () => {
    const onSemaineDepart = jest.fn()
    render(<BandeauCalage calage={CALAGE} onSemaineDepart={onSemaineDepart} />)

    fireEvent.change(screen.getByLabelText('Ta progression démarre à quelle semaine ?'), {
      target: { value: '2' },
    })

    expect(onSemaineDepart).toHaveBeenCalledWith(2)
  })

  test('signale simplement une semaine sans contenu, sans alarmer', () => {
    render(<BandeauCalage calage={avecSemainesVides([1])} onSemaineDepart={() => {}} />)

    expect(screen.getByText(/La semaine 1 n’a pas encore de contenu/)).toBeInTheDocument()
    expect(screen.getByText(/Tu pourras la remplir plus tard/)).toBeInTheDocument()
  })

  test('accorde le message au pluriel quand plusieurs semaines sont vides', () => {
    render(<BandeauCalage calage={avecSemainesVides([1, 2])} onSemaineDepart={() => {}} />)

    expect(screen.getByText(/Les semaines 1 et 2 n’ont pas encore de contenu/)).toBeInTheDocument()
  })

  test('dit franchement quand le calage repose sur le seul ordre du document', () => {
    render(
      <BandeauCalage calage={{ ...CALAGE, base: 'ordre' }} onSemaineDepart={() => {}} />
    )

    expect(screen.getByText(/ne numérote pas ses semaines/)).toBeInTheDocument()
  })

  test('affiche les avertissements du calage', () => {
    render(
      <BandeauCalage
        calage={{ ...CALAGE, avertissements: ['Ces numéros apparaissent plusieurs fois : 3.'] }}
        onSemaineDepart={() => {}}
      />
    )

    expect(screen.getByText('Ces numéros apparaissent plusieurs fois : 3.')).toBeInTheDocument()
  })
})
