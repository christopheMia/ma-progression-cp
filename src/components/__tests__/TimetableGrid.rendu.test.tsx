/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import TimetableGrid, { type Creneau } from '../TimetableGrid'

const c = (
  jour: string, heure_debut: string, heure_fin: string, matiere: string,
  extra: Partial<Creneau> = {},
): Creneau => ({
  jour, heure_debut, heure_fin, matiere,
  couleur: null, couleur_texte: null,
  texte_gras: false, texte_italique: false, texte_souligne: false,
  type: 'cours', visible_journal: true,
  ...extra,
})

/** Le cas signalé par Christophe : lundi pose 30 min, mardi découpe en 3 x 10. */
const CAS_11H: Creneau[] = [
  c('lundi', '11:00', '11:30', 'Calcul mental'),
  c('mardi', '11:00', '11:10', 'Calcul mental'),
  c('mardi', '11:10', '11:20', 'Musique'),
  c('mardi', '11:20', '11:30', 'Mathématiques'),
]

function poser(creneaux: Creneau[]) {
  return render(
    <TimetableGrid initial={creneaux} onSave={() => {}} saving={false} finishLabel="Enregistrer" />,
  )
}

const lignesDuCorps = (): HTMLTableRowElement[] =>
  Array.from(document.querySelectorAll('tbody tr'))

describe('TimetableGrid : rendu de la grille fusionnée', () => {
  test('la grille editable tient dans la largeur comme la grille de lecture', () => {
    const { container } = poser(CAS_11H)
    const table = container.querySelector('table')
    expect(table?.className).toContain('table-fixed')
    expect(table?.parentElement?.className).not.toContain('overflow-x-auto')
    expect(screen.getByText('Lun')).toBeTruthy()
  })

  test('la séance longue est rendue une seule fois, sur toute sa hauteur', () => {
    poser(CAS_11H)
    // Une seule cellule "Calcul mental" pour le lundi, avec rowSpan=3.
    const cellule = screen.getByLabelText('Lundi 11:00-11:30').closest('td')
    expect(cellule).not.toBeNull()
    expect(cellule?.getAttribute('rowspan')).toBe('3')
  })

  test('les lignes suivent les frontières horaires, pas les couples début-fin', () => {
    poser(CAS_11H)
    // 4 couples distincts existent, mais seulement 3 frontières intermédiaires.
    expect(lignesDuCorps()).toHaveLength(3)
  })

  test('aucune fausse case vide : les lignes couvertes ont une cellule de moins', () => {
    poser(CAS_11H)
    // Ligne 0 : horaires + lundi (fusionné) + mardi = 3 <td>.
    // Lignes 1 et 2 : lundi est couvert par le rowSpan, donc 2 <td>.
    const parLigne = lignesDuCorps().map(tr => tr.querySelectorAll('td').length)
    expect(parLigne).toEqual([3, 2, 2])
  })

  test('une séance courte ne reçoit pas de rowSpan', () => {
    poser(CAS_11H)
    const cellule = screen.getByLabelText('Mardi 11:10-11:20').closest('td')
    expect(cellule?.hasAttribute('rowspan')).toBe(false)
  })

  test('un vrai trou reste une case vide', () => {
    poser([
      c('lundi', '09:00', '09:30', 'Mathématiques'),
      c('mardi', '09:00', '09:30', 'Mathématiques'),
      c('mardi', '09:30', '10:00', 'EPS'),
    ])
    // Lundi n'a rien de 9h30 à 10h : la case existe et son menu est vide.
    const vide = screen.getByLabelText('Lundi 09:30-10:00') as HTMLSelectElement
    expect(vide.value).toBe('')
  })

  test('les horaires s\'éditent sur la séance, plus sur la ligne', () => {
    poser(CAS_11H)
    // La colonne de gauche n'a plus de champ horaire : elle affiche les bornes.
    const colonneGauche = lignesDuCorps()[0].querySelector('td')
    expect(colonneGauche?.querySelector('input[type="time"]')).toBeNull()
    expect(colonneGauche?.textContent).toContain('11:00')
    expect(colonneGauche?.textContent).toContain('11:10')
  })

  test('la palette colore une matière qui n\'avait aucune couleur enregistrée', () => {
    poser([c('lundi', '14:00', '15:00', 'Sciences et technologie')])
    const cellule = screen.getByLabelText('Lundi 14:00-15:00').closest('td')
    // Vert de la famille « questionner le monde », appliqué au rendu.
    expect(cellule?.style.backgroundColor).toBe('rgb(213, 240, 220)')
  })

  test('une couleur choisie à la main l\'emporte sur la palette', () => {
    poser([c('lundi', '14:00', '15:00', 'Mathématiques', { couleur: '#ff0000' })])
    const cellule = screen.getByLabelText('Lundi 14:00-15:00').closest('td')
    expect(cellule?.style.backgroundColor).toBe('rgb(255, 0, 0)')
  })

  // Retour de Christophe du 29/07 : la fonction existait, mais derriere un
  // pinceau dont le libelle n'apparaissait qu'au survol. Sur telephone, pas de
  // survol : elle etait invisible.
  test('propose en clair d’appliquer le style à toutes les cases de la matière', () => {
    poser(CAS_11H)
    fireEvent.click(screen.getByLabelText(/mise en forme lundi 11:00/i))

    const nom = /mettre les 2 « calcul mental » comme ça/i
    expect(screen.getByRole('button', { name: nom })).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/couleur du fond lundi 11:00/i), {
      target: { value: '#ff0000' },
    })
    fireEvent.click(screen.getByRole('button', { name: nom }))

    // Les deux cases « Calcul mental » portent la couleur, et elles seules.
    const rouges = Array.from(document.querySelectorAll('td'))
      .filter(td => td.style.backgroundColor === 'rgb(255, 0, 0)')
    expect(rouges).toHaveLength(2)
    expect(screen.getByRole('status').textContent)
      .toMatch(/2 cases « Calcul mental » mises comme ça/i)
  })

  // Retour de Christophe du 26/07, point 2.3 : le panneau de mise en forme ne
  // se fermait qu'en recliquant le crayon, une cible de 10 px en haut de la
  // case. Deux sorties explicites plutôt qu'un geste à deviner.
  describe('fermeture du panneau de mise en forme', () => {
    const ouvrirPanneau = () => {
      poser(CAS_11H)
      fireEvent.click(screen.getByLabelText(/mise en forme lundi 11:00/i))
      expect(screen.getByRole('button', { name: 'Terminé' })).toBeTruthy()
    }

    test('le bouton « Terminé » referme le panneau', () => {
      ouvrirPanneau()
      fireEvent.click(screen.getByRole('button', { name: 'Terminé' }))
      expect(screen.queryByRole('button', { name: 'Terminé' })).toBeNull()
    })

    test('la touche Échap referme le panneau', () => {
      ouvrirPanneau()
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.queryByRole('button', { name: 'Terminé' })).toBeNull()
    })

    test('le crayon indique si le panneau est ouvert', () => {
      poser(CAS_11H)
      const crayon = screen.getByLabelText(/mise en forme lundi 11:00/i)
      expect(crayon.getAttribute('aria-expanded')).toBe('false')
      fireEvent.click(crayon)
      expect(crayon.getAttribute('aria-expanded')).toBe('true')
      fireEvent.click(screen.getByRole('button', { name: 'Terminé' }))
      expect(crayon.getAttribute('aria-expanded')).toBe('false')
    })
  })

  test('corrige une édition non conforme avant de l’enregistrer', () => {
    const onSave = jest.fn()
    render(
      <TimetableGrid
        initial={[
          c('lundi', '09:00', '10:00', 'Arts visuels'),
          c('lundi', '14:00', '15:00', 'Mathématiques'),
        ]}
        onSave={onSave}
        saving={false}
        finishLabel="Enregistrer"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        matiere: 'Arts visuels',
        heure_debut: '14:00',
        heure_fin: '15:00',
      }),
      expect.objectContaining({
        matiere: 'Mathématiques',
        heure_debut: '09:00',
        heure_fin: '10:00',
      }),
    ]))
    expect(screen.getByRole('status').textContent).toMatch(/remise.*le matin/)
  })

  test('bloque une édition impossible à corriger sans découper une séance', () => {
    const onSave = jest.fn()
    render(
      <TimetableGrid
        initial={[
          c('lundi', '09:00', '09:30', 'Arts visuels'),
          c('lundi', '14:00', '15:00', 'Vocabulaire'),
        ]}
        onSave={onSave}
        saving={false}
        finishLabel="Enregistrer"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/Vocabulaire/)
    expect(screen.getByRole('alert').textContent).toMatch(/matin/)
  })
})
