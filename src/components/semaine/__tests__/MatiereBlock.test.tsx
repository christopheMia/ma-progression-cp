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
