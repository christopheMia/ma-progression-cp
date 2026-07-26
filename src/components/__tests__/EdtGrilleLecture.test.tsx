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

  test('le nom de la matière porte sa propre couleur, sans dépendre de l’héritage', () => {
    // Retour du 26/07 : la grille en lecture ne posait aucune couleur de texte,
    // donc elle héritait de celle du <body>. Sur un poste réglé en mode sombre,
    // le libellé passait en blanc sur fond pastel : illisible.
    render(<EdtGrilleLecture creneaux={[c('lundi', '09:00', '10:00', 'Maths')]} />)
    const libelle = screen.getByText('Maths')
    expect(libelle.className).toMatch(/text-slate-900/)
  })

  test('la couleur de texte choisie par l’enseignante l’emporte', () => {
    render(<EdtGrilleLecture creneaux={[
      c('lundi', '09:00', '10:00', 'Maths', { couleur_texte: '#b91c1c' }),
    ]} />)
    expect(screen.getByText('Maths').style.color).toBe('rgb(185, 28, 28)')
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
