/**
 * @jest-environment jsdom
 */
import fs from 'node:fs'
import path from 'node:path'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import AncreAuChargement from '../AncreAuChargement'

/** jsdom n'implemente ni scrollIntoView ni requestAnimationFrame utilement. */
function preparerCible(id: string) {
  const cible = document.createElement('section')
  cible.id = id
  const vu = jest.fn()
  cible.scrollIntoView = vu
  document.body.appendChild(cible)
  return vu
}

function allerA(hash: string) {
  window.location.hash = hash
}

describe('AncreAuChargement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.location.hash = ''
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0)
      return 1
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('rejoue l’ancre une fois le contenu réel monté', () => {
    const vu = preparerCible('eleves')
    allerA('#eleves')

    render(<AncreAuChargement />)

    expect(vu).toHaveBeenCalledWith({ block: 'start' })
  })

  test('ne fait rien sans ancre dans l’URL', () => {
    const vu = preparerCible('eleves')

    render(<AncreAuChargement />)

    expect(vu).not.toHaveBeenCalled()
  })

  test('ignore une ancre qui ne désigne aucune section', () => {
    const vu = preparerCible('eleves')
    allerA('#section-disparue')

    expect(() => render(<AncreAuChargement />)).not.toThrow()
    expect(vu).not.toHaveBeenCalled()
  })

  /**
   * Le hash doit etre lu DANS le rappel d animation, pas au montage.
   *
   * Les effets des enfants s executent avant ceux du routeur : a l instant du
   * montage, window.location peut encore montrer l entree PRECEDENTE. Bug vu
   * par Christophe le 30/07 : apres avoir visite /semaine/X#suivi, cliquer la
   * carte « Prochaine semaine » (lien SANS ancre) atterrissait sur le suivi,
   * parce que le composant relisait le hash perime de la visite d avant.
   */
  test('ne rejoue pas le hash périmé de la page précédente', () => {
    const vu = preparerCible('suivi')
    allerA('#suivi') // URL pas encore synchronisée : hash de la visite d'avant

    jest.spyOn(window, 'requestAnimationFrame').mockRestore()
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      // Le routeur synchronise l'URL (navigation SANS ancre) avant la frame.
      window.location.hash = ''
      cb(0)
      return 1
    })

    render(<AncreAuChargement />)

    expect(vu).not.toHaveBeenCalled()
  })

  test("rattrape l'ancre qui n'arrive qu'avec la synchronisation de l'URL", () => {
    const vu = preparerCible('eleves')
    // Au montage, l'URL montre encore la page precedente, sans ancre.

    jest.spyOn(window, 'requestAnimationFrame').mockRestore()
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      // Puis le routeur ecrit la vraie destination, ancre comprise.
      window.location.hash = '#eleves'
      cb(0)
      return 1
    })

    render(<AncreAuChargement />)

    expect(vu).toHaveBeenCalledWith({ block: 'start' })
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
 * Les deux pages qui portent une ancre ont aussi un `loading.tsx`. C'est
 * precisement la combinaison qui perdait l'ancre : le squelette s'affiche, la
 * cible n'existe pas encore, le navigateur reste en haut.
 */
describe('les pages à ancre rejouent l’ancre après leur squelette', () => {
  const pages = [
    'src/app/(app)/parametres/page.tsx',
    'src/app/(app)/semaine/[id]/page.tsx',
  ]

  test.each(pages)('%s monte AncreAuChargement', relatif => {
    const dossier = path.dirname(path.join(process.cwd(), relatif))
    const source = fs.readFileSync(path.join(process.cwd(), relatif), 'utf8')
    // Le rappel n'a de sens que si la page a bien un squelette de chargement.
    expect(fs.existsSync(path.join(dossier, 'loading.tsx'))).toBe(true)
    expect(source).toContain('<AncreAuChargement />')
  })
})
