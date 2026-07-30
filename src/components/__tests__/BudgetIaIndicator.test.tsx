/**
 * @jest-environment jsdom
 */
import fs from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import BudgetIaIndicator from '../BudgetIaIndicator'

/**
 * La jauge recoit son solde en PROP : elle ne va plus le chercher elle-meme.
 *
 * Quand elle le faisait (30/07 au matin), son `soldeIA()` s executait APRES la
 * vague de requetes de l accueil : trois allers-retours Supabase de plus en
 * serie (~450 ms au plancher de 150 ms l appel, mesure le 29/07) sur la page
 * la plus visitee. Christophe l a senti le jour meme : « l application n est
 * pas reactive ». Le solde voyage desormais dans la vague de la page.
 */
describe('BudgetIaIndicator', () => {
  test('sans releve, invite a saisir le solde au lieu d afficher un faux chiffre', () => {
    render(<BudgetIaIndicator solde={{
      consommeUsd: 1.23, restantUsd: null, releveAt: null, soldeReleveUsd: null,
    }} />)

    expect(screen.getByText(/1\.23 \$ consommés/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /indique ton solde/i }))
      .toHaveAttribute('href', '/parametres#credit-ia')
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  test('avec un releve, affiche le restant et la barre', () => {
    render(<BudgetIaIndicator solde={{
      consommeUsd: 0.5, restantUsd: 1.16, releveAt: '2026-07-30T18:00:00.000Z', soldeReleveUsd: 1.66,
    }} />)

    expect(screen.getByText(/1\.16 \$/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  test('credit epuise : le dit sans afficher un montant negatif', () => {
    render(<BudgetIaIndicator solde={{
      consommeUsd: 2, restantUsd: -0.34, releveAt: '2026-07-30T18:00:00.000Z', soldeReleveUsd: 1.66,
    }} />)

    expect(screen.getByText(/Crédit épuisé/)).toBeInTheDocument()
    expect(screen.getByText(/0\.00 \$/)).toBeInTheDocument()
  })
})

/**
 * Verrous de forme, dans le style de `parametres/page.test.ts` : le gain de
 * navigation tient a la FORME du code (une seule vague), et rien d autre ne
 * casse si quelqu un re-serialise. Ces tests le remarqueraient.
 */
describe('le solde IA ne coute qu une vague de requetes', () => {
  const lire = (relatif: string) =>
    fs.readFileSync(path.join(process.cwd(), relatif), 'utf8')

  test('soldeIA lance ses deux requetes ensemble, sans getUser reseau', () => {
    const source = lire('src/lib/actions/ia-usage.ts')
    const corps = source.slice(
      source.indexOf('export async function soldeIA'),
      source.indexOf('export', source.indexOf('export async function soldeIA') + 1),
    )
    expect(corps).toContain('Promise.all')
    // getUser coutait un aller-retour reseau par affichage ; RLS borne deja
    // les deux tables a la personne connectee (meme motif que `classes`).
    expect(corps).not.toContain('getUser')
    expect(corps).toContain('sommeCoutDepuis')
  })

  test("l accueil demande le solde DANS sa vague, pas apres", () => {
    const source = lire('src/app/(app)/accueil/page.tsx')
    const vague = source.slice(source.indexOf('Promise.all'), source.indexOf(']))'))
    expect(vague).toContain('soldeIA()')
    expect(source).toContain('<BudgetIaIndicator solde={solde} />')
  })

  test('la jauge ne declenche aucune requete elle-meme', () => {
    const source = lire('src/components/BudgetIaIndicator.tsx')
    // Le TYPE SoldeIA peut venir de ia-usage (efface a la compilation) ;
    // la FONCTION, elle, ne doit plus y etre appelee.
    expect(source).not.toMatch(/import \{[^}]*soldeIA/)
    expect(source).not.toContain('soldeIA()')
  })
})
