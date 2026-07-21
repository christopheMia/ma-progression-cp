/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import EdtGrilleLecture, { type CreneauLecture } from '../EdtGrilleLecture'

const c = (jour: string, heure_debut: string, heure_fin: string, matiere: string,
  extra: Partial<CreneauLecture> = {}): CreneauLecture =>
  ({ jour, heure_debut, heure_fin, matiere, couleur: null, ...extra })

const lignes = () => Array.from(document.querySelectorAll('tbody tr'))

describe('EdtGrilleLecture', () => {
  test('fusionne une séance qui couvre plusieurs frontières', () => {
    render(<EdtGrilleLecture creneaux={[
      c('lundi', '11:00', '11:30', 'Calcul mental'),
      c('mardi', '11:00', '11:10', 'Problème'),
      c('mardi', '11:10', '11:30', 'Musique'),
    ]} />)
    const cellule = screen.getByText('Calcul mental').closest('td')
    expect(cellule?.getAttribute('rowspan')).toBe('2')
    expect(lignes()).toHaveLength(2)
  })

  test('un créneau importé sans couleur reçoit celle de sa famille', () => {
    // À l'import d'un PDF, `couleur` n'existe pas encore.
    render(<EdtGrilleLecture creneaux={[
      { jour: 'lundi', heure_debut: '09:00', heure_fin: '10:00', matiere: 'Anglais' },
    ]} />)
    const cellule = screen.getByText('Anglais').closest('td')
    expect(cellule?.style.backgroundColor).toBe('rgb(254, 224, 196)') // orange langue vivante
  })

  test('les noms de jours sont abrégés en version courte pour les petits écrans', () => {
    render(<EdtGrilleLecture creneaux={[c('lundi', '09:00', '10:00', 'Maths')]} />)
    expect(screen.getByText('Lundi')).toBeDefined()
    expect(screen.getByText('Lun')).toBeDefined()
  })

  test('sans créneau, la grille ne rend rien plutôt qu\'un tableau vide', () => {
    const { container } = render(<EdtGrilleLecture creneaux={[]} />)
    expect(container.querySelector('table')).toBeNull()
  })

  test('seuls les jours réellement présents ont une colonne', () => {
    render(<EdtGrilleLecture creneaux={[
      c('lundi', '09:00', '10:00', 'Maths'),
      c('jeudi', '09:00', '10:00', 'Maths'),
    ]} />)
    // Colonne horaires + lundi + jeudi, pas de mardi ni vendredi.
    expect(document.querySelectorAll('thead th')).toHaveLength(3)
    expect(screen.queryByText('Mardi')).toBeNull()
  })
})
