/**
 * @jest-environment jsdom
 */
import fs from 'node:fs'
import path from 'node:path'
import { fireEvent, render } from '@testing-library/react'
import '@testing-library/jest-dom'
import AncreAuChargement, {
  MemoireAncre,
  reinitialiserPourTests,
} from '../AncreAuChargement'

/** jsdom n'implemente ni scrollIntoView ni requestAnimationFrame utilement. */
function preparerCible(id: string) {
  const cible = document.createElement('section')
  cible.id = id
  const vu = jest.fn()
  cible.scrollIntoView = vu
  document.body.appendChild(cible)
  return vu
}

function noterAncre(chemin: string, ancre: string, t = Date.now()) {
  window.sessionStorage.setItem('aios.ancre', JSON.stringify({ chemin, ancre, t }))
}

describe('AncreAuChargement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/')
    reinitialiserPourTests()
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0)
      return 1
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('consomme la note du clic et defile vers la section', () => {
    const vu = preparerCible('eleves')
    window.history.replaceState({}, '', '/parametres')
    noterAncre('/parametres', 'eleves')

    render(<AncreAuChargement />)

    expect(vu).toHaveBeenCalledWith({ block: 'start' })
    // La note est a usage unique : un retour ulterieur ne doit pas la rejouer.
    expect(window.sessionStorage.getItem('aios.ancre')).toBeNull()
  })

  test("ignore une note destinee a une autre page (navigation detournee)", () => {
    const vu = preparerCible('eleves')
    window.history.replaceState({}, '', '/planning')
    noterAncre('/parametres', 'eleves')

    render(<AncreAuChargement />)

    expect(vu).not.toHaveBeenCalled()
  })

  test('ignore une note trop vieille pour etre une navigation en cours', () => {
    const vu = preparerCible('eleves')
    window.history.replaceState({}, '', '/parametres')
    noterAncre('/parametres', 'eleves', Date.now() - 60_000)

    render(<AncreAuChargement />)

    expect(vu).not.toHaveBeenCalled()
  })

  test("lit l'URL au premier montage apres un vrai chargement (F5, lien externe)", () => {
    const vu = preparerCible('suivi')
    window.history.replaceState({}, '', '/semaine/x#suivi')

    render(<AncreAuChargement />)

    expect(vu).toHaveBeenCalledWith({ block: 'start' })
  })

  /**
   * LE bug vu deux fois par Christophe le 30/07 : sur une navigation interne,
   * window.location peut encore porter le hash de la visite PRECEDENTE. La
   * carte « Prochaine semaine » (lien sans ancre) atterrissait sur le suivi.
   * Sur une navigation interne (pas le premier montage), l'URL ne fait pas foi :
   * seule la note du clic compte, et un lien sans ancre n'en laisse aucune.
   */
  test('ne rejoue jamais un hash present dans l URL lors d une navigation interne', () => {
    const vu = preparerCible('suivi')
    const premiere = render(<AncreAuChargement />) // premiere page apres chargement
    premiere.unmount()

    window.history.replaceState({}, '', '/semaine/x#suivi') // hash perime qui traine

    render(<AncreAuChargement />) // navigation interne, sans note de clic

    expect(vu).not.toHaveBeenCalled()
  })

  test('ne fait rien sans note ni ancre dans l URL', () => {
    const vu = preparerCible('eleves')

    render(<AncreAuChargement />)

    expect(vu).not.toHaveBeenCalled()
  })
})

describe('MemoireAncre', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/accueil')
  })

  function lireNote(): { chemin: string; ancre: string } | null {
    const brut = window.sessionStorage.getItem('aios.ancre')
    if (!brut) return null
    const memo = JSON.parse(brut)
    return { chemin: memo.chemin, ancre: memo.ancre }
  }

  test("note le clic sur un lien interne porteur d'ancre", () => {
    render(
      <>
        <MemoireAncre />
        <a href="/parametres#eleves">Mes élèves</a>
      </>,
    )

    fireEvent.click(document.querySelector('a')!)

    expect(lireNote()).toEqual({ chemin: '/parametres', ancre: 'eleves' })
  })

  test('note aussi le clic sur un element A L INTERIEUR du lien (icone, texte)', () => {
    render(
      <>
        <MemoireAncre />
        <a href="/semaine/x#suivi"><span>Suivi des élèves</span></a>
      </>,
    )

    fireEvent.click(document.querySelector('span')!)

    expect(lireNote()).toEqual({ chemin: '/semaine/x', ancre: 'suivi' })
  })

  test('ne note rien pour un lien sans ancre ou externe', () => {
    render(
      <>
        <MemoireAncre />
        <a href="/planning">Planning</a>
        <a href="https://exemple.fr/page#section">Ailleurs</a>
      </>,
    )

    for (const lien of Array.from(document.querySelectorAll('a'))) {
      fireEvent.click(lien)
    }

    expect(lireNote()).toBeNull()
  })
})

/**
 * Une ancre morte est invisible : le lien marche, on atterrit juste au mauvais
 * endroit. Ce test relie chaque lien a sa cible pour que ca ne puisse plus
 * arriver en silence.
 */
describe('les liens à ancre désignent tous une section existante', () => {
  const racine = path.join(process.cwd(), 'src')

  function fichiers(dossier: string): string[] {
    return fs.readdirSync(dossier, { withFileTypes: true }).flatMap(entree => {
      const complet = path.join(dossier, entree.name)
      if (entree.isDirectory()) return fichiers(complet)
      return entree.name.endsWith('.tsx') && !entree.name.includes('.test.')
        ? [complet]
        : []
    })
  }

  const sources = new Map(fichiers(racine).map(f => [f, fs.readFileSync(f, 'utf8')]))
  const tousLesIds = new Set(
    [...sources.values()].flatMap(source =>
      [...source.matchAll(/\bid="([\w-]+)"/g)].map(m => m[1]),
    ),
  )

  // Toute route ecrite en dur qui porte une ancre, guillemets simples, doubles
  // ou gabarit (`/semaine/${id}#suivi`).
  const liens = [...sources.values()].flatMap(source =>
    [...source.matchAll(/['"`]\/[^'"`\s]*#([\w-]+)['"`]/g)].map(m => m[1]),
  )

  test('au moins les ancres connues sont couvertes', () => {
    expect(liens).toEqual(expect.arrayContaining(['eleves', 'edt', 'methodes', 'credit-ia', 'suivi']))
  })

  test.each([...new Set(liens)])('l’ancre #%s existe quelque part', ancre => {
    expect(tousLesIds).toContain(ancre)
  })
})

/**
 * Le dispositif ne marche que si ses deux moities sont montees : la memoire de
 * clic dans le layout, et le rejoueur dans chaque page a squelette de
 * chargement (`loading.tsx`) qui porte des sections a ancre.
 */
describe('les deux moities du dispositif sont montees', () => {
  test('le layout note les clics (MemoireAncre)', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(app)/layout.tsx'),
      'utf8',
    )
    expect(source).toContain('<MemoireAncre />')
  })

  const pages = [
    'src/app/(app)/parametres/page.tsx',
    'src/app/(app)/semaine/[id]/page.tsx',
  ]

  test.each(pages)('%s rejoue l ancre apres son squelette', relatif => {
    const dossier = path.dirname(path.join(process.cwd(), relatif))
    const source = fs.readFileSync(path.join(process.cwd(), relatif), 'utf8')
    expect(fs.existsSync(path.join(dossier, 'loading.tsx'))).toBe(true)
    expect(source).toContain('<AncreAuChargement />')
  })
})
