# Une séance du document, un créneau du cahier journal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire qu'une puce du planning importé devienne une séance, posée dans un seul créneau du cahier journal, le surplus étant affiché en « à placer » au lieu d'être empilé.

**Architecture:** Une colonne `seances jsonb` sur `progression` porte enfin la journée, que l'import remplit depuis la structure du document. Le générateur du cahier journal pose une séance par créneau au lieu de concaténer, et rend le surplus visible. Les progressions de notions (maths, arts, EMC), qui n'ont pas de séances datées, gardent exactement leur comportement actuel.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (PostgreSQL), Jest, sorties structurées de l'API Anthropic.

**Spec:** `docs/superpowers/specs/2026-08-03-import-seances-un-creneau-design.md`

---

## Fichiers touchés

| Fichier | Responsabilité |
|---|---|
| `src/types/index.ts` | types `SeanceProgression`, `SeancePlacer`, champs ajoutés à `ProgressionMatiere` et `JourJournal` |
| `src/lib/progression-seances.ts` (créé) | conversions séances <-> items, seul endroit qui connaît le préfixe « Jour N : » |
| `src/lib/ia/schema.ts` | sortie IA : accepte et conserve les séances |
| `src/lib/ia/prompts.ts` | consignes « une puce = une séance » |
| `src/lib/progression.ts` | `genererProgressionFrancais` transporte les séances jusqu'à la base |
| `supabase/migrations/028_progression_seances.sql` (créé) | colonne `seances` + backfill depuis `items` |
| `src/lib/actions/journal.ts` | lit la colonne `seances` |
| `src/lib/cahier-journal.ts` | placement une séance par créneau + surplus |
| `src/lib/cahier-journal-edition.ts` | `validerContenuJournal` conserve `aPlacer` |
| `src/components/semaine/CahierJournalEditor.tsx` | affiche « à placer » et pose une séance dans un créneau |
| `src/components/methodes/SourceContentPreview.tsx` | vérification par jour avant enregistrement |

Le préfixe « Jour N : » n'est connu que de `progression-seances.ts`. `cahier-journal.ts` ne le relit plus lui-même : il lit `seances`.

---

### Task 1: Conversions séances et items

**Files:**
- Create: `src/lib/progression-seances.ts`
- Modify: `src/types/index.ts`
- Test: `src/lib/__tests__/progression-seances.test.ts`

- [ ] **Step 1: Ajouter les types**

Dans `src/types/index.ts`, après `ProgressionMatiere` :

```ts
/** Une séance telle que le document l'écrit : une puce, une case, une ligne. */
export type SeanceProgression = {
  /** Rang du jour d'ECOLE (1..n), `null` quand le document ne montre pas de jours. */
  jour: number | null
  /** Domaine tel qu'écrit ("LC", "Vocabulaire"), "" si le document n'en donne pas. */
  domaine: string
  /** Texte exact de la puce, "(séance 3)" compris. */
  libelle: string
}

/** Séance qu'aucun créneau n'a pu accueillir. */
export type SeancePlacer = {
  libelle: string
  /** "Jour 5" hors semaine, "semaine" si non datée, sinon `null`. */
  origine: string | null
}
```

Puis ajouter le champ à `ProgressionMatiere` :

```ts
export type ProgressionMatiere = {
  methode_id: string | null
  matiere: string
  items: string[]
  pages: string | null
  mots_exemple: string[] | null
  seances?: SeanceProgression[] | null
}
```

- [ ] **Step 2: Écrire le test qui échoue**

Créer `src/lib/__tests__/progression-seances.test.ts` :

```ts
import { seancesDepuisItems, itemsDepuisSeances } from '../progression-seances'

describe('seancesDepuisItems', () => {
  it('lit le jour dans le préfixe et le retire du libellé', () => {
    expect(seancesDepuisItems(['Jour 2 : Grammaire'])).toEqual([
      { jour: 2, domaine: '', libelle: 'Grammaire' },
    ])
  })

  it('laisse jour à null quand il n’y a pas de préfixe', () => {
    expect(seancesDepuisItems(['Nombres jusqu’à 10'])).toEqual([
      { jour: null, domaine: '', libelle: 'Nombres jusqu’à 10' },
    ])
  })

  it('ne prend pas le « (séance 3) » du document pour un jour', () => {
    expect(seancesDepuisItems(['LC : La petite poule (séance 3)'])).toEqual([
      { jour: null, domaine: 'LC', libelle: 'LC : La petite poule (séance 3)' },
    ])
  })

  it('garde le domaine écrit avant les deux points', () => {
    expect(seancesDepuisItems(['Jour 1 : Vocabulaire : les émotions'])).toEqual([
      { jour: 1, domaine: 'Vocabulaire', libelle: 'Vocabulaire : les émotions' },
    ])
  })

  it('ignore les entrées vides', () => {
    expect(seancesDepuisItems(['', '   '])).toEqual([])
  })
})

describe('itemsDepuisSeances', () => {
  it('remet le préfixe de jour pour que l’ancien affichage reste identique', () => {
    expect(itemsDepuisSeances([
      { jour: 2, domaine: '', libelle: 'Grammaire' },
      { jour: null, domaine: '', libelle: 'Nombres jusqu’à 10' },
    ])).toEqual(['Jour 2 : Grammaire', 'Nombres jusqu’à 10'])
  })

  it('fait l’aller-retour sans rien perdre', () => {
    const items = ['Jour 1 : LC : La petite poule (séance 1)', 'Jour 3 : Fluence']
    expect(itemsDepuisSeances(seancesDepuisItems(items))).toEqual(items)
  })
})
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/lib/__tests__/progression-seances.test.ts`
Expected: FAIL, `Cannot find module '../progression-seances'`

- [ ] **Step 4: Écrire l'implémentation minimale**

Créer `src/lib/progression-seances.ts` :

```ts
import type { SeanceProgression } from '@/types'

/**
 * Marqueur de jour en tête d'un item : « Jour 2 : Grammaire ».
 *
 * Ce fichier est le SEUL endroit qui connaît cette convention. Elle date de
 * l'époque où la table n'avait pas de colonne pour la journée : le jour ne
 * survivait que dans le texte. On la relit pour reprendre l'existant, et on la
 * réécrit pour que tout ce qui lit encore `items` continue de fonctionner.
 */
const PREFIXE_JOUR = /^\s*jours?\s*(\d+)\s*[:.\-–—]\s*/i

/**
 * Domaine = ce qui précède les deux points, quand c'est court.
 *
 * « LC : La petite poule » donne "LC". Une phrase entière suivie de deux points
 * n'est pas un domaine : au-delà de 30 caractères on renonce plutôt que de
 * couper une phrase au hasard.
 */
const MAX_DOMAINE = 30

function domaineDe(libelle: string): string {
  const coupe = libelle.indexOf(':')
  if (coupe < 1 || coupe > MAX_DOMAINE) return ''
  return libelle.slice(0, coupe).trim()
}

export function seancesDepuisItems(items: string[]): SeanceProgression[] {
  return items
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map(item => {
      const trouve = item.match(PREFIXE_JOUR)
      const libelle = trouve ? item.replace(PREFIXE_JOUR, '').trim() : item
      const numero = trouve ? Number(trouve[1]) : NaN
      return {
        jour: Number.isInteger(numero) && numero > 0 ? numero : null,
        domaine: domaineDe(libelle),
        libelle,
      }
    })
}

export function itemsDepuisSeances(seances: SeanceProgression[]): string[] {
  return seances.map(s => (s.jour ? `Jour ${s.jour} : ${s.libelle}` : s.libelle))
}
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/lib/__tests__/progression-seances.test.ts`
Expected: PASS, 7 tests

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/progression-seances.ts src/lib/__tests__/progression-seances.test.ts
git commit -m "Conversions seances et items, seul endroit qui connait le prefixe Jour N"
```

---

### Task 2: L'IA rend des séances

**Files:**
- Modify: `src/lib/ia/schema.ts`
- Test: `src/lib/ia/__tests__/schema.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `src/lib/ia/__tests__/schema.test.ts` :

```ts
import { normalizeProgression } from '../schema'
import { seancesDepuisItems } from '@/lib/progression-seances'

describe('séances rendues par l’IA', () => {
  it('conserve les séances et leur jour', () => {
    const brut = [{
      numero: 1, pages: '', mots_exemple: [], items: [],
      seances: [
        { jour: 1, domaine: 'LC', libelle: 'LC : La petite poule (séance 1)' },
        { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
        { jour: 3, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 1)' },
      ],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toHaveLength(3)
    expect(semaine.seances?.filter(s => s.jour === 1)).toHaveLength(2)
  })

  it('remplit items depuis les séances pour l’affichage existant', () => {
    const brut = [{
      numero: 1, pages: '', mots_exemple: [], items: [],
      seances: [{ jour: 2, domaine: '', libelle: 'Grammaire' }],
    }]
    expect(normalizeProgression(brut)[0].items).toEqual(['Jour 2 : Grammaire'])
  })

  it('retombe sur items quand le modèle ne rend pas de séances', () => {
    const brut = [{ numero: 1, items: ['Jour 2 : Grammaire'], pages: '', mots_exemple: [] }]
    expect(normalizeProgression(brut)[0].seances).toEqual(seancesDepuisItems(['Jour 2 : Grammaire']))
  })

  it('concatène les séances de deux lignes portant la même semaine, sans les fusionner', () => {
    const brut = [
      { numero: 1, items: [], pages: '', mots_exemple: [],
        seances: [{ jour: 1, domaine: 'Nombres', libelle: 'Nombres : jusqu’à 5' }] },
      { numero: 1, items: [], pages: '', mots_exemple: [],
        seances: [{ jour: 1, domaine: 'Calcul', libelle: 'Calcul : doubles' }] },
    ]
    const semaines = normalizeProgression(brut)
    expect(semaines).toHaveLength(1)
    expect(semaines[0].seances).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx jest src/lib/ia/__tests__/schema.test.ts`
Expected: FAIL, `semaine.seances` vaut `undefined`

- [ ] **Step 3: Écrire l'implémentation**

Dans `src/lib/ia/schema.ts`, ajouter `seances` au schéma JSON, à l'intérieur de `properties` de l'objet semaine, avant `pages` :

```ts
          seances: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                jour: { type: ['integer', 'null'] },
                domaine: { type: 'string' },
                libelle: { type: 'string' },
              },
              required: ['jour', 'domaine', 'libelle'],
            },
          },
```

et ajouter `'seances'` à la liste `required` de la semaine.

En tête du fichier :

```ts
import { seancesDepuisItems, itemsDepuisSeances } from '@/lib/progression-seances'
import type { SeanceProgression } from '@/types'
```

Ajouter le nettoyage des séances :

```ts
function toSeances(v: unknown): SeanceProgression[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((raw): SeanceProgression[] => {
    const o = (raw ?? {}) as Record<string, unknown>
    const libelle = typeof o.libelle === 'string' ? o.libelle.trim() : ''
    if (!libelle) return []
    const jour = typeof o.jour === 'number' && Number.isInteger(o.jour) && o.jour > 0 ? o.jour : null
    return [{ jour, domaine: typeof o.domaine === 'string' ? o.domaine.trim() : '', libelle }]
  })
}
```

Dans `nettoyerSemainesBrutes`, remplacer le `return { ... }` par :

```ts
    // Les séances font foi quand le modèle en rend. Sinon on les reconstruit
    // depuis items : un modèle qui retombe sur l'ancien format ne doit pas
    // faire perdre la journée, elle est encore lisible dans le préfixe.
    const seances = toSeances(o.seances)
    const items = toStringArray(o.items)
    const retenues = seances.length ? seances : seancesDepuisItems(items)
    return {
      numero: typeof o.numero === 'number' ? o.numero : 0,
      items: retenues.length ? itemsDepuisSeances(retenues) : items,
      pages: typeof o.pages === 'string' ? o.pages.trim() : '',
      mots_exemple: toStringArray(o.mots_exemple),
      seances: retenues,
    }
```

Dans `fusionnerParNumero`, après la fusion des `mots_exemple`, ajouter la concaténation des séances (elles ne se dédoublonnent PAS : deux séances identiques dans deux domaines restent deux séances) :

```ts
    deja.seances = [...(deja.seances ?? []), ...(s.seances ?? [])]
```

Enfin, élargir le type de `ProgressionSemaine` dans `src/data/manuels/index.ts` :

```ts
export type ProgressionSemaine = {
  numero: number
  items: string[]
  pages: string
  mots_exemple: string[]
  seances?: SeanceProgression[]
}
```

avec `import type { SeanceProgression } from '@/types'` en tête du fichier.

- [ ] **Step 4: Lancer toute la suite du schéma**

Run: `npx jest src/lib/ia/__tests__/schema.test.ts`
Expected: PASS, y compris les tests existants sur la fusion et le calage

- [ ] **Step 5: Commit**

```bash
git add src/lib/ia/schema.ts src/lib/ia/__tests__/schema.test.ts src/data/manuels/index.ts
git commit -m "L IA rend des seances datees, items reste alimente pour l affichage"
```

---

### Task 3: Les consignes d'import

**Files:**
- Modify: `src/lib/ia/prompts.ts`
- Test: `src/lib/ia/__tests__/prompts.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `src/lib/ia/__tests__/prompts.test.ts` :

```ts
import { systemImportPeriode } from '../prompts'

describe('consignes de séances', () => {
  const prompt = systemImportPeriode('francais')

  it('interdit de fusionner ou de découper une puce', () => {
    expect(prompt).toMatch(/ne fusionne jamais deux puces/i)
    expect(prompt).toMatch(/ne découpe jamais une puce/i)
  })

  it('interdit d’inventer un jour', () => {
    expect(prompt).toMatch(/n’invente aucun jour|n'invente aucun jour/i)
  })

  it('dit que le « (séance N) » du document n’est pas un jour', () => {
    expect(prompt).toMatch(/\(séance/i)
    expect(prompt).toMatch(/pas un numéro de jour/i)
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/lib/ia/__tests__/prompts.test.ts`
Expected: FAIL sur les trois attentes

- [ ] **Step 3: Écrire les consignes**

Dans `src/lib/ia/prompts.ts`, dans `systemImportPeriode`, remplacer la règle
`- "items" = TOUTES les séances de la semaine, une par entrée. N'en omets aucune, même si elle se répète d'une semaine à l'autre.`
par :

```
- "seances" = TOUTES les séances de la semaine, une par entrée, dans l'ordre de
  lecture. Une puce, une case élémentaire, une ligne de liste = UNE séance.
  Ne fusionne jamais deux puces en une entrée, et ne découpe jamais une puce en
  deux entrées. N'en omets aucune, même si elle se répète d'une semaine à l'autre.
- "jour" = le rang de la colonne-jour où se trouve la puce : 1 pour "JOUR 1",
  2 pour "JOUR 2", et ainsi de suite. Si le document ne montre pas de colonnes de
  jours, mets null : n’invente aucun jour.
- Attention : un "(séance 3)" écrit DANS le libellé est le compteur de cette
  activité sur toute la période, ce n'est PAS un numéro de jour. Laisse-le dans
  le libellé et ne t'en sers jamais pour remplir "jour".
- "domaine" = ce qui précède les deux points dans la puce ("LC", "Vocabulaire",
  "Geste d'écriture"), sinon "".
- "libelle" = le texte EXACT de la puce, sans reformulation ni résumé.
- "items" = reprends les mêmes séances, une par entrée, sans le rang de jour.
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/lib/ia/__tests__/prompts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ia/prompts.ts src/lib/ia/__tests__/prompts.test.ts
git commit -m "Consignes d import : une puce est une seance, le (seance N) n est pas un jour"
```

---

### Task 4: La colonne en base et son remplissage

**Files:**
- Create: `supabase/migrations/028_progression_seances.sql`
- Modify: `src/lib/progression.ts`, `src/lib/actions/journal.ts`
- Test: `src/lib/__tests__/progression-francais-seances.test.ts`

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/028_progression_seances.sql` :

```sql
-- Une séance du document = une entrée. La journée n'avait aucun endroit où
-- exister : elle ne survivait que dans le préfixe texte « Jour N : » d'un item.
alter table progression add column if not exists seances jsonb not null default '[]'::jsonb;

-- Reprise de l'existant : les progressions déjà importées gardent leur contenu
-- et retrouvent leur journée, sans réimport.
update progression p set seances = (
  select coalesce(jsonb_agg(jsonb_build_object(
    'jour',    nullif((regexp_match(item, '^\s*[Jj]ours?\s*(\d+)\s*[:.\-]'))[1], '')::int,
    'domaine', '',
    'libelle', regexp_replace(item, '^\s*[Jj]ours?\s*\d+\s*[:.\-]\s*', '')
  ) order by ord), '[]'::jsonb)
  from unnest(p.items) with ordinality as t(item, ord)
)
where jsonb_array_length(p.seances) = 0 and coalesce(array_length(p.items, 1), 0) > 0;
```

- [ ] **Step 2: Écrire le test qui échoue**

Créer `src/lib/__tests__/progression-francais-seances.test.ts` :

```ts
import { genererProgressionFrancais } from '../progression'

describe('genererProgressionFrancais', () => {
  it('transporte les séances jusqu’aux lignes à écrire en base', () => {
    const lignes = genererProgressionFrancais('import', [
      {
        numero: 1, items: ['Jour 1 : Graphème A'], pages: 'p.4', mots_exemple: [],
        seances: [{ jour: 1, domaine: '', libelle: 'Graphème A' }],
      },
    ])
    expect(lignes[0].seances).toEqual([{ jour: 1, domaine: '', libelle: 'Graphème A' }])
  })

  it('rend un tableau vide quand la semaine n’a pas de séances', () => {
    const lignes = genererProgressionFrancais('import', [
      { numero: 1, items: ['Nombres jusqu’à 10'], pages: '', mots_exemple: [] },
    ])
    expect(lignes[0].seances).toEqual([])
  })
})
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/lib/__tests__/progression-francais-seances.test.ts`
Expected: FAIL, `seances` n'existe pas sur le retour

- [ ] **Step 4: Écrire l'implémentation**

Dans `src/lib/progression.ts`, `genererProgressionFrancais` : élargir le type de retour et transporter les séances.

```ts
export function genererProgressionFrancais(
  manuelId: string,
  customProgression?: ProgressionSemaine[],
): Array<{
  numero: number
  items: string[]
  pages: string | null
  mots_exemple: string[] | null
  seances: SeanceProgression[]
}> {
  const semaines = customProgression ?? MANUELS_DATA[manuelId as keyof typeof MANUELS_DATA]?.semaines
  if (!semaines) return []
  return semaines.slice(0, 36).map((s, i) => ({
    numero: i + 1,
    items: s.items,
    pages: s.pages || null,
    mots_exemple: s.mots_exemple ?? null,
    seances: s.seances ?? [],
  }))
}
```

avec `import type { SeanceProgression } from '@/types'` en tête du fichier.

Dans `src/lib/actions/journal.ts`, aux DEUX endroits qui lisent la progression
(lignes 73 et son équivalent plus bas), ajouter la colonne au select :

```ts
      supabase.from('progression').select('methode_id, matiere, items, pages, mots_exemple, seances')
      .eq('class_id', semaine.class_id).eq('numero', semaine.numero),
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/lib/__tests__/progression-francais-seances.test.ts`
Expected: PASS, 2 tests

- [ ] **Step 6: Appliquer la migration**

La migration s'applique via le connecteur Supabase, jamais à la main dans le
tableau de bord. Vérifier ensuite d'un coup d'oeil qu'une progression déjà en
base a bien récupéré ses séances :

```sql
select numero, jsonb_array_length(seances) as nb_seances, array_length(items, 1) as nb_items
from progression order by numero limit 5;
```
Expected: `nb_seances` égal à `nb_items` sur chaque ligne.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/028_progression_seances.sql src/lib/progression.ts src/lib/actions/journal.ts src/lib/__tests__/progression-francais-seances.test.ts
git commit -m "Colonne seances sur progression, remplie a l import et pour l existant"
```

---

### Task 5: Une séance par créneau

**Files:**
- Modify: `src/lib/cahier-journal.ts`, `src/types/index.ts`
- Test: `src/lib/__tests__/cahier-journal-placement.test.ts`

- [ ] **Step 1: Ajouter `aPlacer` au type du jour**

Dans `src/types/index.ts` :

```ts
export type JourJournal = {
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi'
  seances: SeanceJournal[]
  /** Séances qu'aucun créneau du jour n'a pu accueillir. Jamais empilées. */
  aPlacer?: SeancePlacer[]
}
```

- [ ] **Step 2: Écrire les tests qui échouent**

Créer `src/lib/__tests__/cahier-journal-placement.test.ts` :

```ts
import { genererCahierJournal } from '../cahier-journal'
import type { CreneauHoraire, ProgressionMatiere } from '@/types'

const creneau = (
  ordre: number, matiere: string, type: 'cours' | 'routine' = 'cours',
): CreneauHoraire => ({
  id: `c-${ordre}`, class_id: 'classe', jour: 'lundi',
  heure_debut: '09:00', heure_fin: '09:30', matiere, ordre,
  couleur: null, type, methode_id: null, visible_journal: true,
})

const francais = (seances: ProgressionMatiere['seances']): ProgressionMatiere => ({
  methode_id: null, matiere: 'Français', items: [], pages: null,
  mots_exemple: null, seances,
})

describe('une séance par créneau', () => {
  it('pose chaque séance du jour dans un créneau différent, dans l’ordre', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français'), creneau(1, 'Français'), creneau(2, 'Français')],
      [francais([
        { jour: 1, domaine: 'LC', libelle: 'LC : La petite poule (séance 1)' },
        { jour: 1, domaine: '', libelle: 'Les prénoms (les lettres)' },
        { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
      ])],
    )
    expect(lundi.seances.map(s => s.deroulement)).toEqual([
      'LC : La petite poule (séance 1)',
      'Les prénoms (les lettres)',
      'Geste d’écriture',
    ])
    expect(lundi.aPlacer ?? []).toEqual([])
  })

  it('n’empile jamais deux séances dans le même créneau', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français'), creneau(1, 'Français')],
      [francais([
        { jour: 1, domaine: '', libelle: 'Séance A' },
        { jour: 1, domaine: '', libelle: 'Séance B' },
        { jour: 1, domaine: '', libelle: 'Séance C' },
      ])],
    )
    expect(lundi.seances.map(s => s.deroulement)).toEqual(['Séance A', 'Séance B'])
    expect(lundi.aPlacer).toEqual([{ libelle: 'Séance C', origine: null }])
  })

  it('affiche la matière dans un créneau sans séance', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français'), creneau(1, 'Français')],
      [francais([{ jour: 1, domaine: '', libelle: 'Séance A' }])],
    )
    expect(lundi.seances.map(s => s.deroulement)).toEqual(['Séance A', 'Français'])
  })

  it('ne place rien d’un autre jour', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français')],
      [francais([
        { jour: 2, domaine: '', libelle: 'Séance de mardi' },
        { jour: 1, domaine: '', libelle: 'Séance de lundi' },
      ])],
    )
    expect(lundi.seances[0].deroulement).toBe('Séance de lundi')
  })

  it('laisse les progressions de notions exactement comme avant', () => {
    const notions: ProgressionMatiere = {
      methode_id: null, matiere: 'Maths',
      items: ['Nombres jusqu’à 10', 'Décomposer 4 et 5'],
      pages: 'p.12', mots_exemple: null,
      seances: [
        { jour: null, domaine: '', libelle: 'Nombres jusqu’à 10' },
        { jour: null, domaine: '', libelle: 'Décomposer 4 et 5' },
      ],
    }
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Maths'), creneau(1, 'Maths')], [notions],
    )
    expect(lundi.seances[0].deroulement).toBe('Nombres jusqu’à 10, Décomposer 4 et 5 — p.12')
    expect(lundi.seances[1].deroulement).toBe('Nombres jusqu’à 10, Décomposer 4 et 5 — p.12')
    expect(lundi.aPlacer ?? []).toEqual([])
  })

  it('ne perd pas une séance datée au-delà de la semaine', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français')],
      [francais([
        { jour: 1, domaine: '', libelle: 'Séance A' },
        { jour: 5, domaine: '', libelle: 'Séance hors semaine' },
      ])],
    )
    expect(lundi.aPlacer).toEqual([{ libelle: 'Séance hors semaine', origine: 'Jour 5' }])
  })

  it('montre une séance non datée une seule fois, le premier jour', () => {
    const edt = [creneau(0, 'Français'), { ...creneau(1, 'Français'), jour: 'mardi' as const }]
    const [lundi, mardi] = genererCahierJournal(edt, [francais([
      { jour: 1, domaine: '', libelle: 'Séance de lundi' },
      { jour: null, domaine: '', libelle: 'Consigne de la semaine' },
    ])])
    expect(lundi.aPlacer).toEqual([{ libelle: 'Consigne de la semaine', origine: 'semaine' }])
    expect(mardi.aPlacer ?? []).toEqual([])
  })

  it('ne touche pas aux routines', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Récréation', 'routine'), creneau(1, 'Français')],
      [francais([{ jour: 1, domaine: '', libelle: 'Séance A' }])],
    )
    expect(lundi.seances[0].deroulement).toBe('')
    expect(lundi.seances[1].deroulement).toBe('Séance A')
  })
})
```

- [ ] **Step 3: Lancer les tests et vérifier qu'ils échouent**

Run: `npx jest src/lib/__tests__/cahier-journal-placement.test.ts`
Expected: FAIL, les séances sont concaténées et `aPlacer` n'existe pas

- [ ] **Step 4: Écrire l'implémentation**

Dans `src/lib/cahier-journal.ts`, remplacer tout le corps du fichier à partir de
`function deroulementInitial` jusqu'à la fin par :

```ts
/** Vrai quand le document décrit des séances datées, et pas des notions de semaine. */
function porteDesSeancesDatees(p: ProgressionMatiere | null): boolean {
  return !!p?.seances?.some(s => s.jour !== null)
}

/**
 * Ce qu'affiche un créneau quand aucune progression ne l'alimente : le nom de la
 * matière, comme amorce à compléter.
 *
 * Décision de Christophe le 31/07. Une case vide ne dit pas si l'application n'a
 * rien trouvé ou si la séance n'a rien de prévu, et elle n'invite à rien. Ce
 * n'est pas une invention de contenu : on recopie ce qu'elle a écrit dans son
 * emploi du temps.
 */
function notions(p: ProgressionMatiere, indexJour: number, nbJours: number): string {
  const retenus = itemsDuJour(p.items, indexJour, nbJours)
  if (retenus.length === 0) return ''
  const pages = p.pages ? ` — ${p.pages}` : ''
  const mots = p.mots_exemple?.length ? ` (mots : ${p.mots_exemple.join(', ')})` : ''
  return `${retenus.join(', ')}${pages}${mots}`
}

export function genererCahierJournal(
  emploiDuTemps: CreneauHoraire[],
  progression: ProgressionMatiere[],
): JourJournal[] {
  const parJour = new Map<string, CreneauHoraire[]>()
  for (const c of emploiDuTemps) {
    if (c.visible_journal === false) continue
    const list = parJour.get(c.jour) ?? []
    list.push(c)
    parJour.set(c.jour, list)
  }

  // Les jours d'ECOLE, dans l'ordre : c'est le referentiel des « Jour N » des
  // documents importes. Sans mercredi, « Jour 3 » vaut donc pour le jeudi.
  const joursEcole = JOURS_ORDRE.filter(jour => parJour.has(jour))

  return joursEcole.map((jour, indexJour) => {
    const creneaux = (parJour.get(jour) ?? []).sort((a, b) => a.ordre - b.ordre)
    const aPlacer: SeancePlacer[] = []

    // Une file de séances par progression : chaque créneau de cours en retire
    // UNE. C'est ici que se joue la règle « une puce, une séance, un créneau ».
    const files = new Map<ProgressionMatiere, SeanceProgression[]>()
    for (const p of progression) {
      if (!porteDesSeancesDatees(p)) continue
      files.set(p, (p.seances ?? []).filter(s => s.jour === indexJour + 1))
    }

    const seances = creneaux.map((c): SeanceJournal => {
      const base = {
        matiere: c.matiere, heure_debut: c.heure_debut,
        heure_fin: c.heure_fin, type: c.type,
      }
      if (c.type === 'routine') return { ...base, deroulement: '' }

      const p = progressionPourCreneau(c, progression)
      if (!p) return { ...base, deroulement: c.matiere }
      if (!porteDesSeancesDatees(p)) {
        return { ...base, deroulement: notions(p, indexJour, joursEcole.length) || c.matiere }
      }
      const suivante = files.get(p)?.shift()
      return { ...base, deroulement: suivante ? suivante.libelle : c.matiere }
    })

    // Ce qui n'a trouvé aucun créneau. Rien n'est empilé, rien n'est perdu :
    // l'enseignante le voit et le pose où elle veut.
    for (const restantes of files.values()) {
      for (const s of restantes) aPlacer.push({ libelle: s.libelle, origine: null })
    }
    for (const p of progression) {
      if (!porteDesSeancesDatees(p)) continue
      for (const s of p.seances ?? []) {
        // Un « Jour 5 » sur une semaine de quatre jours ne tombe nulle part :
        // il atterrit au dernier jour en gardant sa mention d'origine.
        if (s.jour !== null && s.jour > joursEcole.length && indexJour === joursEcole.length - 1) {
          aPlacer.push({ libelle: s.libelle, origine: `Jour ${s.jour}` })
        }
        // Une séance sans jour dans un document qui date les autres paraît une
        // seule fois, le premier jour, et surtout pas répétée sur chaque jour.
        if (s.jour === null && indexJour === 0) {
          aPlacer.push({ libelle: s.libelle, origine: 'semaine' })
        }
      }
    }

    return aPlacer.length ? { jour, seances, aPlacer } : { jour, seances }
  })
}
```

Adapter les imports en tête du fichier :

```ts
import {
  CreneauHoraire, JourJournal, SeanceJournal, ProgressionMatiere,
  SeanceProgression, SeancePlacer,
} from '@/types'
```

`itemsDuJour` et `numeroJourItem` restent exportés et inchangés : ils servent
encore aux progressions de notions et sont couverts par leurs tests actuels.

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx jest src/lib/__tests__/cahier-journal-placement.test.ts`
Expected: PASS, 8 tests

- [ ] **Step 6: Lancer toute la suite**

Run: `npx jest`
Expected: PASS. Si `cahier-journal-lundi-reel.test.ts` échoue, ne pas le
retoucher ici : c'est l'objet de la Task 7, et un échec à ce stade doit être
compris avant d'être corrigé.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/lib/cahier-journal.ts src/lib/__tests__/cahier-journal-placement.test.ts
git commit -m "Une seance par creneau, le surplus part en a placer au lieu d etre empile"
```

---

### Task 6: La sauvegarde ne doit pas effacer « à placer »

**Files:**
- Modify: `src/lib/cahier-journal-edition.ts`
- Test: `src/lib/__tests__/cahier-journal-edition.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `src/lib/__tests__/cahier-journal-edition.test.ts` :

```ts
describe('validerContenuJournal', () => {
  it('conserve la liste « à placer » d’un jour', () => {
    const contenu = [{
      jour: 'lundi',
      seances: [{ matiere: 'Français', heure_debut: '09:00', heure_fin: '09:30', type: 'cours', deroulement: 'Séance A' }],
      aPlacer: [{ libelle: 'Séance C', origine: null }],
    }]
    expect(validerContenuJournal(contenu)[0].aPlacer).toEqual([{ libelle: 'Séance C', origine: null }])
  })

  it('accepte un jour sans « à placer »', () => {
    const contenu = [{
      jour: 'lundi',
      seances: [{ matiere: 'Français', heure_debut: '09:00', heure_fin: '09:30', type: 'cours', deroulement: 'Séance A' }],
    }]
    expect(validerContenuJournal(contenu)[0].aPlacer).toBeUndefined()
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/lib/__tests__/cahier-journal-edition.test.ts`
Expected: FAIL, `aPlacer` vaut `undefined` dans le premier test

- [ ] **Step 3: Écrire l'implémentation**

Dans `validerContenuJournal` (`src/lib/cahier-journal-edition.ts:56`), à
l'endroit où l'objet du jour est construit, transporter la liste :

```ts
    const brut = (entree as Record<string, unknown>).aPlacer
    const aPlacer = Array.isArray(brut)
      ? brut.flatMap((x): SeancePlacer[] => {
          const o = (x ?? {}) as Record<string, unknown>
          const libelle = typeof o.libelle === 'string' ? o.libelle.trim() : ''
          if (!libelle) return []
          return [{ libelle, origine: typeof o.origine === 'string' ? o.origine : null }]
        })
      : []
```

et ajouter `...(aPlacer.length ? { aPlacer } : {})` à l'objet `JourJournal`
retourné. Importer `SeancePlacer` depuis `@/types`.

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/lib/__tests__/cahier-journal-edition.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cahier-journal-edition.ts src/lib/__tests__/cahier-journal-edition.test.ts
git commit -m "La sauvegarde du journal conserve la liste a placer"
```

---

### Task 7: Les deux garanties sur le lundi réel

**Files:**
- Modify: `src/lib/__tests__/cahier-journal-lundi-reel.test.ts`

Ce fichier est un filet, pas un test de plus. **Cette tâche va faire changer des
attentes existantes, et c'est voulu.** Aujourd'hui la constante `PROGRESSION`
(ligne 72) porte les items datés de Christophe SANS colonne `seances`, et le
français attend les sept items collés dans chaque créneau. Après la migration,
la base porte les séances, donc la fixture doit les porter aussi : c'est le
réel qui change, pas le test qu'on assouplit.

**À faire valider par Christophe avant de commiter** : les nouvelles valeurs
attendues du français le lundi.

- [ ] **Step 1: Faire porter les séances à la fixture, comme la base après migration**

En tête de `src/lib/__tests__/cahier-journal-lundi-reel.test.ts` :

```ts
import { seancesDepuisItems } from '@/lib/progression-seances'
```

Puis, juste après la déclaration de `PROGRESSION` (ligne 72 et suivantes),
ajouter la dérivation qui reproduit exactement ce que fait la migration 028 :

```ts
/**
 * La migration 028 remplit `seances` à partir des `items` déjà en base, en
 * relisant les préfixes « Jour N : ». La fixture doit donc porter les mêmes
 * séances que la base réelle après migration, sinon elle testerait un état qui
 * n'existe plus nulle part.
 */
const PROGRESSION_MIGREE = PROGRESSION.map(p => ({
  ...p,
  seances: seancesDepuisItems(p.items),
}))
```

Remplacer ensuite `PROGRESSION` par `PROGRESSION_MIGREE` dans tous les appels à
`genererCahierJournal` du fichier.

- [ ] **Step 2: Lancer le test et constater les attentes qui bougent**

Run: `npx jest src/lib/__tests__/cahier-journal-lundi-reel.test.ts`
Expected: FAIL sur les créneaux de français. Le message montre l'ancienne valeur
(les items collés par des virgules) et la nouvelle (une séance par créneau).
Les créneaux de maths et d'EMC ne doivent PAS bouger : leurs items ne sont pas
datés, donc `porteDesSeancesDatees` reste faux pour eux.

**Si un créneau de maths ou d'EMC bouge, arrêter et comprendre.** C'est le
signal d'une régression, pas d'une attente à mettre à jour.

- [ ] **Step 3: Mettre à jour les attentes du français, une par une**

Écrire dans chaque attente la séance réellement attendue, dans l'ordre des
créneaux de français du lundi. Ne pas copier-coller la sortie du test sans la
lire : vérifier que chaque créneau reçoit la séance que le document prévoit pour
le jour 1, et que la dernière séance non placée apparaît bien dans `aPlacer`.

- [ ] **Step 4: Ajouter les deux invariants**

À la fin du fichier :

```ts
describe('invariants du lundi réel', () => {
  const [lundi] = genererCahierJournal(LUNDI, PROGRESSION_MIGREE)

  /** Les libellés de séance de français prévus par le document pour le jour 1. */
  const seancesJour1 = seancesDepuisItems(PROGRESSION[0].items)
    .filter(s => s.jour === 1)
    .map(s => s.libelle)

  it('aucun créneau ne porte deux séances de français', () => {
    for (const seance of lundi.seances) {
      const nbSeancesDedans = seancesJour1.filter(l => seance.deroulement.includes(l)).length
      expect(nbSeancesDedans).toBeLessThanOrEqual(1)
    }
  })

  it('chaque séance du jour paraît une fois et une seule', () => {
    const placees = [...lundi.seances.map(s => s.deroulement), ...(lundi.aPlacer ?? []).map(s => s.libelle)]
    for (const libelle of seancesJour1) {
      expect(placees.filter(d => d === libelle)).toHaveLength(1)
    }
  })
})
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/lib/__tests__/cahier-journal-lundi-reel.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/__tests__/cahier-journal-lundi-reel.test.ts
git commit -m "Le lundi reel garantit qu aucun creneau ne porte deux seances"
```

---

### Task 8: Le planning réel des Petites Poules

**Files:**
- Create: `src/lib/ia/__tests__/planning-petites-poules.test.ts`

Ce test fige la lecture du document qui a déclenché tout le chantier. Il ne
contacte aucune IA : il rejoue la sortie structurée attendue pour ce document et
vérifie que la chaîne de normalisation la conserve intacte.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { normalizeProgression } from '../schema'

/**
 * Semaine 1 du planning réel « La petite poule qui voulait voir la mer »
 * (partage/exemple de planning p1.pdf) : 3 puces au jour 1, 2 au jour 2,
 * 4 au jour 3, 3 au jour 4.
 */
const SEMAINE_1 = [{
  numero: 1, items: [], pages: '', mots_exemple: [],
  seances: [
    { jour: 1, domaine: 'Lecture compréhension', libelle: 'Lecture compréhension : La petite poule qui voulait voir la mer (séance 1)' },
    { jour: 1, domaine: '', libelle: 'Les prénoms de la classe (les lettres de l’alphabet)' },
    { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
    { jour: 2, domaine: 'LC', libelle: 'LC : La petite poule qui voulait voir la mer (séance 2)' },
    { jour: 2, domaine: '', libelle: 'Les prénoms de la classe (le nombre de lettres)' },
    { jour: 3, domaine: 'LC', libelle: 'LC : La petite poule qui voulait voir la mer (séance 3)' },
    { jour: 3, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 1)' },
    { jour: 3, domaine: '', libelle: 'Les prénoms de la classe (le nombre de syllabes)' },
    { jour: 3, domaine: '', libelle: 'Geste d’écriture' },
    { jour: 4, domaine: 'LC', libelle: 'LC : La petite poule qui voulait voir la mer (séance 4)' },
    { jour: 4, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 2)' },
    { jour: 4, domaine: 'Langage oral', libelle: 'Langage oral : Voyelles, de Rimbaud (séance 1)' },
  ],
}]

describe('planning Petites Poules, semaine 1', () => {
  const [semaine] = normalizeProgression(SEMAINE_1)

  it('garde les douze séances', () => {
    expect(semaine.seances).toHaveLength(12)
  })

  it('compte les séances de chaque jour comme le document', () => {
    const parJour = (n: number) => semaine.seances?.filter(s => s.jour === n).length
    expect([parJour(1), parJour(2), parJour(3), parJour(4)]).toEqual([3, 2, 4, 3])
  })

  it('ne prend jamais le « (séance N) » du libellé pour un numéro de jour', () => {
    const vocabulaire = semaine.seances?.find(s => s.libelle === 'Vocabulaire (séance 2)')
    expect(vocabulaire?.jour).toBe(4)
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/lib/ia/__tests__/planning-petites-poules.test.ts`
Expected: PASS (la Task 2 a déjà posé le comportement ; ce test le verrouille
sur le document réel)

- [ ] **Step 3: Commit**

```bash
git add src/lib/ia/__tests__/planning-petites-poules.test.ts
git commit -m "Le planning reel des Petites Poules fige la lecture de la semaine 1"
```

---

### Task 9: Afficher « à placer » dans le cahier journal

**Files:**
- Modify: `src/components/semaine/CahierJournalEditor.tsx`
- Test: `src/components/semaine/__tests__/CahierJournalEditor.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

Le composant ne prend que `semaineId` et `numeroSemaine` : le journal arrive par
`genererOuChargerJournal`, déjà mocké en tête du fichier de test. On ajoute donc
un cas qui fait renvoyer un journal portant `aPlacer`.

Ajouter à `src/components/semaine/__tests__/CahierJournalEditor.test.tsx` :

```tsx
it('affiche les séances qu’aucun créneau n’a pu accueillir', async () => {
  const avecAPlacer: JourJournal[] = [{
    jour: 'lundi',
    seances: [{
      matiere: 'Français', heure_debut: '09:00', heure_fin: '09:30',
      type: 'cours', deroulement: 'Séance A',
    }],
    aPlacer: [{ libelle: 'Geste d’écriture', origine: null }],
  }]
  ;(lireJournal as jest.Mock).mockResolvedValue({ ok: true, valeur: avecAPlacer })

  render(<CahierJournalEditor semaineId="s1" numeroSemaine={1} />)

  expect(await screen.findByText(/à placer ce jour/i)).toBeInTheDocument()
  expect(screen.getByText('Geste d’écriture')).toBeInTheDocument()
})
```

`{ ok: true, valeur: ... }` est bien la forme du type `Resultat<T>`
(`src/lib/resultat.ts:16`), celle qu'utilisent déjà les autres mocks du fichier.

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/components/semaine/__tests__/CahierJournalEditor.test.tsx`
Expected: FAIL, le texte « à placer » est absent

- [ ] **Step 3: Écrire l'affichage**

Dans `CahierJournalEditor.tsx`, à la fin du bloc d'un jour (après le tableau des
séances, avant la fermeture du `<div>` du jour ouvert ligne 331) :

```tsx
          {jour.aPlacer?.length ? (
            <div className="border-t bg-amber-50 px-4 py-3">
              <div className="text-sm font-semibold text-amber-900">
                À placer ce jour ({jour.aPlacer.length})
              </div>
              <p className="text-xs text-amber-800">
                Ta méthode prévoit ces séances, mais ton emploi du temps n’a pas
                assez de créneaux pour les recevoir. Choisis un créneau, ou
                laisse-les de côté.
              </p>
              <ul className="mt-2 space-y-1">
                {jour.aPlacer.map((sp, i) => (
                  <li key={`${sp.libelle}-${i}`} className="flex items-center gap-2 text-sm text-amber-900">
                    <span>{sp.libelle}</span>
                    {sp.origine ? (
                      <span className="text-xs text-amber-700">({sp.origine})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/components/semaine/__tests__/CahierJournalEditor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/semaine/CahierJournalEditor.tsx src/components/semaine/__tests__/CahierJournalEditor.test.tsx
git commit -m "Le cahier journal montre les seances qu aucun creneau n a pu accueillir"
```

---

### Task 10: Vérifier l'import jour par jour

**Files:**
- Modify: `src/components/methodes/SourceContentPreview.tsx`
- Test: `src/components/methodes/__tests__/SourceContentPreview.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `src/components/methodes/__tests__/SourceContentPreview.test.tsx`, en
suivant le motif de composant contrôlé déjà utilisé dans ce fichier :

```tsx
it('annonce le nombre de séances par jour', () => {
  render(
    <SourceContentPreview
      typeDocument="periode"
      periodes={[]}
      onPeriodesChange={() => {}}
      onSemainesChange={() => {}}
      semaines={[{
        numero: 1, items: [], pages: '', mots_exemple: [],
        seances: [
          { jour: 1, domaine: '', libelle: 'A' },
          { jour: 1, domaine: '', libelle: 'B' },
          { jour: 3, domaine: '', libelle: 'C' },
        ],
      }]}
    />,
  )
  expect(screen.getByText(/jour 1\s*:\s*2 séances/i)).toBeInTheDocument()
  expect(screen.getByText(/jour 3\s*:\s*1 séance/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/components/methodes/__tests__/SourceContentPreview.test.tsx`
Expected: FAIL, le récapitulatif par jour n'existe pas

- [ ] **Step 3: Écrire le récapitulatif**

Dans `SourceContentPreview.tsx`, ajouter le calcul puis l'affichage sous le
titre de chaque semaine :

```tsx
function recapJours(seances: SeanceProgression[] | undefined) {
  const datees = (seances ?? []).filter(s => s.jour !== null)
  if (!datees.length) return []
  const parJour = new Map<number, number>()
  for (const s of datees) parJour.set(s.jour as number, (parJour.get(s.jour as number) ?? 0) + 1)
  return [...parJour.entries()].sort((a, b) => a[0] - b[0])
}
```

```tsx
{recapJours(semaine.seances).map(([jour, nb]) => (
  <span key={jour} className="mr-3 text-xs text-slate-600">
    Jour {jour} : {nb} séance{nb > 1 ? 's' : ''}
  </span>
))}
{semaine.seances?.some(s => s.jour === null) ? (
  <span className="text-xs text-amber-700">
    {semaine.seances.filter(s => s.jour === null).length} sans jour indiqué
  </span>
) : null}
```

avec `import type { SeanceProgression } from '@/types'` en tête du fichier.

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/components/methodes/__tests__/SourceContentPreview.test.tsx`
Expected: PASS

- [ ] **Step 5: Lancer toute la suite et le build**

Run: `npx jest`
Expected: PASS, aucune régression

Run: `npm run build`
Expected: build réussi, aucune erreur de type

- [ ] **Step 6: Commit**

```bash
git add src/components/methodes/SourceContentPreview.tsx src/components/methodes/__tests__/SourceContentPreview.test.tsx
git commit -m "L ecran de verification annonce le nombre de seances par jour"
```

---

### Task 11: Déplacer une séance d'un jour à l'autre avant d'enregistrer

**Files:**
- Modify: `src/components/methodes/SourceContentPreview.tsx`
- Test: `src/components/methodes/__tests__/SourceContentPreview.test.tsx`

C'est le geste de correction de l'écran de vérification : si le modèle a mis une
puce au mauvais jour, Cécile la remet au bon avant que quoi que ce soit parte en
base.

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
function ApercuSeancesControle() {
  const [semaines, setSemaines] = useState<ProgressionSemaine[]>([{
    numero: 1, items: [], pages: '', mots_exemple: [],
    seances: [{ jour: 1, domaine: '', libelle: 'Geste d’écriture' }],
  }])
  return (
    <SourceContentPreview
      typeDocument="periode"
      semaines={semaines}
      periodes={[]}
      onSemainesChange={setSemaines}
      onPeriodesChange={() => {}}
    />
  )
}

it('déplace une séance au jour choisi', async () => {
  render(<ApercuSeancesControle />)
  const choix = screen.getByLabelText('Jour de la séance : Geste d’écriture')
  await userEvent.selectOptions(choix, '3')
  expect(screen.getByText(/jour 3\s*:\s*1 séance/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/components/methodes/__tests__/SourceContentPreview.test.tsx`
Expected: FAIL, aucun élément nommé « Jour de la séance : … »

- [ ] **Step 3: Écrire le sélecteur de jour**

Sous le récapitulatif ajouté en Task 10, pour chaque semaine qui porte des
séances :

```tsx
{semaine.seances?.length ? (
  <ul className="mt-2 space-y-1">
    {semaine.seances.map((s, iSeance) => (
      <li key={`${s.libelle}-${iSeance}`} className="flex items-center gap-2 text-sm">
        <label className="sr-only" htmlFor={`jour-${semaine.numero}-${iSeance}`}>
          Jour de la séance : {s.libelle}
        </label>
        <select
          id={`jour-${semaine.numero}-${iSeance}`}
          aria-label={`Jour de la séance : ${s.libelle}`}
          value={s.jour ?? ''}
          onChange={event => {
            const jour = event.target.value === '' ? null : Number(event.target.value)
            const seances = (semaine.seances ?? []).map((autre, j) =>
              j === iSeance ? { ...autre, jour } : autre)
            onSemainesChange(semaines.map((autre, j) =>
              j === indexSemaine ? { ...autre, seances } : autre))
          }}
          className="rounded-lg border-2 border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
        >
          <option value="">sans jour</option>
          <option value="1">Jour 1</option>
          <option value="2">Jour 2</option>
          <option value="3">Jour 3</option>
          <option value="4">Jour 4</option>
          <option value="5">Jour 5</option>
        </select>
        <span className="text-slate-800">{s.libelle}</span>
      </li>
    ))}
  </ul>
) : null}
```

`indexSemaine` est l'index de la semaine dans la boucle de rendu déjà présente
dans le composant : réutiliser celui qui existe, ne pas en introduire un second.

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/components/methodes/__tests__/SourceContentPreview.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/methodes/SourceContentPreview.tsx src/components/methodes/__tests__/SourceContentPreview.test.tsx
git commit -m "L ecran de verification permet de remettre une seance au bon jour"
```

---

### Task 12: Poser une séance « à placer » dans un créneau

**Files:**
- Modify: `src/components/semaine/CahierJournalEditor.tsx`
- Test: `src/components/semaine/__tests__/CahierJournalEditor.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
it('pose une séance à placer dans le créneau choisi', async () => {
  const avecAPlacer: JourJournal[] = [{
    jour: 'lundi',
    seances: [
      { matiere: 'Français', heure_debut: '09:00', heure_fin: '09:30', type: 'cours', deroulement: 'Séance A' },
      { matiere: 'Français', heure_debut: '10:00', heure_fin: '10:30', type: 'cours', deroulement: 'Français' },
    ],
    aPlacer: [{ libelle: 'Geste d’écriture', origine: null }],
  }]
  ;(lireJournal as jest.Mock).mockResolvedValue({ ok: true, valeur: avecAPlacer })

  render(<CahierJournalEditor semaineId="s1" numeroSemaine={1} />)

  const choix = await screen.findByLabelText('Placer « Geste d’écriture » dans un créneau')
  await userEvent.selectOptions(choix, '1')

  await waitFor(() => {
    expect(screen.getByDisplayValue('Geste d’écriture')).toBeInTheDocument()
  })
  expect(screen.queryByLabelText('Placer « Geste d’écriture » dans un créneau')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx jest src/components/semaine/__tests__/CahierJournalEditor.test.tsx`
Expected: FAIL, aucun élément « Placer … dans un créneau »

- [ ] **Step 3: Écrire l'action**

Dans `CahierJournalEditor.tsx`, ajouter la fonction de placement au-dessus du
rendu :

```tsx
  /**
   * Poser une séance « à placer » dans un créneau : on écrit son libellé dans le
   * déroulement, exactement comme une saisie de l'enseignante, et la séance
   * quitte la liste. Aucun mécanisme nouveau, aucune devinette.
   */
  function placerSeance(jourIndex: number, seanceIndex: number, libelle: string, aPlacerIndex: number) {
    setJournal(actuel => {
      if (!actuel) return actuel
      const avecTexte = modifierSeanceJournal(actuel, { jourIndex, seanceIndex }, {
        ...actuel[jourIndex].seances[seanceIndex],
        deroulement: libelle,
      })
      return avecTexte.map((jour, i) => i !== jourIndex ? jour : {
        ...jour,
        aPlacer: (jour.aPlacer ?? []).filter((_, k) => k !== aPlacerIndex),
      })
    })
  }
```

Vérifier la signature réelle de `modifierSeanceJournal`
(`src/lib/cahier-journal-edition.ts:102`) et l'appeler telle qu'elle est
définie : c'est elle qui valide le contenu, on ne la contourne pas.

Puis, dans le bloc « À placer » de la Task 9, remplacer le `<li>` par :

```tsx
                  <li key={`${sp.libelle}-${i}`} className="flex items-center gap-2 text-sm text-amber-900">
                    <label className="sr-only" htmlFor={`placer-${jourIndex}-${i}`}>
                      Placer « {sp.libelle} » dans un créneau
                    </label>
                    <select
                      id={`placer-${jourIndex}-${i}`}
                      aria-label={`Placer « ${sp.libelle} » dans un créneau`}
                      defaultValue=""
                      onChange={event => {
                        if (event.target.value === '') return
                        placerSeance(jourIndex, Number(event.target.value), sp.libelle, i)
                      }}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm text-gray-900"
                    >
                      <option value="">choisir un créneau</option>
                      {jour.seances.map((s, index) => s.type === 'routine' ? null : (
                        <option key={index} value={index}>
                          {heureSansSecondes(s.heure_debut)} {s.matiere}
                        </option>
                      ))}
                    </select>
                    <span>{sp.libelle}</span>
                    {sp.origine ? (
                      <span className="text-xs text-amber-700">({sp.origine})</span>
                    ) : null}
                  </li>
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx jest src/components/semaine/__tests__/CahierJournalEditor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/semaine/CahierJournalEditor.tsx src/components/semaine/__tests__/CahierJournalEditor.test.tsx
git commit -m "Poser une seance a placer dans le creneau choisi"
```

---

## Vérification finale, à faire en vrai

Les tests ne remplacent pas le passage sur le vrai document. Avant de dire que
c'est fini :

1. importer `partage/exemple de planning p1.pdf` dans une classe de test ;
2. vérifier sur l'écran de vérification : semaine 1 doit annoncer 3 séances au
   jour 1, 2 au jour 2, 4 au jour 3, 3 au jour 4 ;
3. ouvrir le cahier journal de la semaine 1 et vérifier qu'aucun créneau ne
   porte deux séances collées par une virgule ;
4. vérifier qu'un créneau de français sans séance affiche « Français » et non
   du vide ;
5. vérifier qu'une progression de maths (notions, sans jours) s'affiche
   exactement comme avant le chantier ;
6. déplacer une séance d'un jour à l'autre sur l'écran de vérification, et
   vérifier que le récapitulatif suit ;
7. poser une séance « à placer » dans un créneau, enregistrer, recharger la
   page, et vérifier que le placement a tenu et que la séance a bien quitté la
   liste.

## Piège connu à ne pas rouvrir

Le placement repose entièrement sur le rattachement d'un créneau à sa méthode
(`methode_id`). L'import d'un emploi du temps repose aujourd'hui ce lien à
`null` (défaut C0a du 31/07, voir `MARCHE-A-SUIVRE-CODEX-CLAUDE.md`) : tant
qu'il n'est pas corrigé, un import d'EDT après cet import de méthode ferait
retomber tous les créneaux sur le rapprochement par libellé.
