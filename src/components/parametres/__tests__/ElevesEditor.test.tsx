/**
 * @jest-environment jsdom
 *
 * L'écran des élèves, et les deux besoins de Cécile du 9 septembre 2026.
 *
 * 1. « Il faudrait pouvoir classer la liste des élèves par ordre alphabétique
 *    sans perdre les éléments déjà notés ». Ces tests gardent les deux moitiés
 *    de sa phrase : le classement marche, et rien ne se perd.
 * 2. Corriger un prénom sans effacer le suivi de l'enfant. Avant, les prénoms
 *    n'étaient pas modifiables : réparer une faute de frappe imposait de
 *    supprimer l'élève et de le retaper, donc d'effacer ses observations.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ElevesEditor from '@/components/parametres/ElevesEditor'
import { updateEleves } from '@/lib/actions/parametres'

jest.mock('@/lib/actions/parametres', () => ({
  updateEleves: jest.fn(async () => undefined),
}))

/** Une classe telle qu'elle arrive de la base : chaque enfant a son identifiant. */
function classe(...prenoms: string[]) {
  return prenoms.map((prenom, i) => ({ id: `id-${i}`, prenom }))
}

/** Les prénoms affichés, dans leur ordre à l'écran. */
function prenomsAffiches(): string[] {
  return screen.getAllByTitle('Corriger ce prénom').map(n => n.textContent?.trim() ?? '')
}

beforeEach(() => jest.clearAllMocks())

describe('classer de A à Z', () => {
  it('classe la liste affichée par ordre alphabétique', () => {
    render(<ElevesEditor initial={classe('Zoé', 'Adam', 'Manon')} />)
    fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
    expect(prenomsAffiches()).toEqual(['Adam', 'Manon', 'Zoé'])
  })

  // En français, Émile se range avec les E, pas après Z.
  it('range un prénom accentué à sa place française', () => {
    render(<ElevesEditor initial={classe('Zoé', 'Émile', 'Elodie', 'Adam')} />)
    fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
    expect(prenomsAffiches()).toEqual(['Adam', 'Elodie', 'Émile', 'Zoé'])
  })

  // La moitié de la phrase de Cécile qui compte le plus : rien ne disparaît.
  it('ne perd aucun élève en classant', () => {
    const liste = ['Zoé', 'Émile', 'Jean-Baptiste', 'Anna', 'Bob']
    render(<ElevesEditor initial={classe(...liste)} />)
    fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
    expect([...prenomsAffiches()].sort()).toEqual([...liste].sort())
  })

  // Le vrai enjeu du classement : chaque enfant emporte son identifiant, donc
  // son suivi. Sans cela, classer déplacerait les observations d'un enfant à
  // l'autre en silence.
  it('chaque élève garde son identifiant après le classement', async () => {
    render(<ElevesEditor initial={classe('Zoé', 'Adam')} />)
    fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les élèves/i }))
    await waitFor(() => expect(updateEleves).toHaveBeenCalledWith([
      { id: 'id-1', prenom: 'Adam' },
      { id: 'id-0', prenom: 'Zoé' },
    ]))
  })

  it('ne touche pas à la base tant qu elle n a pas enregistré', () => {
    render(<ElevesEditor initial={classe('Zoé', 'Adam')} />)
    fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
    expect(updateEleves).not.toHaveBeenCalled()
  })

  it('n est pas proposé quand il y a moins de deux élèves', () => {
    render(<ElevesEditor initial={classe('Adam')} />)
    const bouton = screen.getByRole('button', { name: /Classer de A à Z/i }) as HTMLButtonElement
    expect(bouton.disabled).toBe(true)
  })
})

describe('corriger un prénom', () => {
  it('ouvre le prénom à la correction quand on clique dessus', () => {
    render(<ElevesEditor initial={classe('Sofia')} />)
    fireEvent.click(screen.getByTitle('Corriger ce prénom'))
    expect(screen.getByLabelText('Corriger le prénom Sofia')).toBeTruthy()
  })

  // LE DÉFAUT QUE CE TEST FERME : l'enfant garde son identifiant, donc son
  // suivi. Avant, corriger une lettre supprimait l'élève et en créait un autre.
  it('garde l identifiant de l élève quand son prénom est corrigé', async () => {
    render(<ElevesEditor initial={classe('Sofia')} />)
    fireEvent.click(screen.getByTitle('Corriger ce prénom'))
    fireEvent.change(screen.getByLabelText('Corriger le prénom Sofia'), { target: { value: 'Sophia' } })
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les élèves/i }))
    await waitFor(() => expect(updateEleves).toHaveBeenCalledWith([{ id: 'id-0', prenom: 'Sophia' }]))
  })

  it('ne crée pas un doublon en corrigeant', async () => {
    render(<ElevesEditor initial={classe('Sofia', 'Bob')} />)
    fireEvent.click(screen.getAllByTitle('Corriger ce prénom')[0])
    fireEvent.change(screen.getByLabelText('Corriger le prénom Sofia'), { target: { value: 'Sophia' } })
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les élèves/i }))
    await waitFor(() => expect(updateEleves).toHaveBeenCalled())
    expect((updateEleves as jest.Mock).mock.calls[0][0]).toHaveLength(2)
  })
})

describe('ajouter et retirer', () => {
  it('ajoute un nouvel élève sans identifiant', async () => {
    render(<ElevesEditor initial={classe('Adam')} />)
    fireEvent.change(screen.getByPlaceholderText(/Un prénom/i), { target: { value: 'Chloé' } })
    fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/i }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les élèves/i }))
    await waitFor(() => expect(updateEleves).toHaveBeenCalledWith([
      { id: 'id-0', prenom: 'Adam' },
      { prenom: 'Chloé' },
    ]))
  })

  // Retirer un élève efface son suivi : ce geste-là doit être confirmé, et il
  // doit rester possible de dire non.
  it('demande confirmation avant de retirer un élève', () => {
    const confirmer = jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ElevesEditor initial={classe('Adam', 'Bob')} />)
    fireEvent.click(screen.getByLabelText('Retirer Adam'))
    expect(confirmer).toHaveBeenCalled()
    expect(prenomsAffiches()).toEqual(['Adam', 'Bob'])
    confirmer.mockRestore()
  })

  it('retire l élève quand la maîtresse confirme', () => {
    const confirmer = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ElevesEditor initial={classe('Adam', 'Bob')} />)
    fireEvent.click(screen.getByLabelText('Retirer Adam'))
    expect(prenomsAffiches()).toEqual(['Bob'])
    confirmer.mockRestore()
  })
})
