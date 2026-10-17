/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import SectionRepliable from '@/components/parametres/SectionRepliable'
import SommaireParametres from '@/components/parametres/SommaireParametres'

function afficher() {
  return render(
    <>
      <SommaireParametres sections={[
        { id: 'eleves', titre: 'Mes élèves' },
        { id: 'edt', titre: 'Emploi du temps' },
      ]} />
      <SectionRepliable id="eleves" titre="Mes élèves" headerRight={<button type="button">Vider</button>}>
        <input aria-label="Prénom" defaultValue="" />
      </SectionRepliable>
      <SectionRepliable id="edt" titre="Emploi du temps">
        <p>Grille</p>
      </SectionRepliable>
    </>,
  )
}

describe('sections réductibles de la page Paramètres', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '/parametres')
  })

  test('le bouton Réduire cache le contenu et les actions, sans perdre la saisie', () => {
    afficher()
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Léa' } })

    fireEvent.click(screen.getByRole('button', { name: 'Réduire la section Mes élèves' }))

    expect(screen.getByLabelText('Prénom', { selector: 'input' })).not.toBeVisible()
    expect(screen.queryByRole('button', { name: 'Vider' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la section Mes élèves' }))
    expect(screen.getByLabelText('Prénom')).toHaveValue('Léa')
    expect(screen.getByRole('button', { name: 'Vider' })).toBeInTheDocument()
  })

  test('une section réduite le reste à la visite suivante', () => {
    const { unmount } = afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Réduire la section Emploi du temps' }))
    unmount()

    afficher()

    expect(screen.getByText('Grille')).not.toBeVisible()
  })

  test('le sommaire ouvre la section visée et pointe sur son ancre', () => {
    afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Réduire la section Emploi du temps' }))

    const lien = screen.getByRole('link', { name: 'Emploi du temps' })
    expect(lien).toHaveAttribute('href', '#edt')
    fireEvent.click(lien)

    expect(screen.getByText('Grille')).toBeVisible()
  })

  test('tout réduire puis tout ouvrir', () => {
    afficher()

    fireEvent.click(screen.getByRole('button', { name: 'Tout réduire' }))
    expect(screen.getByText('Grille')).not.toBeVisible()
    expect(screen.getByLabelText('Prénom', { selector: 'input' })).not.toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Tout ouvrir' }))
    expect(screen.getByText('Grille')).toBeVisible()
  })
})
