// Garde-fou de contraste sur la feuille de style globale.
//
// Retour de Christophe du 26/07 : l'emploi du temps s'affichait en texte blanc
// ou tres clair, alors que ses reglages disaient noir. Cause : `globals.css`
// gardait le bloc `prefers-color-scheme: dark` du gabarit Next, qui repeint
// `--foreground` en #ededed. L'application n'a PAS de theme sombre (fonds
// blancs, cartes blanches, violet), donc sur un ordinateur regle en sombre
// tout texte sans classe de couleur explicite devenait illisible.
//
// Ce test lit le CSS reel : il echouerait de nouveau si quelqu'un
// re-collait le bloc du gabarit.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Les commentaires sont retires : le fichier explique justement pourquoi le
// bloc sombre a ete supprime, et cette explication ne doit pas faire echouer
// la recherche de la regle elle-meme.
const css = readFileSync(join(__dirname, '..', 'globals.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

describe('globals.css', () => {
  test('ne bascule pas le texte en clair quand le systeme est en mode sombre', () => {
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark/)
  })

  test('la couleur de texte par defaut reste franchement sombre', () => {
    const declaration = css.match(/--foreground:\s*(#[0-9a-fA-F]{3,8})/)
    expect(declaration).not.toBeNull()

    const hex = declaration![1]
    const composantes = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
    const luminance = (0.2126 * composantes[0] + 0.7152 * composantes[1] + 0.0722 * composantes[2]) / 255
    // Sur fond blanc, il faut du tres sombre : 0.35 laisse passer les gris
    // fonces mais barre tout ce qui approche le blanc.
    expect(luminance).toBeLessThan(0.35)
  })
})
