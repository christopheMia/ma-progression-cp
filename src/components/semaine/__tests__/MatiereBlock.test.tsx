/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import MatiereBlock from '../MatiereBlock'

describe('MatiereBlock', () => {
  test('affiche une vraie progression Questionner le monde', () => {
    render(
      <MatiereBlock
        matiere="qlm"
        items={['Observer la germination']}
        manuel="Ma progression QLM"
      />,
    )

    expect(screen.getByText(/Questionner le monde/)).toBeTruthy()
    expect(screen.getByText('Observer la germination', { exact: false })).toBeTruthy()
    expect(screen.getByText('Ma progression QLM', { exact: false })).toBeTruthy()
  })
})

describe('MatiereBlock, une séance par ligne', () => {
  test('range les séances par jour avec le domaine en étiquette', () => {
    render(
      <MatiereBlock
        matiere="francais"
        items={['Jour 1 : Graphèmes e et é', 'Jour 2 : LC : Texte au choix']}
      />,
    )
    expect(screen.getByText('Jour 1')).toBeTruthy()
    expect(screen.getByText('Jour 2')).toBeTruthy()
    expect(screen.getByText('LC')).toBeTruthy()
    expect(screen.getByText('Texte au choix')).toBeTruthy()
    // Plus de phrase unique « "..." et "..." ».
    expect(screen.queryByText(/" et "/)).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
