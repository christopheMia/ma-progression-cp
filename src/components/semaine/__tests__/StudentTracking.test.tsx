/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentTracking from '../StudentTracking'
import {
  ajouterCritereObservation,
  definirNiveauCritere,
  modifierCritereObservation,
  supprimerCritereObservation,
} from '@/lib/actions/criteres-observation'
import { definirNiveauNotion } from '@/lib/actions/semaine'
import type {
  Acquisition,
  AcquisitionCritere,
  CritereObservation,
  Eleve,
  Semaine,
} from '@/types'

jest.mock('@/lib/actions/criteres-observation', () => ({
  ajouterCritereObservation: jest.fn(),
  definirNiveauCritere: jest.fn(),
  modifierCritereObservation: jest.fn(),
  supprimerCritereObservation: jest.fn(),
}))
jest.mock('@/lib/actions/semaine', () => ({
  definirNiveauNotion: jest.fn(),
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
    niveau: 'atteint',
    acquis: true,
  },
  // Sans `niveau` : une ligne ecrite avant la migration 019. L'ecran doit la
  // relire par l'ancien booleen plutot que de l'afficher vierge.
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
  { critere_id: 'critere-1', eleve_id: 'eleve-1', niveau: 'atteint', acquis: true },
  { critere_id: 'critere-1', eleve_id: 'eleve-2', niveau: 'partiellement', acquis: false },
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
    // Les actions renvoient un resultat, elles ne levent plus : en production
    // Next.js efface le texte d'une erreur levee dans une action serveur.
    ;(definirNiveauNotion as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(definirNiveauCritere as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(supprimerCritereObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
  })

  test('rend lisibles le suivi historique et le niveau de chaque critère', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    expect(screen.getByRole('radio', {
      name: /lina, lire a, notion dans son ensemble : atteint/i,
    }).getAttribute('aria-checked')).toBe('true')
    // Ligne sans `niveau`, relue par l'ancien booleen `acquis: false`.
    expect(screen.getByRole('radio', {
      name: /tom, lire a, notion dans son ensemble : non atteint/i,
    }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', {
      name: /lina, lire a, repère le son dans un mot : atteint/i,
    }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', {
      name: /tom, lire a, repère le son dans un mot : partiellement atteint/i,
    }).getAttribute('aria-checked')).toBe('true')

    await user.click(screen.getByRole('radio', {
      name: /tom, lire a, repère le son dans un mot : dépassé/i,
    }))
    await waitFor(() => expect(definirNiveauCritere).toHaveBeenCalledWith(
      'critere-1',
      'eleve-2',
      'depasse',
    ))
  })

  // Decision de Christophe du 2026-07-27 : le suivi quitte le binaire pour
  // l'echelle du livret, pour n'avoir aucune conversion a inventer au bilan.
  test('propose les quatre niveaux du livret, abrégés, avec leur légende', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    const groupe = screen.getByRole('radiogroup', {
      name: /lina, lire a, notion dans son ensemble/i,
    })
    expect(within(groupe).getAllByRole('radio')).toHaveLength(4)
    expect(within(groupe).getAllByRole('radio').map(b => b.textContent))
      .toEqual(['NA', 'PA', 'A', 'D'])

    // La legende dit ce que valent les abreviations, une fois pour l'ecran.
    expect(screen.getByText(/partiellement atteint/i)).toBeTruthy()
    expect(screen.getByText(/dépassé/i)).toBeTruthy()
  })

  test('enregistre le niveau choisi sur la notion', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    await user.click(screen.getByRole('radio', {
      name: /tom, lire a, notion dans son ensemble : partiellement atteint/i,
    }))
    await waitFor(() => expect(definirNiveauNotion).toHaveBeenCalledWith(
      'semaine-1',
      'eleve-2',
      'francais',
      'Lire a',
      'partiellement',
    ))
  })

  test('remet le niveau précédent quand le serveur refuse', async () => {
    const user = userEvent.setup()
    ;(definirNiveauCritere as jest.Mock).mockResolvedValue({
      ok: false,
      message: 'Le suivi de ce critère n’a pas pu être enregistré.',
    })
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    await user.click(screen.getByRole('radio', {
      name: /lina, lire a, repère le son dans un mot : non atteint/i,
    }))

    expect(await screen.findByText(/n’a pas pu être enregistré/i)).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('radio', {
      name: /lina, lire a, repère le son dans un mot : atteint/i,
    }).getAttribute('aria-checked')).toBe('true'))
  })

  // L'echelle se parcourt aussi au clavier : c'est ce qu'un `radiogroup`
  // promet, et 23 eleves fois plusieurs criteres se saisissent plus vite ainsi.
  test('déplace le niveau avec les flèches du clavier', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    const choisi = screen.getByRole('radio', {
      name: /lina, lire a, repère le son dans un mot : atteint/i,
    })
    choisi.focus()
    await user.keyboard('{ArrowRight}')

    await waitFor(() => expect(definirNiveauCritere).toHaveBeenCalledWith(
      'critere-1',
      'eleve-1',
      'depasse',
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
    ;(ajouterCritereObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: ajoute })
    ;(modifierCritereObservation as jest.Mock).mockResolvedValue({
      ok: true,
      valeur: { ...critere, libelle: 'Identifie le son entendu' },
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

  // Demande de Christophe du 2026-07-27 : une vue simplifiee de toute la classe,
  // cliquable eleve par eleve. L'ecran etant organise par notion, il fallait
  // parcourir les 23 eleves pour savoir ou en est la classe.
  test('affiche la vue d’ensemble de la classe avec une ligne par élève', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    expect(screen.getByRole('heading', { name: /ma classe d’un coup d’œil/i })).toBeTruthy()
    // Lina a le critere acquis, Tom ne l'a pas : 1/1 contre 0/1.
    expect(screen.getByRole('button', { name: /▸ Lina/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /▸ Tom/ })).toBeTruthy()
    expect(screen.getByText(/lina, lire a : tout atteint/i)).toBeTruthy()
    // Tom est partiellement atteint : en chemin, pas en echec. C'est tout
    // l'apport des quatre niveaux, le binaire le rangeait avec « rien atteint ».
    expect(screen.getByText(/tom, lire a : en cours/i)).toBeTruthy()
  })

  test('déplie le détail d’un élève au clic, puis le referme', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    const ligneLina = screen.getByRole('button', { name: /▸ Lina/ })
    expect(ligneLina.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText(/détail de lina/i)).toBeNull()

    await user.click(ligneLina)
    expect(await screen.findByText(/détail de lina/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /▾ Lina/ }).getAttribute('aria-expanded')).toBe('true')

    await user.click(screen.getByRole('button', { name: /▾ Lina/ }))
    expect(screen.queryByText(/détail de lina/i)).toBeNull()
  })

  // Retour de Christophe du 2026-07-27 : « on ne voit pas ce qui est ajouté au
  // final et à quoi ». La notion n'etait nommee que dans un label `sr-only`,
  // donc lisible par un lecteur d'ecran mais invisible a l'oeil.
  test('nomme la notion a l’ecran au-dessus du champ d’ajout', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    expect(screen.getByText(/mes critères d’observation pour/i)).toBeTruthy()

    const etiquette = screen.getByText(/nouveau critère pour/i)
    expect(etiquette.className).not.toContain('sr-only')
    expect(etiquette.textContent).toContain('Lire a')
    expect(screen.getByText(/1 critère pour cette notion/i)).toBeTruthy()
  })

  // Incident du 2026-07-27, vu en production : cliquer « Ajouter ce critère »
  // avec le champ vide partait au serveur, qui LEVAIT « Écris le critère que tu
  // veux observer. ». Next.js efface le texte des erreurs levees en production,
  // donc Christophe lisait le pave « An error occurred in the Server Components
  // render... » a la place du message.
  test('refuse un critère vide sur place, sans appeler le serveur', async () => {
    const user = userEvent.setup()
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    await user.click(screen.getByRole('button', { name: /ajouter ce critère/i }))

    expect(await screen.findByText(/écris le critère que tu veux observer/i)).toBeTruthy()
    expect(ajouterCritereObservation).not.toHaveBeenCalled()
  })

  test('affiche le message renvoyé par le serveur quand l’ajout échoue', async () => {
    const user = userEvent.setup()
    ;(ajouterCritereObservation as jest.Mock).mockResolvedValue({
      ok: false,
      message: 'Ce critère existe déjà pour cette notion.',
    })
    afficherSuivi()
    await user.click(screen.getByRole('button', { name: /suivi des élèves/i }))

    await user.type(screen.getByLabelText(/nouveau critère pour lire a/i), 'Repère le son dans un mot')
    await user.click(screen.getByRole('button', { name: /ajouter ce critère/i }))

    expect(await screen.findByText(/ce critère existe déjà pour cette notion/i)).toBeTruthy()
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
