/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuiviEleves from '../SuiviEleves'
import {
  ajouterObservation,
  definirComportement,
  definirGenre,
  enregistrerBilanPeriode,
  modifierObservation,
  supprimerObservation,
} from '@/lib/actions/suivi-libre'

jest.mock('@/lib/actions/suivi-libre', () => ({
  ajouterObservation: jest.fn(),
  definirComportement: jest.fn(),
  definirGenre: jest.fn(),
  enregistrerBilanPeriode: jest.fn(),
  modifierObservation: jest.fn(),
  supprimerObservation: jest.fn(),
}))

const eleves = [
  { id: 'e1', prenom: 'Lina', genre: 'f' as const },
  { id: 'e2', prenom: 'Tom', genre: null },
]

const semainesPeriode = [
  { id: 's9', numero: 9 },
  { id: 's10', numero: 10 },
  { id: 's11', numero: 11 },
]

function afficher(surcharges: Record<string, unknown> = {}) {
  render(
    <SuiviEleves
      semaineId="s10"
      numeroSemaine={10}
      periode={2}
      dateParDefaut="2026-11-24"
      eleves={eleves}
      semainesPeriode={semainesPeriode}
      comportements={{ 'e1|s9': 'bien', 'e1|s10': 'attention' }}
      observations={[{
        id: 'o1', eleveId: 'e1', semaineId: 's10',
        observeeLe: '2026-11-25', texte: 'A osé lire devant le groupe.',
      }]}
      bilans={{}}
      {...surcharges}
    />,
  )
}

describe('SuiviEleves', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(definirComportement as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(ajouterObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: 'o2' })
    ;(modifierObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(supprimerObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(definirGenre as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(enregistrerBilanPeriode as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
  })

  test('reprend le comportement déjà noté pour la semaine', () => {
    afficher()
    expect(screen.getByRole('radio', {
      name: /lina, semaine 10 : à surveiller/i,
    }).getAttribute('aria-checked')).toBe('true')
  })

  test('enregistre le comportement choisi', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('radio', { name: /lina, semaine 10 : ça va bien/i }))
    await waitFor(() => expect(definirComportement).toHaveBeenCalledWith('e1', 's10', 'bien'))
  })

  // « Rien de note » doit rester atteignable : on se trompe de bouton, et une
  // semaine sans avis n'est pas une semaine difficile.
  test('recliquer le même état l’enlève', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('radio', { name: /lina, semaine 10 : à surveiller/i }))
    await waitFor(() => expect(definirComportement).toHaveBeenCalledWith('e1', 's10', null))
  })

  test('résume la période sans compter les semaines vides', () => {
    afficher()
    // Une semaine « bien », une « à surveiller », une sans rien.
    expect(screen.getByText(/1 semaine qui s’est bien passée, 1 à surveiller/i)).toBeTruthy()
  })

  // Une semaine « bien » et une « à surveiller » : le bien ne domine pas, mais
  // il ne s'efface pas non plus.
  test('propose une posture pour le bilan, tirée de la frise', () => {
    afficher()
    const resume = screen.getByText(/1 semaine qui s’est bien passée/i)
    expect(resume.textContent)
      .toMatch(/Lina a globalement bien travaillé, avec quelques semaines plus fragiles/i)
  })

  test('ne propose aucune posture quand rien n’est noté', () => {
    afficher({ comportements: {} })
    expect(screen.queryByText(/proposé pour le bilan/i)).toBeNull()
  })

  test('ajoute une observation à la date choisie', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('button', { name: /ajouter une observation/i }))
    await waitFor(() => expect(ajouterObservation).toHaveBeenCalledWith('e1', 's10', '2026-11-24'))
    expect(screen.getAllByLabelText(/^observation du/i)).toHaveLength(2)
  })

  test('enregistre le texte d’une observation', async () => {
    const user = userEvent.setup()
    afficher()

    await user.type(screen.getByLabelText(/^observation du 25\/11\/2026/i), ' Beau progrès.')
    // L'enregistrement part APRES la frappe (600 ms), pas a chaque lettre.
    await waitFor(() => expect(modifierObservation).toHaveBeenCalledWith(
      'o1', expect.stringContaining('Beau progrès.'), '2026-11-25',
    ), { timeout: 3000 })
    // Une seule ecriture pour toute la phrase, pas une par caractere.
    expect((modifierObservation as jest.Mock).mock.calls).toHaveLength(1)
  })

  test('retire une observation', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('button', { name: /retirer l’observation du 25\/11\/2026/i }))
    await waitFor(() => expect(supprimerObservation).toHaveBeenCalledWith('o1'))
    expect(screen.getByText(/rien d’écrit pour l’instant/i)).toBeTruthy()
  })

  test('change d’élève et ne montre que ses observations', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('button', { name: /tom →/i }))
    expect(screen.getByText(/mes observations sur tom/i)).toBeTruthy()
    expect(screen.getByText(/rien d’écrit pour l’instant/i)).toBeTruthy()
  })

  test('remet l’état d’avant quand le serveur refuse', async () => {
    const user = userEvent.setup()
    ;(definirComportement as jest.Mock).mockResolvedValue({
      ok: false, message: 'Le choix n’a pas pu être enregistré.',
    })
    afficher()

    await user.click(screen.getByRole('radio', { name: /lina, semaine 10 : ça va bien/i }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/n’a pas pu être enregistré/i)
    await waitFor(() => expect(screen.getByRole('radio', {
      name: /lina, semaine 10 : à surveiller/i,
    }).getAttribute('aria-checked')).toBe('true'))
  })

  // Retour de Christophe du 29/07 : les titres se lisaient comme des
  // etiquettes techniques, et deux lettres F et G ne disent pas a quoi elles
  // servent.
  test('chaque bloc porte un vrai titre', () => {
    afficher()
    for (const titre of [
      /comment s’est passée la semaine 10/i,
      /la période d’un coup d’œil/i,
      /bilan de la période 2/i,
      /mes observations sur lina/i,
    ]) {
      expect(screen.getByRole('heading', { name: titre })).toBeTruthy()
    }
  })

  test('dit en clair à quoi servent les boutons F et G', () => {
    afficher()
    expect(screen.getByText(/fille ou garçon \?/i)).toBeTruthy()
  })

  test('la frise dit chaque semaine, y compris celles sans rien', () => {
    afficher()
    const frise = screen.getByText(/la période d’un coup d’œil/i).parentElement!
    expect(within(frise).getByText(/semaine 9 : ça va bien/i)).toBeTruthy()
    expect(within(frise).getByText(/semaine 11 : rien de noté/i)).toBeTruthy()
  })
})

// Remarque de Christophe du 28/07 : « en fin de periode il risque d'y avoir une
// tonne de notes », et « on doit pouvoir naviguer par periode et par mois pour
// retrouver des faits ».
describe('SuiviEleves, retrouver une observation', () => {
  const semainesClasse = [
    { id: 's4', numero: 4, periode: 1 },
    { id: 's9', numero: 9, periode: 2 },
    { id: 's10', numero: 10, periode: 2 },
    { id: 's11', numero: 11, periode: 2 },
  ]

  const troisNotes = [
    { id: 'o1', eleveId: 'e1', semaineId: 's10', observeeLe: '2026-11-25', texte: 'A osé lire devant le groupe.' },
    { id: 'o2', eleveId: 'e1', semaineId: 's9', observeeLe: '2026-11-17', texte: 'Colère à la récréation.' },
    { id: 'o3', eleveId: 'e1', semaineId: 's4', observeeLe: '2026-09-22', texte: 'Bon début en calcul.' },
  ]

  function afficherAvecHistorique(surcharges: Record<string, unknown> = {}) {
    afficher({ semainesClasse, observations: troisNotes, ...surcharges })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(enregistrerBilanPeriode as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
  })

  test('ne montre que la semaine ouverte par défaut', () => {
    afficherAvecHistorique()
    expect(screen.getByLabelText(/^observation du 25\/11\/2026/i)).toBeTruthy()
    expect(screen.queryByLabelText(/^observation du 17\/11\/2026/i)).toBeNull()
    expect(screen.queryByLabelText(/^observation du 22\/09\/2026/i)).toBeNull()
  })

  test('compte ce que chaque tranche contient', () => {
    afficherAvecHistorique()
    const choix = screen.getByLabelText(/quelles observations afficher/i)
    expect(choix.textContent).toMatch(/Cette semaine \(S10\) · 1/)
    expect(choix.textContent).toMatch(/Période 2 · 2/)
    expect(choix.textContent).toMatch(/Période 1 · 1/)
    expect(choix.textContent).toMatch(/Toute l’année · 3/)
  })

  test('retrouve une note d’une autre période, étiquetée de sa semaine', async () => {
    const user = userEvent.setup()
    afficherAvecHistorique()

    await user.selectOptions(screen.getByLabelText(/quelles observations afficher/i), 'periode:1')
    expect(screen.getByLabelText(/^observation du 22\/09\/2026/i)).toBeTruthy()
    expect(screen.getByText('S4 · P1')).toBeTruthy()
    expect(screen.queryByLabelText(/^observation du 25\/11\/2026/i)).toBeNull()
  })

  test('cherche un mot dans les observations', async () => {
    const user = userEvent.setup()
    afficherAvecHistorique()

    await user.selectOptions(screen.getByLabelText(/quelles observations afficher/i), 'annee')
    await user.type(screen.getByLabelText(/retrouver un mot/i), 'colère')

    expect(screen.getByLabelText(/^observation du 17\/11\/2026/i)).toBeTruthy()
    expect(screen.queryByLabelText(/^observation du 25\/11\/2026/i)).toBeNull()
  })

  test('le dit quand la recherche ne donne rien', async () => {
    const user = userEvent.setup()
    afficherAvecHistorique()
    await user.type(screen.getByLabelText(/retrouver un mot/i), 'piscine')
    expect(screen.getByText(/aucune observation avec « piscine »/i)).toBeTruthy()
  })

  // L'ecran peut montrer toute l'annee, le bilan ne bilante qu'une periode.
  test('le bilan ne prend que les notes de la période, jamais celles d’avant', async () => {
    const user = userEvent.setup()
    afficherAvecHistorique({ comportements: {} })

    await user.click(screen.getByRole('button', { name: /faire le bilan de la période/i }))
    await waitFor(() => expect(enregistrerBilanPeriode).toHaveBeenCalledWith(
      'e1', 2, 'Colère à la récréation. A osé lire devant le groupe.', [],
    ))
  })
})

// Demande de Christophe du 28/07 : le bouton bilan vit dans le suivi de chaque
// eleve, pas dans le livret.
describe('SuiviEleves, le bilan de la période', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(definirGenre as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(enregistrerBilanPeriode as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
  })

  test('assemble ses briques depuis la frise et les observations', () => {
    afficher()
    // La posture apparait deux fois : annoncee sous la frise, et comme brique.
    expect(screen.getAllByText(/a globalement bien travaillé, avec quelques semaines plus fragiles/i))
      .toHaveLength(2)
    // L'observation apparait dans sa zone de saisie et comme brique du bilan.
    expect(screen.getAllByText('A osé lire devant le groupe.')).toHaveLength(2)
    expect(screen.getByText(/le 25\/11\/2026/i)).toBeTruthy()
  })

  test('rédige, en employant le pronom du genre renseigné', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('button', { name: /faire le bilan de la période/i }))
    await waitFor(() => expect(enregistrerBilanPeriode).toHaveBeenCalledWith(
      'e1', 2,
      'Lina a globalement bien travaillé, avec quelques semaines plus fragiles. '
      + 'A osé lire devant le groupe.',
      [],
    ))
  })

  test('avertit quand le genre n’est pas renseigné', async () => {
    const user = userEvent.setup()
    afficher()
    await user.click(screen.getByRole('button', { name: /tom →/i }))
    expect(screen.getByText(/dis fille ou garçon en haut/i)).toBeTruthy()
  })

  test('enregistre le genre choisi', async () => {
    const user = userEvent.setup()
    afficher()
    await user.click(screen.getByRole('button', { name: /tom →/i }))
    await user.click(screen.getByRole('radio', { name: /tom : garçon/i }))
    await waitFor(() => expect(definirGenre).toHaveBeenCalledWith('e2', 'm'))
  })

  test('une brique décochée ne part pas dans le texte', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('checkbox', { name: /utiliser : a osé lire devant le groupe/i }))
    await waitFor(() => expect(enregistrerBilanPeriode).toHaveBeenCalledWith(
      'e1', 2, '', expect.arrayContaining([expect.stringMatching(/^obs:/)]),
    ))
  })

  test('le dit quand rien n’a été noté sur la période', async () => {
    const user = userEvent.setup()
    afficher()
    await user.click(screen.getByRole('button', { name: /tom →/i }))
    expect(screen.getByText(/rien de noté sur la période pour tom/i)).toBeTruthy()
  })
})
