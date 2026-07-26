/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SourceImporter from '../SourceImporter'
import { calculerEmpreinteSource } from '@/lib/progression-sources'
import { extractPdfText } from '@/lib/ia/pdf-client'

jest.mock('@/lib/progression-sources', () => ({
  ...jest.requireActual('@/lib/progression-sources'),
  calculerEmpreinteSource: jest.fn(),
}))

jest.mock('@/lib/ia/pdf-client', () => ({
  extractPdfText: jest.fn(),
}))

const mockCalculerEmpreinte = jest.mocked(calculerEmpreinteSource)
const mockExtractPdfText = jest.mocked(extractPdfText)

const REPONSE_MANUEL = {
  matiere: 'Français',
  nom_methode: "Les P'tites Poules",
  type_document: 'manuel',
  periode_numero: null,
  confiance_detection: 0.62,
  avertissements: ['Le numéro de page 12 est peu lisible.'],
  progression: [{
    numero: 1,
    items: ['Découvrir le son ou'],
    pages: '10-12',
    mots_exemple: ['loup gris'],
  }],
  periodes: [],
}

function reponseJson(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(data),
  } as Response
}

async function analyserTexte(reponse: unknown = REPONSE_MANUEL) {
  jest.mocked(fetch).mockResolvedValueOnce(reponseJson(reponse))
  render(
    <SourceImporter
      prenom="Cécile"
      matiereInitiale="Indice seulement"
      onSourceReady={jest.fn()}
    />,
  )
  fireEvent.change(screen.getByLabelText('Texte du document'), {
    target: { value: 'Un contenu de progression assez long pour être analysé.' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
  await screen.findByRole('status')
}

async function analyserAvecCalage(reponse: unknown, onSourceReady = jest.fn()) {
  jest.mocked(fetch).mockResolvedValueOnce(reponseJson(reponse))
  render(
    <SourceImporter
      prenom="Cécile"
      rentreeDate="2026-09-01"
      zone="A"
      onSourceReady={onSourceReady}
    />,
  )
  fireEvent.change(screen.getByLabelText('Texte du document'), {
    target: { value: 'Un contenu de progression assez long pour être analysé.' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
  await screen.findByRole('status')
  return onSourceReady
}

describe('SourceImporter', () => {
  const cryptoInitial = Object.getOwnPropertyDescriptor(globalThis, 'crypto')

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockCalculerEmpreinte.mockResolvedValue('empreinte-test')
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: jest.fn(() => 'source-test-1') },
    })
  })

  afterAll(() => {
    if (cryptoInitial) Object.defineProperty(globalThis, 'crypto', cryptoInitial)
  })

  test('affiche une première semaine de rentrée vide, datée, sans l’enregistrer', async () => {
    // Le manuel commence en semaine 2 : la semaine 1 est laissée à l'accueil.
    const onSourceReady = await analyserAvecCalage({
      ...REPONSE_MANUEL,
      avertissements: [],
      base_calage: 'numeros',
      progression: [{ numero: 2, items: ['Découvrir le son a'], pages: '', mots_exemple: [] }],
    })

    expect(screen.getByText('Semaine du 31 août')).toBeInTheDocument()
    expect(screen.getByText(/La semaine 1 n’a pas encore de contenu/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))
    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))

    // Stockage compact, mais le numéro 2 est conservé : l'année n'est plus décalée.
    expect(onSourceReady.mock.calls[0][0].semaines).toEqual([
      { numero: 2, items: ['Découvrir le son a'], pages: '', mots_exemple: [] },
    ])
  })

  test('répondre « démarre en semaine 2 » décale la source enregistrée, sans rappeler l’IA', async () => {
    const onSourceReady = await analyserAvecCalage({
      ...REPONSE_MANUEL,
      avertissements: [],
      base_calage: 'ordre',
      progression: [{ numero: 1, items: ['Découvrir le son a'], pages: '', mots_exemple: [] }],
    })

    fireEvent.change(screen.getByLabelText('Ta progression démarre à quelle semaine ?'), {
      target: { value: '2' },
    })

    // Le recalcul est local : aucun second appel réseau.
    expect(jest.mocked(fetch)).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/La semaine 1 n’a pas encore de contenu/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))
    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))

    expect(onSourceReady.mock.calls[0][0].semaines).toEqual([
      { numero: 2, items: ['Découvrir le son a'], pages: '', mots_exemple: [] },
    ])
  })

  test('transmet la date de rentrée à l’API pour qu’elle situe les dates du document', async () => {
    await analyserAvecCalage(REPONSE_MANUEL)

    const form = jest.mocked(fetch).mock.calls[0][1]?.body as FormData
    expect(form.get('rentree_date')).toBe('2026-09-01')
  })

  test('analyse du texte, affiche les métadonnées et crée une source corrigée après le hash', async () => {
    const onSourceReady = jest.fn()
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson(REPONSE_MANUEL))
    render(
      <SourceImporter
        prenom="Cécile"
        matiereInitiale="Français présumé"
        methodeInitiale="Méthode présumée"
        onSourceReady={onSourceReady}
      />,
    )

    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Un contenu de progression assez long pour être analysé.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))

    await screen.findByText('Le numéro de page 12 est peu lisible.')
    expect(screen.getByLabelText('Matière')).toHaveValue('Français')
    expect(screen.getByLabelText('Nom de la méthode')).toHaveValue("Les P'tites Poules")
    expect(screen.getByLabelText('Type de document')).toHaveValue('manuel')

    const form = jest.mocked(fetch).mock.calls[0][1]?.body as FormData
    expect(form.get('matiere')).toBe('Français présumé')
    expect(form.get('prenom')).toBeNull()

    fireEvent.change(screen.getByLabelText('Matière'), {
      target: { value: 'Lecture' },
    })
    fireEvent.change(screen.getByLabelText('Nom de la méthode'), {
      target: { value: 'Méthode corrigée' },
    })
    fireEvent.change(screen.getByLabelText('Notions de la semaine 1'), {
      target: { value: 'Découvrir le son ou\nLire un texte court' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))

    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))
    const source = onSourceReady.mock.calls[0][0]
    expect(source).toEqual(expect.objectContaining({
      clientId: 'source-test-1',
      nomSource: 'Texte collé',
      matiere: 'Lecture',
      nomMethode: 'Méthode corrigée',
      typeDocument: 'manuel',
      periodeNumero: null,
      empreinteContenu: 'empreinte-test',
      periodes: [],
    }))
    expect(source.semaines[0].items).toEqual([
      'Découvrir le son ou',
      'Lire un texte court',
    ])
    expect(Number.isFinite(Date.parse(source.creeLe))).toBe(true)
    expect(mockCalculerEmpreinte).toHaveBeenCalledTimes(1)
    expect(mockCalculerEmpreinte.mock.calls[0][0]).toEqual(expect.objectContaining({
      nomSource: 'Texte collé',
      creeLe: expect.any(String),
    }))
    expect(mockCalculerEmpreinte.mock.calls[0][0]).not.toHaveProperty('clientId')
    expect(mockCalculerEmpreinte.mock.calls[0][0]).not.toHaveProperty('empreinteContenu')
  })

  test("désactive la validation d'une période sans numéro et explique pourquoi", async () => {
    await analyserTexte({
      ...REPONSE_MANUEL,
      type_document: 'periode',
      periode_numero: null,
      confiance_detection: 0.95,
      avertissements: [],
    })

    expect(screen.getByRole('button', { name: 'Ajouter cette source' })).toBeDisabled()
    expect(screen.getByText(/choisis une période entre 1 et 5/i)).toBeTruthy()
  })

  test("garde les périodes brutes d'une programmation jusqu'à la validation", async () => {
    const onSourceReady = jest.fn()
    const periodes = [{
      numero: 2,
      domaines: [{
        nom: 'Espace et géométrie',
        items: ['Reconnaître un carré et un rectangle'],
      }],
    }]
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      type_document: 'programmation',
      periode_numero: null,
      confiance_detection: 0.95,
      avertissements: [],
      progression: [],
      periodes,
    }))
    render(<SourceImporter onSourceReady={onSourceReady} />)

    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Une programmation annuelle complète en mathématiques.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
    await screen.findByDisplayValue('Espace et géométrie')
    const form = jest.mocked(fetch).mock.calls[0][1]?.body as FormData
    expect(form.get('matiere')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))

    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))
    expect(onSourceReady.mock.calls[0][0]).toEqual(expect.objectContaining({
      typeDocument: 'programmation',
      semaines: [],
      periodes,
    }))
  })

  test("bloque une double validation pendant le calcul de l'empreinte", async () => {
    let resoudreEmpreinte: ((valeur: string) => void) | undefined
    mockCalculerEmpreinte.mockImplementationOnce(() => new Promise(resolve => {
      resoudreEmpreinte = resolve
    }))
    const onSourceReady = jest.fn()
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      confiance_detection: 0.95,
      avertissements: [],
    }))
    render(<SourceImporter onSourceReady={onSourceReady} />)

    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Un contenu de progression assez long pour être analysé.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
    const bouton = await screen.findByRole('button', { name: 'Ajouter cette source' })
    fireEvent.click(bouton)
    fireEvent.click(bouton)

    expect(mockCalculerEmpreinte).toHaveBeenCalledTimes(1)
    resoudreEmpreinte?.('empreinte-retardee')
    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))
  })

  test('envoie plusieurs petits PDF bruts et utilise leurs noms comme source', async () => {
    const onSourceReady = jest.fn()
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      confiance_detection: 0.95,
      avertissements: [],
    }))
    render(<SourceImporter onSourceReady={onSourceReady} />)
    const fichiers = [
      new File(['pdf-1'], 'programmation-p1.pdf', { type: 'application/pdf' }),
      new File(['pdf-2'], 'programmation-p2.pdf', { type: 'application/pdf' }),
    ]

    fireEvent.change(screen.getByLabelText('Documents PDF'), {
      target: { files: fichiers },
    })
    await screen.findByRole('status')

    const form = jest.mocked(fetch).mock.calls[0][1]?.body as FormData
    expect(form.getAll('pdf')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))
    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))
    expect(onSourceReady.mock.calls[0][0].nomSource).toBe(
      'programmation-p1.pdf, programmation-p2.pdf',
    )
    expect(mockExtractPdfText).not.toHaveBeenCalled()
  })

  test('extrait dans le navigateur un ensemble de PDF supérieur à 4 Mo', async () => {
    const grosPdf = new File(
      [new Uint8Array(4 * 1024 * 1024 + 1)],
      'gros-document.pdf',
      { type: 'application/pdf' },
    )
    mockExtractPdfText.mockResolvedValueOnce('Texte extrait du gros document PDF.')
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      confiance_detection: 0.95,
      avertissements: [],
    }))
    render(<SourceImporter onSourceReady={jest.fn()} />)

    fireEvent.change(screen.getByLabelText('Documents PDF'), {
      target: { files: [grosPdf] },
    })
    await screen.findByRole('status')

    expect(mockExtractPdfText).toHaveBeenCalledWith(grosPdf)
    const form = jest.mocked(fetch).mock.calls[0][1]?.body as FormData
    expect(form.get('pdf')).toBeNull()
    expect(form.get('texte')).toBe('Texte extrait du gros document PDF.')
  })

  test('refuse plus de 10 PDF avant toute lecture', async () => {
    render(<SourceImporter onSourceReady={jest.fn()} />)
    const fichiers = Array.from({ length: 11 }, (_, index) =>
      new File(['pdf'], `document-${index + 1}.pdf`, { type: 'application/pdf' })
    )

    fireEvent.change(screen.getByLabelText('Documents PDF'), {
      target: { files: fichiers },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/maximum 10 fichiers PDF/i)
    expect(mockExtractPdfText).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('refuse un total supérieur à 25 Mio avant toute lecture', async () => {
    render(<SourceImporter onSourceReady={jest.fn()} />)
    const fichier = {
      name: 'document-trop-lourd.pdf',
      size: 25 * 1024 * 1024 + 1,
    } as File

    fireEvent.change(screen.getByLabelText('Documents PDF'), {
      target: { files: [fichier] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/25 Mio au total/i)
    expect(mockExtractPdfText).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('extrait les gros PDF séquentiellement', async () => {
    let resoudrePremier: ((texte: string) => void) | undefined
    mockExtractPdfText
      .mockImplementationOnce(() => new Promise(resolve => {
        resoudrePremier = resolve
      }))
      .mockResolvedValueOnce('Texte extrait du second document.')
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      confiance_detection: 0.95,
      avertissements: [],
    }))
    render(<SourceImporter onSourceReady={jest.fn()} />)
    const fichiers = [{
      name: 'premier.pdf',
      size: 3 * 1024 * 1024,
    }, {
      name: 'second.pdf',
      size: 2 * 1024 * 1024,
    }] as File[]

    fireEvent.change(screen.getByLabelText('Documents PDF'), {
      target: { files: fichiers },
    })
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalledTimes(1))
    expect(mockExtractPdfText).toHaveBeenCalledWith(fichiers[0])

    await act(async () => {
      resoudrePremier?.('Texte extrait du premier document.')
    })
    await screen.findByRole('status')

    expect(mockExtractPdfText).toHaveBeenCalledTimes(2)
    expect(mockExtractPdfText).toHaveBeenNthCalledWith(2, fichiers[1])
  })

  test('affiche une erreur réseau avec une alerte accessible', async () => {
    jest.mocked(fetch).mockRejectedValueOnce(new Error('connexion interrompue'))
    render(<SourceImporter onSourceReady={jest.fn()} />)

    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Un contenu de progression assez long pour être analysé.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Erreur réseau : connexion interrompue',
    )
  })

  test('annule une requête, ignore sa réponse tardive et ne signale pas AbortError', async () => {
    let terminerRequete: ((response: Response) => void) | undefined
    let signal: AbortSignal | undefined
    jest.mocked(fetch).mockImplementationOnce((_url, init) => {
      signal = init?.signal as AbortSignal
      return new Promise(resolve => {
        terminerRequete = resolve
      })
    })
    const onCancel = jest.fn()
    const onSourceReady = jest.fn()
    render(
      <SourceImporter
        onCancel={onCancel}
        onSourceReady={onSourceReady}
      />,
    )
    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Un contenu de progression assez long pour être analysé.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(signal?.aborted).toBe(true)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()

    await act(async () => {
      terminerRequete?.(reponseJson({
        ...REPONSE_MANUEL,
        confiance_detection: 0.95,
        avertissements: [],
      }))
    })

    expect(screen.queryByLabelText('Type de document')).toBeNull()
    expect(onSourceReady).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('abandonne la requête en cours au démontage', async () => {
    let signal: AbortSignal | undefined
    jest.mocked(fetch).mockImplementationOnce((_url, init) => {
      signal = init?.signal as AbortSignal
      return new Promise(() => {})
    })
    const { unmount } = render(<SourceImporter onSourceReady={jest.fn()} />)
    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Un contenu de progression assez long pour être analysé.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    unmount()

    expect(signal?.aborted).toBe(true)
  })

  test('fige la confirmation après onSourceReady et ne permet aucun second callback', async () => {
    const onCancel = jest.fn()
    const onSourceReady = jest.fn()
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      confiance_detection: 0.95,
      avertissements: [],
    }))
    render(
      <SourceImporter
        onCancel={onCancel}
        onSourceReady={onSourceReady}
      />,
    )
    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Un contenu de progression assez long pour être analysé.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
    const ajouter = await screen.findByRole('button', { name: 'Ajouter cette source' })
    fireEvent.click(ajouter)

    expect(await screen.findByText('Document prêt')).toHaveAttribute('role', 'status')
    expect(onSourceReady).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ajouter cette source' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeEnabled()

    fireEvent.click(ajouter)
    expect(onSourceReady).toHaveBeenCalledTimes(1)
  })

  test('nettoie les lignes seulement au moment de construire la source', async () => {
    const onSourceReady = jest.fn()
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      confiance_detection: 0.95,
      avertissements: [],
    }))
    render(<SourceImporter onSourceReady={onSourceReady} />)
    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Un contenu de progression assez long pour être analysé.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
    await screen.findByLabelText('Notions de la semaine 1')

    fireEvent.change(screen.getByLabelText('Notions de la semaine 1'), {
      target: { value: '  nombres   jusqu’à 10  \n   ' },
    })
    fireEvent.change(screen.getByLabelText('Mots exemples de la semaine 1'), {
      target: { value: '  dix   objets  \n' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))

    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))
    expect(onSourceReady.mock.calls[0][0].semaines[0]).toEqual({
      numero: 1,
      items: ['nombres jusqu’à 10'],
      pages: '10-12',
      mots_exemple: ['dix objets'],
    })
  })

  test('restructure un manuel en programmation puis restaure chaque brouillon', async () => {
    const onSourceReady = jest.fn()
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      confiance_detection: 0.95,
      avertissements: [],
    }))
    render(<SourceImporter onSourceReady={onSourceReady} />)
    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Un manuel complet avec une progression hebdomadaire.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
    await screen.findByLabelText('Type de document')

    fireEvent.change(screen.getByLabelText('Type de document'), {
      target: { value: 'programmation' },
    })
    expect(await screen.findByText(
      'Le document doit être restructuré dans ce format. Ajoute les périodes/domaines',
    )).toHaveAttribute('role', 'status')
    expect(screen.getByRole('button', { name: 'Ajouter cette source' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une période' }))
    fireEvent.click(screen.getByRole('button', {
      name: 'Ajouter un domaine à la période 1',
    }))
    fireEvent.change(screen.getByLabelText('Nom du domaine 1 de la période 1'), {
      target: { value: 'Nombres et calcul' },
    })
    fireEvent.change(screen.getByLabelText('Notions du domaine 1 de la période 1'), {
      target: { value: 'Comparer deux collections' },
    })
    expect(screen.getByRole('button', { name: 'Ajouter cette source' })).toBeEnabled()

    fireEvent.change(screen.getByLabelText('Type de document'), {
      target: { value: 'manuel' },
    })
    expect(screen.getByLabelText('Notions de la semaine 1')).toHaveValue(
      'Découvrir le son ou',
    )
    fireEvent.change(screen.getByLabelText('Type de document'), {
      target: { value: 'programmation' },
    })
    expect(screen.getByLabelText('Nom du domaine 1 de la période 1')).toHaveValue(
      'Nombres et calcul',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))
    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))
    expect(onSourceReady.mock.calls[0][0]).toEqual(expect.objectContaining({
      typeDocument: 'programmation',
      semaines: [],
      periodes: [{
        numero: 1,
        domaines: [{
          nom: 'Nombres et calcul',
          items: ['Comparer deux collections'],
        }],
      }],
    }))
  })

  test('restructure une programmation en période avec une semaine et son numéro', async () => {
    const onSourceReady = jest.fn()
    const periodesInitiales = [{
      numero: 2,
      domaines: [{
        nom: 'Grandeurs et mesures',
        items: ['Comparer des longueurs'],
      }],
    }]
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      type_document: 'programmation',
      periode_numero: null,
      confiance_detection: 0.95,
      avertissements: [],
      progression: [],
      periodes: periodesInitiales,
    }))
    render(<SourceImporter onSourceReady={onSourceReady} />)
    fireEvent.change(screen.getByLabelText('Texte du document'), {
      target: { value: 'Une programmation annuelle complète en mathématiques.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le document' }))
    await screen.findByLabelText('Type de document')

    fireEvent.change(screen.getByLabelText('Type de document'), {
      target: { value: 'periode' },
    })
    expect(await screen.findByText(
      'Le document doit être restructuré dans ce format. Ajoute les semaines',
    )).toHaveAttribute('role', 'status')
    fireEvent.change(screen.getByLabelText('Période'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une semaine' }))
    fireEvent.change(screen.getByLabelText('Notions de la semaine 1'), {
      target: { value: 'Mesurer une longueur avec une unité' },
    })
    expect(screen.getByRole('button', { name: 'Ajouter cette source' })).toBeEnabled()

    fireEvent.change(screen.getByLabelText('Type de document'), {
      target: { value: 'programmation' },
    })
    expect(screen.getByLabelText('Nom du domaine 1 de la période 2')).toHaveValue(
      'Grandeurs et mesures',
    )
    fireEvent.change(screen.getByLabelText('Type de document'), {
      target: { value: 'periode' },
    })
    expect(screen.getByLabelText('Notions de la semaine 1')).toHaveValue(
      'Mesurer une longueur avec une unité',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))
    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))
    expect(onSourceReady.mock.calls[0][0]).toEqual(expect.objectContaining({
      typeDocument: 'periode',
      periodeNumero: 2,
      semaines: [{
        numero: 1,
        items: ['Mesurer une longueur avec une unité'],
        pages: '',
        mots_exemple: [],
      }],
      periodes: [],
    }))
  })
})
