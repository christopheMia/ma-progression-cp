# Calage des semaines à l'import: plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire que l'import d'un sommaire de manuel place le contenu sur les bonnes semaines de l'année réelle, y compris quand la première semaine de la rentrée est vide, et le montrer à l'enseignante avec les vraies dates avant qu'elle valide.

**Architecture:** Un module pur `src/lib/calage-semaines.ts` place les semaines rendues par l'IA dans l'année scolaire, en réutilisant la même chaîne de dates que la création de classe. Deux corrections en amont (l'API cesse de renuméroter, le client cesse de supprimer les semaines vides) lui garantissent des données intactes. Un petit bandeau d'écran affiche sur quoi le calage repose et permet de le décaler d'un cran, sans appel réseau.

**Tech Stack:** Next.js 16.2.9, React 19, TypeScript, Jest 30 + ts-jest, @testing-library/react, date-fns, Tailwind, SDK Anthropic.

**Spec de référence:** `docs/superpowers/specs/2026-07-26-calage-semaines-import-design.md` (commit `f8ac298`).

---

## Contexte pour quelqu'un qui découvre le projet

L'application aide une enseignante de CP à suivre sa progression annuelle. L'année de CP compte **36 semaines** de classe, réparties en **5 périodes** séparées par les vacances, et le calendrier dépend de la **zone scolaire** (A, B ou C).

L'enseignante importe le sommaire de son manuel (PDF ou texte collé). L'IA le lit et rend une liste de semaines: `{ numero, items, pages, mots_exemple }`. Beaucoup de manuels laissent la semaine de la rentrée à l'accueil et aux rituels, et commencent le premier son en **semaine 2**. Aujourd'hui cette information est détruite deux fois, donc toute l'année se retrouve décalée d'un cran.

Vocabulaire du code (tout est en français, c'est la convention du projet):
- `ProgressionSemaine` = `{ numero: number; items: string[]; pages: string; mots_exemple: string[] }`, défini dans `src/data/manuels`.
- `ZoneScolaire` = `'A' | 'B' | 'C'`.
- « calage » = l'opération qui décide sur quelle semaine réelle de l'année tombe chaque entrée du document.

Commandes utiles, à lancer depuis la racine du dépôt (`C:\Users\youck\Desktop\claude\ma-progression-cp`):

```bash
npx jest                                   # toute la suite
npx jest src/lib/__tests__/calage-semaines.test.ts   # un seul fichier
npx tsc --noEmit                           # vérification de types
npm run build                              # build de production
```

Le projet a **44 suites / 367 tests** au vert avant ce chantier. Toute régression est un bug de ce chantier.

---

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `src/lib/calage-semaines.ts` | **Nouveau.** Fonction pure: place des semaines dans l'année réelle, expose les trous, calcule si un décalage est possible. Aucun réseau, aucune horloge. | 1 |
| `src/lib/__tests__/calage-semaines.test.ts` | **Nouveau.** Les 7 tests du module. | 1 |
| `src/lib/ia/schema.ts` | `normalizeProgression` conserve les numéros de l'IA au lieu de renuméroter. | 2 |
| `src/lib/ia/__tests__/schema.test.ts` | Le test qui exigeait la renumérotation devient le test qui l'interdit. | 2 |
| `src/lib/ia/schema-import-auto.ts` | Champ `base_calage` dans la sortie structurée, plus son normalisateur. | 3 |
| `src/lib/ia/prompts.ts` | Le prompt reçoit la date de rentrée et doit renseigner `base_calage`. | 3 |
| `src/app/api/ia-manuel/route.ts` | Lit `rentree_date`, le passe au prompt, renvoie `base_calage`. | 3 |
| `src/components/methodes/SourceContentPreview.tsx` | Affiche la date de chaque semaine et rend visibles les semaines vides. | 4 |
| `src/components/methodes/BandeauCalage.tsx` | **Nouveau.** Phrase de transparence, avertissements, deux boutons de décalage. | 5 |
| `src/components/methodes/SourceImporter.tsx` | Tient l'état du décalage, compose le bandeau et l'aperçu, n'applique le compactage qu'à l'enregistrement. | 6 |
| `src/components/setup/ProgressionsSetup.tsx` | Transmet `rentreeDate` et `zone` à l'importeur. | 7 |
| `src/app/(app)/setup/page.tsx` | Inversion des étapes 1 et 2. | 7 |

Trois consommateurs de `SourceImporter` existent: `ProgressionsSetup` (le setup), `MethodesEditor` (les paramètres) et `AssistantFlottant`. **Seul le setup est câblé dans ce chantier**, conformément à la spec. Les deux autres continuent de marcher exactement comme avant parce que les nouvelles props sont optionnelles: sans date de rentrée, l'importeur n'affiche ni bandeau ni dates.

---

## Task 1: Le module pur de calage

C'est le coeur du chantier et le seul endroit où la logique vit. On l'écrit en premier, en TDD, en commençant par le cas exact signalé par Christophe.

**Files:**
- Create: `src/lib/calage-semaines.ts`
- Test: `src/lib/__tests__/calage-semaines.test.ts`

- [ ] **Step 1: Écrire le test qui échoue (le cas de Christophe)**

Créer `src/lib/__tests__/calage-semaines.test.ts` avec exactement ce contenu:

```ts
import { calerSemaines } from '../calage-semaines'
import type { ProgressionSemaine } from '@/data/manuels'

// Sommaire typique: la semaine de la rentrée est consacrée à l'accueil et aux
// rituels, le premier son arrive en semaine 2. Le manuel numérote donc à partir
// de 2. Rentrée 2026 zone A: le lundi de la semaine 1 est le 31 août 2026.
const SOMMAIRE_PREMIERE_SEMAINE_VIDE: ProgressionSemaine[] = [
  { numero: 2, items: ['a'], pages: 'p. 8-9', mots_exemple: ['ami'] },
  { numero: 3, items: ['i'], pages: 'p. 10-11', mots_exemple: ['ile'] },
  { numero: 4, items: ['o'], pages: 'p. 12-13', mots_exemple: ['moto'] },
]

describe('calerSemaines', () => {
  test('une première semaine de rentrée vide reste vide et ne décale pas l’année', () => {
    const calage = calerSemaines({
      semaines: SOMMAIRE_PREMIERE_SEMAINE_VIDE,
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.lignes).toHaveLength(4)

    expect(calage.lignes[0]).toEqual({
      numero: 1,
      dateLundi: '2026-08-31',
      periodeNumero: 1,
      items: [],
      pages: '',
      motsExemple: [],
      vide: true,
    })

    expect(calage.lignes[1]).toEqual({
      numero: 2,
      dateLundi: '2026-09-07',
      periodeNumero: 1,
      items: ['a'],
      pages: 'p. 8-9',
      motsExemple: ['ami'],
      vide: false,
    })

    expect(calage.lignes[3].numero).toBe(4)
    expect(calage.lignes[3].items).toEqual(['o'])
    expect(calage.lignes[3].dateLundi).toBe('2026-09-21')
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/lib/__tests__/calage-semaines.test.ts`
Expected: FAIL. Message attendu: `Cannot find module '../calage-semaines'`.

C'est le rouge de départ. Ne pas passer à la suite avant de l'avoir vu.

- [ ] **Step 3: Écrire le module**

Créer `src/lib/calage-semaines.ts` avec exactement ce contenu:

```ts
// src/lib/calage-semaines.ts
//
// Place les semaines rendues par l'IA dans l'ANNÉE RÉELLE de la classe.
//
// Règle qui gouverne ce module: aucune donnée n'est écartée en silence. Un trou
// dans la numérotation (une semaine de rentrée laissée vide par le manuel, par
// exemple) devient une ligne visible au lieu de disparaître et de décaler toute
// l'année d'un cran.
//
// Fonction pure: aucun appel réseau, aucune lecture d'horloge, aucun effet de
// bord sur les tableaux reçus. Les dates viennent OBLIGATOIREMENT de la même
// chaîne que la création de la classe (setup-creation.ts), sinon l'aperçu
// montrerait une date et l'application en enregistrerait une autre.

import type { ProgressionSemaine } from '@/data/manuels'
import { periodesOfficielles, type ZoneScolaire } from '@/lib/calendrier-officiel'
import { datesSemainesCalendaires } from '@/lib/calendrier-semaines'

export const MAX_SEMAINES_CALAGE = 36

/** Sur quoi le calage repose, donc à quel point il est sûr. */
export type BaseCalage = 'numeros' | 'dates' | 'ordre'

export type LigneCalage = {
  /** Numéro de semaine dans l'année de la classe, 1 à 36. */
  numero: number
  /** Lundi réel de cette semaine, ou '' si le calendrier officiel manque. */
  dateLundi: string
  /** Période 1 à 5, ou 0 si le calendrier officiel manque. */
  periodeNumero: number
  items: string[]
  pages: string
  motsExemple: string[]
  /** Trou dans la numérotation: aucune donnée du document ne tombe ici. */
  vide: boolean
}

export type Calage = {
  lignes: LigneCalage[]
  base: BaseCalage
  decalage: number
  avertissements: string[]
  peutAvancer: boolean
  peutReculer: boolean
}

export type OptionsCalage = {
  /** Semaines telles que rendues par l'IA, numéros compris. */
  semaines: ProgressionSemaine[]
  rentreeDate: string
  zone: ZoneScolaire
  base: BaseCalage
  /** Décalage demandé par l'enseignante, en semaines. Défaut 0. */
  decalage?: number
}

function ligneVide(
  numero: number,
  dateLundi: string,
  periodeNumero: number,
): LigneCalage {
  return { numero, dateLundi, periodeNumero, items: [], pages: '', motsExemple: [], vide: true }
}

export function calerSemaines(opts: OptionsCalage): Calage {
  const decalage = opts.decalage ?? 0
  const avertissements: string[] = []

  // Le décalage s'applique AUX NUMÉROS d'abord. L'expansion des trous vient
  // ensuite, sinon un décalage fabriquerait de fausses semaines vides en tête.
  const decalees = opts.semaines
    .map(semaine => ({ ...semaine, numero: semaine.numero + decalage }))
    .sort((a, b) => a.numero - b.numero)

  const numeros = decalees.map(semaine => semaine.numero)
  const minimum = numeros.length ? Math.min(...numeros) : 1
  const maximum = numeros.length ? Math.max(...numeros) : 1

  const horsPlage = numeros.filter(numero => numero < 1 || numero > MAX_SEMAINES_CALAGE)
  if (horsPlage.length) {
    avertissements.push(
      `Ces semaines sortent de l'année scolaire (1 à ${MAX_SEMAINES_CALAGE}) : ${horsPlage.join(', ')}.`,
    )
  }

  const doublons = [...new Set(numeros.filter((numero, index) => numeros.indexOf(numero) !== index))]
  if (doublons.length) {
    avertissements.push(
      `Ces numéros de semaine apparaissent plusieurs fois : ${doublons.join(', ')}.`,
    )
  }

  // Exactement la chaîne de dates utilisée à la création de la classe.
  const periodes = periodesOfficielles(opts.rentreeDate, opts.zone)
  const calendrier = periodes.length === 5
    ? datesSemainesCalendaires(periodes, MAX_SEMAINES_CALAGE)
    : []
  if (calendrier.length === 0) {
    avertissements.push(
      "Le calendrier officiel de cette année scolaire n'est pas connu de l'application : les dates ne sont pas affichées.",
    )
  }
  const calendrierParNumero = new Map(calendrier.map(semaine => [semaine.numero, semaine]))

  const dernierNumero = Math.min(Math.max(maximum, 1), MAX_SEMAINES_CALAGE)
  const lignes: LigneCalage[] = []

  for (let numero = 1; numero <= dernierNumero; numero++) {
    const officielle = calendrierParNumero.get(numero)
    const dateLundi = officielle?.date_debut ?? ''
    const periodeNumero = officielle?.periode_numero ?? 0
    const semainesDuNumero = decalees.filter(semaine => semaine.numero === numero)

    if (semainesDuNumero.length === 0) {
      lignes.push(ligneVide(numero, dateLundi, periodeNumero))
      continue
    }
    // Un numéro en double produit deux lignes: on préfère montrer le doublon
    // plutôt que d'en perdre une moitié en silence.
    for (const semaine of semainesDuNumero) {
      lignes.push({
        numero,
        dateLundi,
        periodeNumero,
        items: semaine.items,
        pages: semaine.pages,
        motsExemple: semaine.mots_exemple,
        vide: false,
      })
    }
  }

  // Les semaines hors de 1 à 36 restent visibles, à la fin, jamais supprimées.
  for (const semaine of decalees) {
    if (semaine.numero >= 1 && semaine.numero <= MAX_SEMAINES_CALAGE) continue
    lignes.push({
      numero: semaine.numero,
      dateLundi: '',
      periodeNumero: 0,
      items: semaine.items,
      pages: semaine.pages,
      motsExemple: semaine.mots_exemple,
      vide: false,
    })
  }

  return {
    lignes,
    base: opts.base,
    decalage,
    avertissements,
    peutAvancer: numeros.length > 0 && maximum + 1 <= MAX_SEMAINES_CALAGE,
    peutReculer: numeros.length > 0 && minimum - 1 >= 1,
  }
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/lib/__tests__/calage-semaines.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calage-semaines.ts src/lib/__tests__/calage-semaines.test.ts
git commit -m "Calage des semaines: une premiere semaine de rentree vide ne decale plus l'annee"
```

- [ ] **Step 6: Ajouter les six tests restants**

Ajouter ces `test(...)` **à l'intérieur** du `describe('calerSemaines', ...)` existant, après le premier test. Ajouter aussi les deux imports supplémentaires en haut du fichier de test:

```ts
import { periodesOfficielles } from '@/lib/calendrier-officiel'
import { datesSemainesCalendaires } from '@/lib/calendrier-semaines'
```

```ts
  test('un sommaire sans numéro utilisable est calé sur le seul ordre, à partir de 1', () => {
    // Quand l'IA n'a trouvé ni numéro ni date, elle numérote séquentiellement.
    // Le calage est alors incertain: c'est exactement le cas où les boutons de
    // décalage servent.
    const calage = calerSemaines({
      semaines: [
        { numero: 1, items: ['a'], pages: '', mots_exemple: [] },
        { numero: 2, items: ['i'], pages: '', mots_exemple: [] },
      ],
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'ordre',
    })

    expect(calage.base).toBe('ordre')
    expect(calage.lignes.map(ligne => ligne.numero)).toEqual([1, 2])
    expect(calage.lignes.some(ligne => ligne.vide)).toBe(false)
  })

  test('un trou au milieu de la numérotation reste visible', () => {
    const calage = calerSemaines({
      semaines: [
        { numero: 1, items: ['a'], pages: '', mots_exemple: [] },
        { numero: 4, items: ['o'], pages: '', mots_exemple: [] },
      ],
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.lignes.map(ligne => ligne.numero)).toEqual([1, 2, 3, 4])
    expect(calage.lignes.map(ligne => ligne.vide)).toEqual([false, true, true, false])
  })

  test('un décalage +1 puis un retour à 0 redonne exactement l’état de départ', () => {
    const options = {
      semaines: SOMMAIRE_PREMIERE_SEMAINE_VIDE,
      rentreeDate: '2026-09-01',
      zone: 'A' as const,
      base: 'numeros' as const,
    }
    const depart = calerSemaines(options)
    const avance = calerSemaines({ ...options, decalage: 1 })
    const retour = calerSemaines({ ...options, decalage: 0 })

    expect(avance.lignes.map(ligne => ligne.numero)).toEqual([1, 2, 3, 4, 5])
    expect(avance.lignes[4].items).toEqual(['o'])
    expect(retour).toEqual(depart)
    // Le module ne modifie jamais le tableau qu'on lui donne.
    expect(SOMMAIRE_PREMIERE_SEMAINE_VIDE[0].numero).toBe(2)
  })

  test('avancer est refusé quand la dernière semaine atteint 36', () => {
    const calage = calerSemaines({
      semaines: [
        { numero: 35, items: ['bilan'], pages: '', mots_exemple: [] },
        { numero: 36, items: ['fête'], pages: '', mots_exemple: [] },
      ],
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.peutAvancer).toBe(false)
    expect(calage.peutReculer).toBe(true)
  })

  test('les dates sautent les vacances de la Toussaint', () => {
    const calage = calerSemaines({
      semaines: [{ numero: 8, items: ['ou'], pages: '', mots_exemple: [] }],
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    // Zone A 2026: la période 1 compte 7 semaines et se termine le 16 octobre.
    // La semaine 8 tombe donc au retour des vacances, le 2 novembre.
    const semaine8 = calage.lignes.find(ligne => ligne.numero === 8)
    expect(semaine8?.dateLundi).toBe('2026-11-02')
    expect(semaine8?.periodeNumero).toBe(2)
  })

  test('les dates affichées sont celles enregistrées à la création de la classe', () => {
    // Non-régression: si l'aperçu et la création divergeaient, l'écran mentirait.
    const reference = datesSemainesCalendaires(periodesOfficielles('2026-09-01', 'A'), 36)
    const calage = calerSemaines({
      semaines: Array.from({ length: 36 }, (_, index) => ({
        numero: index + 1,
        items: [`notion ${index + 1}`],
        pages: '',
        mots_exemple: [],
      })),
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.lignes).toHaveLength(36)
    for (const ligne of calage.lignes) {
      const attendue = reference.find(semaine => semaine.numero === ligne.numero)
      expect(ligne.dateLundi).toBe(attendue?.date_debut)
      expect(ligne.periodeNumero).toBe(attendue?.periode_numero)
    }
  })

  test('sans calendrier officiel connu, les numéros restent affichés sans date', () => {
    const calage = calerSemaines({
      semaines: [{ numero: 1, items: ['a'], pages: '', mots_exemple: [] }],
      rentreeDate: '2042-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.lignes[0].numero).toBe(1)
    expect(calage.lignes[0].dateLundi).toBe('')
    expect(calage.avertissements.join(' ')).toContain('calendrier officiel')
  })
```

- [ ] **Step 7: Lancer tous les tests du module**

Run: `npx jest src/lib/__tests__/calage-semaines.test.ts`
Expected: PASS, 8 tests.

Si le test des vacances échoue avec une autre date que `2026-11-02`, ne pas modifier l'attente: relire `src/lib/calendrier-officiel.ts` et `src/lib/__tests__/calendrier-semaines.test.ts`, qui font foi sur le calendrier zone A 2026.

- [ ] **Step 8: Commit**

```bash
git add src/lib/__tests__/calage-semaines.test.ts
git commit -m "Calage des semaines: couvrir trous, decalage, vacances et absence de calendrier"
```

---

## Task 2: L'API cesse de renuméroter

**Perte numéro 1.** `normalizeProgression` jette le numéro rendu par l'IA et le remplace par la position dans la liste. Un manuel qui commence en semaine 2 remonte en semaine 1.

**Files:**
- Modify: `src/lib/ia/schema.ts:34-47`
- Test: `src/lib/ia/__tests__/schema.test.ts:4-10`

- [ ] **Step 1: Retourner le test existant**

Dans `src/lib/ia/__tests__/schema.test.ts`, **remplacer** le premier test:

```ts
  test('renumérote les semaines de 1 à N dans l’ordre', () => {
    const out = normalizeProgression([
      { numero: 5, items: ['a'], pages: 'p.10', mots_exemple: ['ananas'] },
      { numero: 2, items: ['i'], pages: 'p.14', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([1, 2])
  })
```

par ceci:

```ts
  test('conserve les numéros de semaine rendus par l’IA, en les triant', () => {
    // Renuméroter détruisait le calage: un manuel commençant en semaine 2
    // remontait en semaine 1 et toute l'année se décalait d'un cran.
    const out = normalizeProgression([
      { numero: 5, items: ['a'], pages: 'p.10', mots_exemple: ['ananas'] },
      { numero: 2, items: ['i'], pages: 'p.14', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([2, 5])
  })

  test('retombe sur l’ordre de la liste quand un numéro est inutilisable', () => {
    const out = normalizeProgression([
      { numero: 0, items: ['a'], pages: '', mots_exemple: [] },
      { numero: 99, items: ['i'], pages: '', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([1, 2])
    expect(numerosSemainesFiables([
      { numero: 0, items: ['a'], pages: '', mots_exemple: [] },
    ])).toBe(false)
  })
```

Et modifier la ligne d'import en tête de fichier:

```ts
import { normalizeProgression, numerosSemainesFiables, PROGRESSION_JSON_SCHEMA } from '../schema'
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/lib/ia/__tests__/schema.test.ts`
Expected: FAIL. Deux erreurs: `Expected: [2, 5] / Received: [1, 2]` et `numerosSemainesFiables is not a function`.

- [ ] **Step 3: Corriger le module**

Dans `src/lib/ia/schema.ts`, **remplacer** la fonction `normalizeProgression` (lignes 34 à 47) par:

```ts
type SemaineNettoyee = ProgressionSemaine

function nettoyerSemainesBrutes(brut: unknown[]): SemaineNettoyee[] {
  const items = Array.isArray(brut) ? brut : []
  return items.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    return {
      numero: typeof o.numero === 'number' ? o.numero : 0,
      items: toStringArray(o.items),
      pages: typeof o.pages === 'string' ? o.pages.trim() : '',
      mots_exemple: toStringArray(o.mots_exemple),
    }
  })
}

/**
 * Vrai quand TOUS les numéros rendus par l'IA sont des semaines plausibles
 * (entiers de 1 à 36). Dans ce cas seulement ils peuvent servir au calage.
 * Sinon le calage ne repose que sur l'ordre de la liste, ce que l'écran doit
 * dire franchement à l'enseignante.
 */
export function numerosSemainesFiables(brut: unknown[]): boolean {
  const cleaned = nettoyerSemainesBrutes(brut)
  if (cleaned.length === 0) return false
  return cleaned.every(s =>
    Number.isInteger(s.numero) && s.numero >= 1 && s.numero <= MAX_SEMAINES)
}

/**
 * Nettoie les semaines rendues par l'IA SANS toucher à leur numéro quand il est
 * utilisable. Renuméroter détruisait l'information « ce manuel commence en
 * semaine 2 », donc décalait toute l'année. Le placement réel dans l'année est
 * la responsabilité de src/lib/calage-semaines.ts, pas celle d'ici.
 */
export function normalizeProgression(brut: unknown[]): ProgressionSemaine[] {
  const cleaned = nettoyerSemainesBrutes(brut)
  if (!numerosSemainesFiables(brut)) {
    // Aucun numéro exploitable: on numérote dans l'ordre reçu, et la route
    // signale `base_calage: 'ordre'` pour que l'écran ne prétende pas être sûr.
    return cleaned.slice(0, MAX_SEMAINES).map((s, i) => ({ ...s, numero: i + 1 }))
  }
  return [...cleaned].sort((a, b) => a.numero - b.numero).slice(0, MAX_SEMAINES)
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/lib/ia/__tests__/schema.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Vérifier que rien d'autre ne casse**

Run: `npx jest`
Expected: PASS partout. `normalizeProgression` est aussi appelée par `src/app/api/ia-chat/route.ts:72`, donc cette correction protège aussi la conversation de correction. Si `src/app/api/ia-manuel/route.test.ts` échoue parce qu'il attendait une renumérotation, mettre son attente à jour dans le même esprit que le test du Step 1, et le noter dans le message de commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ia/schema.ts src/lib/ia/__tests__/schema.test.ts
git commit -m "normalizeProgression conserve les numeros de semaine rendus par l'IA"
```

---

## Task 3: L'API dit sur quoi le calage repose

L'écran doit être honnête sur son niveau de certitude. Pour ça l'IA indique si elle s'est appuyée sur des numéros écrits dans le document, sur des dates, ou seulement sur l'ordre de la liste.

**Files:**
- Modify: `src/lib/ia/schema-import-auto.ts`
- Modify: `src/lib/ia/prompts.ts:221-267`
- Modify: `src/app/api/ia-manuel/route.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/ia/__tests__/schema-import-auto.test.ts`:

```ts
import {
  AUTO_IMPORT_JSON_SCHEMA,
  baseCalageImport,
  BASES_CALAGE,
} from '../schema-import-auto'

describe('base de calage', () => {
  test('le schéma structuré impose une base de calage', () => {
    expect(AUTO_IMPORT_JSON_SCHEMA.properties).toHaveProperty('base_calage')
    expect(AUTO_IMPORT_JSON_SCHEMA.required).toContain('base_calage')
    expect(BASES_CALAGE).toEqual(['numeros', 'dates', 'ordre'])
  })

  test('une base inconnue retombe sur le calage par ordre', () => {
    expect(baseCalageImport('numeros')).toBe('numeros')
    expect(baseCalageImport('dates')).toBe('dates')
    expect(baseCalageImport('n’importe quoi')).toBe('ordre')
    expect(baseCalageImport(undefined)).toBe('ordre')
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/lib/ia/__tests__/schema-import-auto.test.ts`
Expected: FAIL avec `baseCalageImport is not a function`.

- [ ] **Step 3: Ajouter le champ au schéma**

Dans `src/lib/ia/schema-import-auto.ts`, ajouter après la ligne 5 (`export type TypeDocumentImport = ...`):

```ts
/** Sur quoi l'IA s'est appuyée pour numéroter les semaines. */
export const BASES_CALAGE = ['numeros', 'dates', 'ordre'] as const
export type BaseCalageImport = typeof BASES_CALAGE[number]
```

Ajouter dans `properties` de `AUTO_IMPORT_JSON_SCHEMA`, juste après `avertissements`:

```ts
    base_calage: { type: 'string', enum: BASES_CALAGE },
```

Ajouter `'base_calage',` dans le tableau `required`, juste après `'avertissements',`.

Ajouter en fin de fichier:

```ts
export function baseCalageImport(value: unknown): BaseCalageImport {
  return BASES_CALAGE.includes(value as BaseCalageImport)
    ? value as BaseCalageImport
    : 'ordre'
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/lib/ia/__tests__/schema-import-auto.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Instruire le prompt**

Dans `src/lib/ia/prompts.ts`, **remplacer** la signature de `systemImportAutomatique` (ligne 221) et son début:

```ts
export function systemImportAutomatique(indiceMatiere?: string): string {
  const indice = indiceMatiere?.trim()
```

par:

```ts
export function systemImportAutomatique(indiceMatiere?: string, rentreeDate?: string): string {
  const indice = indiceMatiere?.trim()
  const rentree = rentreeDate?.trim()
  const contexteRentree = rentree
    ? `L'année scolaire de cette classe commence le ${rentree} et compte 36 semaines de classe, vacances exclues. Si le document donne des dates, sers-t'en pour numéroter les semaines par rapport à cette rentrée.`
    : `La date de rentrée de la classe n'est pas connue.`
```

Puis, dans le corps du même prompt, **remplacer** la ligne:

```
- "periode_numero" : numéro de la période explicitement indiquée pour un planning de période (1 à 5), sinon null.
```

par:

```
- "periode_numero" : numéro de la période explicitement indiquée pour un planning de période (1 à 5), sinon null ;
- "base_calage" : sur quoi tu t'es appuyé pour numéroter les semaines. "numeros" si le document numérote explicitement ses semaines, "dates" si le document donne des dates, "ordre" si rien de tel n'existe et que tu as simplement suivi l'ordre de la liste.
```

Et **remplacer** la première règle de la section « Règles pour "manuel" »:

```
- Une entrée par semaine, dans l'ordre chronologique, avec les notions dans "items".
```

par:

```
- Une entrée par semaine, dans l'ordre chronologique, avec les notions dans "items".
- "numero" est le numéro de la semaine DANS L'ANNÉE, pas la position dans ta liste. Si le manuel laisse la semaine de la rentrée à l'accueil et commence son premier contenu en semaine 2, alors ta première entrée porte le numéro 2. N'invente pas d'entrée vide pour combler le trou.
```

Enfin, insérer `${contexteRentree}` dans le texte du prompt, sur sa propre ligne juste après `${contexteMatiere}`.

- [ ] **Step 6: Câbler la route**

Dans `src/app/api/ia-manuel/route.ts`:

Modifier l'import de la ligne 4:

```ts
import { normalizeProgression, numerosSemainesFiables } from '@/lib/ia/schema'
```

Modifier l'import des lignes 7 à 11 pour ajouter `baseCalageImport`:

```ts
import {
  AUTO_IMPORT_JSON_SCHEMA,
  baseCalageImport,
  periodeDocumentImport,
  typeDocumentImport,
} from '@/lib/ia/schema-import-auto'
```

Déclarer la variable à côté de `matiere`, en remplaçant la ligne 47 (`let matiere = ''`) par:

```ts
    let matiere = ''
    let rentreeDate = ''
```

Dans la branche `multipart/form-data`, après la ligne qui lit `matiereRaw`, ajouter:

```ts
      const rentreeRaw = (form.get('rentree_date') as string | null) ?? ''
      if (rentreeRaw.trim()) rentreeDate = rentreeRaw.trim()
```

Dans la branche JSON, après la lecture de `body.matiere`, ajouter:

```ts
      if (typeof body.rentree_date === 'string' && body.rentree_date.trim()) {
        rentreeDate = body.rentree_date.trim()
      }
```

Remplacer la ligne 102:

```ts
      system: systemImportAutomatique(matiere || undefined),
```

par:

```ts
      system: systemImportAutomatique(matiere || undefined, rentreeDate || undefined),
```

Enfin, remplacer les lignes 142 à 150 par:

```ts
    const semainesBrutes = Array.isArray(parsed.semaines) ? parsed.semaines : []
    const progression = normalizeProgression(semainesBrutes)

    if (progression.length === 0) {
      return NextResponse.json(
        { error: "L'IA n'a pas reconnu de progression. Essayez le sommaire en texte ou l'import CSV." },
        { status: 422 }
      )
    }
    // Si les numéros n'étaient pas exploitables, normalizeProgression a numéroté
    // dans l'ordre reçu: quoi que l'IA ait déclaré, le calage repose sur l'ordre.
    const baseCalage = numerosSemainesFiables(semainesBrutes)
      ? baseCalageImport(parsed.base_calage)
      : 'ordre'
    return NextResponse.json({
      ...meta,
      type_document: typeDocument,
      progression,
      periodes: [],
      base_calage: baseCalage,
    })
```

- [ ] **Step 7: Lancer toute la suite**

Run: `npx jest`
Expected: PASS. Si `src/app/api/ia-manuel/route.test.ts` ou `src/lib/ia/__tests__/prompts.test.ts` échouent parce qu'ils vérifient l'ancienne forme, ajuster leurs attentes (le champ `base_calage` s'ajoute, il ne remplace rien).

- [ ] **Step 8: Commit**

```bash
git add src/lib/ia/schema-import-auto.ts src/lib/ia/prompts.ts src/app/api/ia-manuel/route.ts src/lib/ia/__tests__/schema-import-auto.test.ts
git commit -m "Import: l'IA declare sur quoi repose son calage des semaines"
```

---

## Task 4: L'aperçu montre les dates et les semaines vides

**Files:**
- Modify: `src/components/methodes/SourceContentPreview.tsx`
- Test: `src/components/methodes/__tests__/SourceContentPreview.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter ces deux tests dans `src/components/methodes/__tests__/SourceContentPreview.test.tsx`, à l'intérieur du `describe` existant. Le fichier a déjà `/** @jest-environment jsdom */` en tête et importe `render` / `screen`; réutiliser ses helpers de rendu s'il en a, sinon rendre le composant directement comme ci-dessous.

```ts
  test('affiche la date du lundi à côté de chaque semaine', () => {
    render(
      <SourceContentPreview
        typeDocument="manuel"
        semaines={[{ numero: 2, items: ['a'], pages: '', mots_exemple: [] }]}
        periodes={[]}
        datesParNumero={{ 2: '2026-09-07' }}
        onSemainesChange={() => {}}
        onPeriodesChange={() => {}}
      />
    )

    expect(screen.getByText('Semaine du 7 septembre')).toBeInTheDocument()
  })

  test('affiche une semaine vide au lieu de la faire disparaître', () => {
    render(
      <SourceContentPreview
        typeDocument="manuel"
        semaines={[
          { numero: 1, items: [], pages: '', mots_exemple: [] },
          { numero: 2, items: ['a'], pages: '', mots_exemple: [] },
        ]}
        periodes={[]}
        datesParNumero={{ 1: '2026-08-31', 2: '2026-09-07' }}
        onSemainesChange={() => {}}
        onPeriodesChange={() => {}}
      />
    )

    expect(screen.getByText('Semaine 1')).toBeInTheDocument()
    expect(screen.getByText('Aucun contenu du document sur cette semaine.')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/components/methodes/__tests__/SourceContentPreview.test.tsx`
Expected: FAIL. `datesParNumero` n'existe pas dans le type des props (erreur de compilation ts-jest), et les deux textes sont introuvables.

- [ ] **Step 3: Ajouter la prop et le rendu**

Dans `src/components/methodes/SourceContentPreview.tsx`:

Ajouter à `SourceContentPreviewProps` (après `periodes`):

```ts
  /** Date du lundi réel par numéro de semaine. Absent = aucune date affichée. */
  datesParNumero?: Record<number, string>
```

Ajouter `datesParNumero,` dans la déstructuration des props de la fonction, après `periodes,`.

Ajouter ce helper juste après la fonction `premierNumeroDisponible`:

```ts
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** '2026-09-07' devient 'Semaine du 7 septembre'. */
function libelleSemaine(numero: number, dateLundi?: string): string {
  if (!dateLundi) return `Semaine ${numero}`
  const [, mois, jour] = dateLundi.split('-')
  const indexMois = Number(mois) - 1
  if (!MOIS[indexMois]) return `Semaine ${numero}`
  return `Semaine du ${Number(jour)} ${MOIS[indexMois]}`
}

function semaineEstVide(semaine: ProgressionSemaine): boolean {
  return semaine.items.every(item => !item.trim())
    && !semaine.pages.trim()
    && semaine.mots_exemple.every(mot => !mot.trim())
}
```

Puis, dans le rendu des semaines, **remplacer** le bloc de titre (lignes 188 à 193):

```tsx
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-violet-100 px-2 text-sm font-bold text-violet-800">
              S{semaine.numero}
            </span>
            <h3 className="font-semibold text-slate-900">Semaine {semaine.numero}</h3>
          </div>
```

par:

```tsx
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-violet-100 px-2 text-sm font-bold text-violet-800">
              S{semaine.numero}
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">
                {libelleSemaine(semaine.numero, datesParNumero?.[semaine.numero])}
              </h3>
              {datesParNumero?.[semaine.numero] && (
                <p className="text-xs text-slate-500">Semaine {semaine.numero}</p>
              )}
            </div>
          </div>
          {semaineEstVide(semaine) && (
            <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Aucun contenu du document sur cette semaine.
            </p>
          )}
```

Vérifier que `ProgressionSemaine` est bien importé en haut du fichier (il l'est déjà, ligne 5).

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/components/methodes/__tests__/SourceContentPreview.test.tsx`
Expected: PASS, tous les tests du fichier.

Note: le test « affiche une semaine vide » cherche `Semaine 1` en texte. Avec une date fournie, le titre devient `Semaine du 31 août` et `Semaine 1` apparaît dans le sous-titre: c'est bien ce que le test vérifie.

- [ ] **Step 5: Commit**

```bash
git add src/components/methodes/SourceContentPreview.tsx src/components/methodes/__tests__/SourceContentPreview.test.tsx
git commit -m "Apercu d'import: afficher la date reelle et les semaines vides"
```

---

## Task 5: Le bandeau de calage

Un composant petit et sans état: il reçoit un `Calage` et deux callbacks, il affiche la phrase de transparence, les avertissements, et les deux boutons.

**Files:**
- Create: `src/components/methodes/BandeauCalage.tsx`
- Test: `src/components/methodes/__tests__/BandeauCalage.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/components/methodes/__tests__/BandeauCalage.test.tsx`:

```tsx
/** @jest-environment jsdom */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BandeauCalage from '@/components/methodes/BandeauCalage'
import type { Calage } from '@/lib/calage-semaines'

const CALAGE: Calage = {
  lignes: [],
  base: 'numeros',
  decalage: 0,
  avertissements: [],
  peutAvancer: true,
  peutReculer: true,
}

describe('BandeauCalage', () => {
  test('dit franchement quand le calage repose sur le seul ordre du document', () => {
    render(
      <BandeauCalage
        calage={{ ...CALAGE, base: 'ordre' }}
        onDecalage={() => {}}
      />
    )

    expect(screen.getByText(/ne numérote pas ses semaines/)).toBeInTheDocument()
  })

  test('décale d’une semaine vers l’avant au clic', async () => {
    const user = userEvent.setup()
    const onDecalage = jest.fn()
    render(<BandeauCalage calage={CALAGE} onDecalage={onDecalage} />)

    await user.click(screen.getByRole('button', { name: 'Décaler tout d’une semaine plus tard' }))

    expect(onDecalage).toHaveBeenCalledWith(1)
  })

  test('grise le bouton quand le décalage sortirait de l’année', async () => {
    render(
      <BandeauCalage
        calage={{ ...CALAGE, peutAvancer: false }}
        onDecalage={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: 'Décaler tout d’une semaine plus tard' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Décaler tout d’une semaine plus tôt' })).toBeEnabled()
  })

  test('affiche les avertissements du calage', () => {
    render(
      <BandeauCalage
        calage={{ ...CALAGE, avertissements: ['Ces numéros apparaissent plusieurs fois : 3.'] }}
        onDecalage={() => {}}
      />
    )

    expect(screen.getByText('Ces numéros apparaissent plusieurs fois : 3.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/components/methodes/__tests__/BandeauCalage.test.tsx`
Expected: FAIL avec `Cannot find module '@/components/methodes/BandeauCalage'`.

- [ ] **Step 3: Écrire le composant**

Créer `src/components/methodes/BandeauCalage.tsx`:

```tsx
'use client'

import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import Bouton from '@/components/ui/Bouton'
import type { Calage } from '@/lib/calage-semaines'

type BandeauCalageProps = {
  calage: Calage
  /** Nouveau décalage total, en semaines. Le parent recalcule localement. */
  onDecalage: (decalage: number) => void
}

// L'écran doit être honnête sur sa certitude: un calage déduit du seul ordre de
// la liste n'est pas un calage sûr, et c'est exactement là que les boutons
// servent.
const PHRASES: Record<Calage['base'], string> = {
  numeros: 'Ton document numérote ses semaines : le contenu est placé sur ces numéros.',
  dates: 'Ton document donne des dates : le contenu est placé sur les semaines correspondantes.',
  ordre: 'Ton document ne numérote pas ses semaines : le contenu est placé dans l’ordre, à partir de la première semaine de la rentrée. Vérifie que ça tombe juste.',
}

export default function BandeauCalage({ calage, onDecalage }: BandeauCalageProps) {
  return (
    <section
      aria-label="Placement dans l’année"
      className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-lg border border-violet-200 bg-white p-2 text-violet-700">
          <CalendarClock size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-3">
          <p className="text-sm leading-6 text-slate-700">{PHRASES[calage.base]}</p>

          {calage.avertissements.map(avertissement => (
            <p
              key={avertissement}
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
            >
              {avertissement}
            </p>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <Bouton
              type="button"
              variant="contour"
              size="sm"
              icon={ChevronLeft}
              disabled={!calage.peutReculer}
              onClick={() => onDecalage(calage.decalage - 1)}
            >
              Décaler tout d&rsquo;une semaine plus tôt
            </Bouton>
            <Bouton
              type="button"
              variant="contour"
              size="sm"
              iconRight={ChevronRight}
              disabled={!calage.peutAvancer}
              onClick={() => onDecalage(calage.decalage + 1)}
            >
              Décaler tout d&rsquo;une semaine plus tard
            </Bouton>
            {calage.decalage !== 0 && (
              <Bouton
                type="button"
                variant="fantome"
                size="sm"
                onClick={() => onDecalage(0)}
              >
                Revenir au placement d&rsquo;origine
              </Bouton>
            )}
          </div>

          {!calage.peutAvancer && (
            <p className="text-xs text-slate-600">
              Impossible d&rsquo;aller plus loin : la dernière semaine du document atteint déjà
              la semaine 36.
            </p>
          )}
          {!calage.peutReculer && (
            <p className="text-xs text-slate-600">
              Impossible de reculer davantage : la première semaine du document est déjà la
              semaine 1.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/components/methodes/__tests__/BandeauCalage.test.tsx`
Expected: PASS, 4 tests.

Si un `getByRole('button', { name: ... })` échoue, c'est presque toujours l'apostrophe: le composant écrit `d&rsquo;une` qui rend l'apostrophe typographique `’`, et le test doit utiliser la même. Les deux sont déjà alignés ci-dessus.

- [ ] **Step 5: Commit**

```bash
git add src/components/methodes/BandeauCalage.tsx src/components/methodes/__tests__/BandeauCalage.test.tsx
git commit -m "Ajouter le bandeau de calage: transparence et decalage en un clic"
```

---

## Task 6: Câbler l'importeur

C'est ici qu'on compose le nouvel écran et qu'on fait retomber le décalage dans les données enregistrées.

**Point tranché pendant la revue du plan, à lire avant de coder.** La spec se contredit sur un détail: elle demande à la fois que « les semaines vides survivent au nettoyage de `SourceImporter` » et que « le stockage reste compact, les semaines vides ne sont pas enregistrées, le trou dans la numérotation porte l'information ». Les deux sont conciliables une fois la tâche 2 faite: ce qui était dangereux, c'était de supprimer une semaine vide **alors que les numéros étaient réécrits par position**, car la suppression décalait alors tout le reste. Les numéros étant désormais conservés, supprimer une ligne vide **au moment de l'enregistrement seulement** ne perd rien: le trou dans la numérotation dit exactement la même chose. `nettoyerSemaines` garde donc son comportement, et la règle devient: **jamais de suppression avant l'affichage, compactage uniquement à l'enregistrement.**

**Files:**
- Modify: `src/components/methodes/SourceImporter.tsx`
- Test: `src/components/methodes/__tests__/SourceImporter.test.tsx`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter ces deux tests dans `src/components/methodes/__tests__/SourceImporter.test.tsx`, dans le `describe('SourceImporter', ...)` existant. Ils réutilisent les helpers déjà présents dans ce fichier: `reponseJson` (ligne 38), la constante `REPONSE_MANUEL` (ligne 22), et le bouton de validation qui s'appelle `Ajouter cette source`.

```tsx
  test('affiche une première semaine de rentrée vide sans l’enregistrer, et garde la numérotation', async () => {
    const onSourceReady = jest.fn()
    // Le manuel commence en semaine 2: la semaine 1 est laissée à l'accueil.
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      avertissements: [],
      base_calage: 'numeros',
      progression: [{ numero: 2, items: ['Découvrir le son a'], pages: '', mots_exemple: [] }],
    }))
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

    // La semaine 1 est visible, vide et datée: elle ne disparaît plus.
    expect(await screen.findByText('Aucun contenu du document sur cette semaine.'))
      .toBeInTheDocument()
    expect(screen.getByText('Semaine du 31 août')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))
    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))

    // Le stockage reste compact, mais le numéro 2 est conservé: l'année n'est
    // plus décalée d'un cran.
    expect(onSourceReady.mock.calls[0][0].semaines).toEqual([
      { numero: 2, items: ['Découvrir le son a'], pages: '', mots_exemple: [] },
    ])
  })

  test('le bouton de décalage change réellement la semaine enregistrée', async () => {
    const onSourceReady = jest.fn()
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({
      ...REPONSE_MANUEL,
      avertissements: [],
      base_calage: 'ordre',
      progression: [{ numero: 1, items: ['Découvrir le son a'], pages: '', mots_exemple: [] }],
    }))
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

    const plusTard = await screen.findByRole('button', {
      name: 'Décaler tout d’une semaine plus tard',
    })
    // Recalcul purement local: aucun nouvel appel réseau.
    fireEvent.click(plusTard)
    expect(jest.mocked(fetch)).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette source' }))
    await waitFor(() => expect(onSourceReady).toHaveBeenCalledTimes(1))

    expect(onSourceReady.mock.calls[0][0].semaines).toEqual([
      { numero: 2, items: ['Découvrir le son a'], pages: '', mots_exemple: [] },
    ])
  })
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx jest src/components/methodes/__tests__/SourceImporter.test.tsx`
Expected: FAIL. Les props `rentreeDate` / `zone` n'existent pas encore (erreur de types ts-jest), le texte de la semaine vide est introuvable puisque la semaine 1 n'est pas affichée, et le bouton de décalage n'existe pas.

- [ ] **Step 3: Modifier l'importeur**

Dans `src/components/methodes/SourceImporter.tsx`:

**3a.** Ajouter les imports en tête:

```ts
import BandeauCalage from '@/components/methodes/BandeauCalage'
import { calerSemaines, type BaseCalage } from '@/lib/calage-semaines'
import type { ZoneScolaire } from '@/lib/calendrier-officiel'
import { baseCalageImport } from '@/lib/ia/schema-import-auto'
```

**3b.** Ajouter deux props optionnelles à `SourceImporterProps` (lignes 17 à 23):

```ts
  /** Date de rentrée de la classe. Absente = ni bandeau ni dates. */
  rentreeDate?: string
  zone?: ZoneScolaire
```

et les déstructurer dans la signature du composant (ligne 182), après `methodeInitiale = ''`:

```ts
  rentreeDate,
  zone,
```

**3c.** Ajouter `baseCalage` au type `AnalyseSource` (après `avertissements`):

```ts
  baseCalage: BaseCalage
```

et à `ReponseImport`:

```ts
  base_calage?: unknown
```

**3d.** Renseigner ce champ dans `prochaineAnalyse` (vers la ligne 273), après `avertissements,`:

```ts
        baseCalage: baseCalageImport(data.base_calage),
```

**3e.** Documenter `nettoyerSemaines` (lignes 89 à 99). Le corps ne change pas: elle continue de ne pas enregistrer les semaines entièrement vides, ce qui est le compactage voulu par la spec. Ce qui change, c'est qu'elle n'est plus jamais appelée avant l'affichage. Ajouter ce commentaire juste au-dessus de la fonction pour que personne ne la « corrige » plus tard sans comprendre:

```ts
// Compactage, appelé UNIQUEMENT à l'enregistrement. Une semaine entièrement
// vide n'est pas stockée: le trou dans la numérotation porte déjà la même
// information. Ce n'est sans danger que parce que les numéros sont désormais
// conservés (voir normalizeProgression dans src/lib/ia/schema.ts). Tant qu'ils
// étaient réécrits par position, supprimer une ligne vide décalait toute
// l'année d'un cran, et c'était le bug. Ne jamais appeler cette fonction avant
// l'affichage.
```

**3f.** Ajouter l'état du décalage à côté des autres `useState` (vers la ligne 196):

```ts
  const [decalage, setDecalage] = useState(0)
```

et le remettre à zéro dans `commencerOperation()`, juste après `setAnalyse(null)`:

```ts
    setDecalage(0)
```

**3g.** Calculer le calage juste après `const erreursValidation = ...` (ligne 202):

```ts
  // Recalcul purement local: changer le décalage ne rappelle jamais l'IA.
  const calage = analyse && analyse.typeDocument !== 'programmation' && rentreeDate && zone
    ? calerSemaines({
        semaines: analyse.semaines,
        rentreeDate,
        zone,
        base: analyse.baseCalage,
        decalage,
      })
    : null

  const semainesAffichees = calage
    ? calage.lignes.map(ligne => ({
        numero: ligne.numero,
        items: ligne.items,
        pages: ligne.pages,
        mots_exemple: ligne.motsExemple,
      }))
    : analyse?.semaines ?? []

  const datesParNumero = calage
    ? Object.fromEntries(calage.lignes.map(ligne => [ligne.numero, ligne.dateLundi]))
    : undefined
```

**3h.** Faire retomber le décalage dans les données enregistrées. Dans `validerSource()`, remplacer (vers la ligne 372):

```ts
        semaines: analyse.typeDocument === 'programmation'
          ? []
          : nettoyerSemaines(analyse.semaines),
```

par:

```ts
        semaines: analyse.typeDocument === 'programmation'
          ? []
          // Le décalage appliqué à l'écran est celui qu'on enregistre. Les
          // lignes vides ne sont pas stockées: le trou dans la numérotation
          // porte déjà l'information.
          : nettoyerSemaines(
              analyse.semaines.map(semaine => ({
                ...semaine,
                numero: semaine.numero + decalage,
              })),
            ),
```

**3i.** Composer l'écran. Remplacer le bloc `<SourceContentPreview ... />` (vers la ligne 672) par:

```tsx
            {calage && (
              <div className="mb-4">
                <BandeauCalage calage={calage} onDecalage={setDecalage} />
              </div>
            )}
            <SourceContentPreview
              typeDocument={analyse.typeDocument}
              semaines={semainesAffichees}
              periodes={analyse.periodes}
              datesParNumero={datesParNumero}
              onSemainesChange={semaines => setAnalyse({ ...analyse, semaines })}
              onPeriodesChange={periodes => setAnalyse({ ...analyse, periodes })}
            />
```

Attention au point suivant, c'est le piège de cette tâche: quand `calage` existe, `semainesAffichees` contient les lignes **décalées et trouées**, alors que `analyse.semaines` garde les numéros d'origine. `onSemainesChange` réécrit `analyse.semaines`. Pour éviter que l'édition manuelle et le décalage se contredisent, remplacer le `onSemainesChange` ci-dessus par:

```tsx
              onSemainesChange={semaines => setAnalyse({
                ...analyse,
                semaines: semaines.map(semaine => ({
                  ...semaine,
                  numero: semaine.numero - decalage,
                })),
              })}
```

- [ ] **Step 4: Lancer les tests du fichier**

Run: `npx jest src/components/methodes/__tests__/SourceImporter.test.tsx`
Expected: PASS.

Des tests existants de ce fichier peuvent devenir faux parce qu'ils comptaient les semaines affichées. Les corriger dans le sens de la nouvelle règle (une semaine vide est affichée mais pas enregistrée), pas l'inverse. Les tests existants ne passent ni `rentreeDate` ni `zone`, donc pour eux `calage` vaut `null` et l'affichage est exactement celui d'avant: ils ne devraient pas bouger.

- [ ] **Step 5: Lancer toute la suite**

Run: `npx jest`
Expected: PASS. `MethodesEditor` et `AssistantFlottant` ne passent ni `rentreeDate` ni `zone`: leur comportement est inchangé, `calage` y vaut `null`.

- [ ] **Step 6: Commit**

```bash
git add src/components/methodes/SourceImporter.tsx src/components/methodes/__tests__/SourceImporter.test.tsx
git commit -m "Import: brancher le bandeau de calage et le decalage local"
```

---

## Task 7: La date de rentrée passe avant l'import

Sans elle, l'écran de calage ne peut pas afficher une seule date. L'écran de rentrée existe déjà et sa valeur est pré-remplie, donc le coût pour l'enseignante est d'un clic.

**Files:**
- Modify: `src/app/(app)/setup/page.tsx:48-54, 113-139`
- Modify: `src/components/setup/ProgressionsSetup.tsx:14-17, 36-40, 133-136`
- Test: `src/app/(app)/setup/page.test.tsx:134-144`

- [ ] **Step 1: Retourner le test existant**

Dans `src/app/(app)/setup/page.test.tsx`, **remplacer** le helper (lignes 134 à 144):

```tsx
async function allerJusquaLaFinalisation(
  user: ReturnType<typeof userEvent.setup>,
  avecSources: boolean,
) {
  await user.click(screen.getByRole('button', {
    name: avecSources ? 'Continuer avec plusieurs sources' : 'Continuer sans source',
  }))
  await user.click(screen.getByRole('button', { name: 'Valider la rentrée' }))
  await user.click(screen.getByRole('button', { name: 'Valider les élèves' }))
  await user.click(screen.getByRole('button', { name: /^Partir d'une grille vide/ }))
}
```

par:

```tsx
async function allerJusquaLaFinalisation(
  user: ReturnType<typeof userEvent.setup>,
  avecSources: boolean,
) {
  // La date de rentrée vient AVANT l'import: sans elle, l'écran d'import ne
  // peut pas montrer les vraies dates des semaines.
  await user.click(screen.getByRole('button', { name: 'Valider la rentrée' }))
  await user.click(screen.getByRole('button', {
    name: avecSources ? 'Continuer avec plusieurs sources' : 'Continuer sans source',
  }))
  await user.click(screen.getByRole('button', { name: 'Valider les élèves' }))
  await user.click(screen.getByRole('button', { name: /^Partir d'une grille vide/ }))
}
```

Et ajouter ce test dans le `describe` existant:

```tsx
  test('demande la date de rentrée en toute première étape', () => {
    render(<SetupPage />)

    expect(screen.getByText('Date de la rentrée')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Valider la rentrée' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest "src/app/(app)/setup/page.test.tsx"`
Expected: FAIL. Le bouton `Valider la rentrée` n'est pas rendu à l'étape 1, donc `getByRole` lève `Unable to find an accessible element`.

- [ ] **Step 3: Inverser les étapes**

Dans `src/app/(app)/setup/page.tsx`:

**3a.** Remplacer `stepTitles` et `stepHelp` (lignes 48 à 54) par:

```tsx
  const stepTitles = ['Date de la rentrée', 'Tes progressions', 'Tes élèves', 'Ton emploi du temps']
  const stepHelp = [
    'Choisis le jour de la rentrée et ta zone : l’appli place les 36 semaines en sautant les vacances, et pourra dater tes documents importés.',
    'Ajoute les documents que tu as déjà, pour toutes tes matières. Tu peux aussi continuer sans source et tout compléter plus tard.',
    'Ajoute les prénoms de tes élèves. Tu peux aussi le faire plus tard, dans Paramètres.',
    'Indique tes horaires de la semaine : ils servent à pré-remplir ton cahier journal jour par jour.',
  ]
```

**3b.** Remplacer le bloc `{step === 1 && (<ProgressionsSetup ... />)}` (lignes 113 à 121) par l'écran de rentrée:

```tsx
      {step === 1 && (
        <RentreeDatePicker initial={data.rentreeDate} initialZone={data.zoneScolaire ?? 'A'}
          onSelect={(rentreeDate, zoneScolaire) => {
            setData(d => ({ ...d, rentreeDate, zoneScolaire })); setStep(2)
          }} />
      )}
```

**3c.** Remplacer le bloc `{step === 2 && (<RentreeDatePicker ... />)}` (lignes 130 à 135) par l'écran des progressions, qui reçoit maintenant la date:

```tsx
      {step === 2 && (
        <ProgressionsSetup
          initialSources={data.sourcesProgression}
          rentreeDate={data.rentreeDate}
          zone={data.zoneScolaire}
          onContinue={sources => {
            setData(d => ({ ...d, sourcesProgression: sources }))
            setStep(3)
          }}
        />
      )}
```

**3d.** Le bandeau de découverte (`DemoButton`) est conditionné à `step === 1` ligne 84. Il doit rester sur l'écran des progressions, qui est maintenant l'étape 2. Remplacer `{step === 1 && !loading && (` par `{step === 2 && !loading && (`.

**3e.** Dans `src/components/setup/ProgressionsSetup.tsx`, ajouter les props et les transmettre.

Type (lignes 14 à 17):

```ts
type ProgressionsSetupProps = {
  initialSources?: SourceProgression[]
  rentreeDate?: string
  zone?: ZoneScolaire
  onContinue: (sources: SourceProgression[]) => void
}
```

Import à ajouter en tête du fichier:

```ts
import type { ZoneScolaire } from '@/lib/calendrier-officiel'
```

Signature (lignes 36 à 39):

```ts
export default function ProgressionsSetup({
  initialSources = [],
  rentreeDate,
  zone,
  onContinue,
}: ProgressionsSetupProps) {
```

Rendu de l'importeur (lignes 133 à 136):

```tsx
      <SourceImporter
        key={importerVersion}
        rentreeDate={rentreeDate}
        zone={zone}
        onSourceReady={ajouterSource}
      />
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest "src/app/(app)/setup/page.test.tsx"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Lancer toute la suite**

Run: `npx jest`
Expected: PASS. Si `src/components/setup/__tests__/ProgressionsSetup.test.tsx` échoue, c'est que les nouvelles props ne sont pas optionnelles: vérifier le `?`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/setup/page.tsx" "src/app/(app)/setup/page.test.tsx" src/components/setup/ProgressionsSetup.tsx
git commit -m "Setup: demander la date de rentree avant d'importer les progressions"
```

---

## Task 8: Vérification complète et journal

**Files:**
- Modify: `MARCHE-A-SUIVRE-CODEX-CLAUDE.md`

- [ ] **Step 1: Vérification des types**

Run: `npx tsc --noEmit`
Expected: aucune sortie (succès).

- [ ] **Step 2: Suite complète**

Run: `npx jest`
Expected: PASS. Le compte doit être supérieur aux 367 tests de départ (les nouveaux tests s'ajoutent, aucun ne disparaît).

- [ ] **Step 3: Build de production**

Run: `npm run build`
Expected: build réussi, 21 pages.

Si le build échoue sur le téléchargement des polices Google, c'est le réseau et non le code: relancer une fois, et le signaler plutôt que de contourner.

- [ ] **Step 4: Vérifier l'absence de tiret cadratin**

Run: `git grep -n "$(printf '—')" -- src docs`
Expected: aucune ligne de résultat. `—` est le tiret cadratin, banni de tout ce que produit ce dépôt. On le cherche par son code plutôt qu'en le tapant, pour ne pas l'introduire dans le plan lui-même.

- [ ] **Step 5: Journal de passation**

Ajouter une entrée en **HAUT** de la liste du journal dans `MARCHE-A-SUIVRE-CODEX-CLAUDE.md` (la convention du fichier est d'ajouter en haut, pas en bas):

```markdown
### 2026-07-26 - Calage des semaines a l'import (Claude)

Un sommaire dont la premiere semaine de la rentree est vide decalait toute
l'annee, en silence. Deux pertes corrigees: `normalizeProgression` ne renumerote
plus, `nettoyerSemaines` ne supprime plus les semaines vides. Nouveau module pur
`src/lib/calage-semaines.ts` qui place les semaines dans l'annee reelle en
reutilisant la chaine de dates de `setup-creation.ts`. Nouvel ecran de
verification (`BandeauCalage.tsx`) avec deux boutons de decalage, recalcul local
sans appel reseau. La date de rentree passe en etape 1 du setup.

Spec: `docs/superpowers/specs/2026-07-26-calage-semaines-import-design.md`
Plan: `docs/superpowers/plans/2026-07-26-calage-semaines-import.md`
```

- [ ] **Step 6: Commit**

```bash
git add MARCHE-A-SUIVRE-CODEX-CLAUDE.md
git commit -m "Journal: calage des semaines a l'import"
```

- [ ] **Step 7: Essai réel dans le navigateur**

Lancer `npm run dev`, ouvrir `http://localhost:3000/setup` et refaire le parcours en vrai:

1. L'étape 1 demande la date de rentrée, pré-remplie.
2. L'étape 2 permet d'importer un sommaire de manuel.
3. Après l'analyse, le bandeau dit sur quoi le calage repose.
4. Chaque semaine porte sa date réelle.
5. Une semaine sans contenu apparaît, marquée « Aucun contenu du document sur cette semaine. »
6. Les deux boutons décalent tout instantanément, sans nouvel appel à l'IA.

Ne pas déclarer la tâche finie avant d'avoir vu ces six points. **Ne pas pousser sur GitHub sans le feu vert explicite de Christophe.**

---

## Notes d'exécution

**Ordre des tâches.** Les tâches 1 à 3 sont indépendantes de l'interface et peuvent être faites d'affilée. Les tâches 4 à 6 se suivent strictement: la 6 consomme la 4 et la 5. La 7 est indépendante mais doit passer avant l'essai réel de la 8.

**La conversation libre n'a rien à construire.** La spec la cite comme troisième élément de l'écran. Vérification faite: `AssistantFlottant` est monté dans `src/app/(app)/layout.tsx:28`, et `/setup` vit sous `(app)`. L'assistant est donc déjà présent pendant tout le parcours d'import. Ce qui manquait, c'est que `/api/ia-chat` appelle lui aussi `normalizeProgression` (`src/app/api/ia-chat/route.ts:72`): sans la tâche 2, une simple conversation de correction pouvait re-casser un calage déjà validé. La tâche 2 protège les deux chemins d'un coup.

**Deux déclarations de la même union.** `BaseCalage` (dans `calage-semaines.ts`) et `BaseCalageImport` (dans `schema-import-auto.ts`) valent tous deux `'numeros' | 'dates' | 'ordre'`. TypeScript les accepte l'un pour l'autre, et le test du Step 1 de la tâche 3 verrouille la liste par `expect(BASES_CALAGE).toEqual(['numeros', 'dates', 'ordre'])`. Si une quatrième base apparaît un jour, ce test échoue et rappelle qu'il y a deux endroits à mettre à jour.

**Ce qui est volontairement hors périmètre**, conformément à la spec: l'édition manuelle ligne par ligne du tableau (l'existant suffit), un décalage par période plutôt que global, et la détection automatique du fait que la première semaine « devrait » être vide. L'enseignante décide, l'application montre et obéit. `MethodesEditor` et `AssistantFlottant` ne sont pas câblés dans ce chantier.

**Règle qui tranche les cas non prévus:** aucune donnée n'est écartée en silence. C'est ce qui a produit le bug, c'est donc ce qui est interdit. Si un cas oblige à choisir entre supprimer une donnée et afficher quelque chose d'imparfait, afficher.
