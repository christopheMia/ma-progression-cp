# Multi-méthodes (Français + Maths) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de combiner plusieurs méthodes (Français + Maths) sans qu'un import écrase l'autre : progression, suivi élève, et bilan IA deviennent **par matière**.

**Architecture :** La table `semaines` devient un squelette temporel ; le contenu des méthodes part dans une nouvelle table `progression` indexée par `matiere`. `acquisitions` et `appreciations` gagnent une colonne `matiere`. L'import IA est généralisé (`graphemes` → `items`), reçoit la `matiere`, accepte plusieurs fichiers, et un contrôle de couverture (code) garantit qu'aucune notion extraite n'est perdue.

**Tech Stack :** Next.js 16, React 19, Supabase (Postgres + RLS), Anthropic SDK (`claude-sonnet-4-6`), Jest + ts-jest, Tailwind v4.

**Périmètre de CE plan :** phases 1 à 4 (migration, IA, affichage, suivi/bilan). Le **cahier journal 3 colonnes** (Section 3B de la spec) fera l'objet d'un plan séparé, à la réception de la trame de la collègue.

**Spec :** `docs/superpowers/specs/2026-06-16-multi-methodes-design.md`

**Convention de test :** `npm test` (Jest). Un test ciblé : `npx jest src/lib/ia/__tests__/schema.test.ts -t "nom du test"`. Build de vérification : `npx next build`.

**Constante partagée :** les matières « méthodes » sont `'francais'` et `'maths'`. On crée `src/lib/matieres.ts` en Task 1 et on l'importe partout (pas de littéral en dur dispersé).

---

## Phase 1 — Modèle de données & types

### Task 1: Constante des matières-méthodes

**Files:**
- Create: `src/lib/matieres.ts`
- Test: `src/lib/__tests__/matieres.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/matieres.test.ts
import { MATIERES_METHODE, LABELS_MATIERE, isMatiereMethode } from '../matieres'

describe('matieres methode', () => {
  test('les 2 matières importables sont francais et maths', () => {
    expect(MATIERES_METHODE).toEqual(['francais', 'maths'])
  })
  test('chaque matière a un libellé lisible', () => {
    expect(LABELS_MATIERE.francais).toBe('Français')
    expect(LABELS_MATIERE.maths).toBe('Maths')
  })
  test('isMatiereMethode valide les bonnes valeurs', () => {
    expect(isMatiereMethode('francais')).toBe(true)
    expect(isMatiereMethode('eps')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/matieres.test.ts`
Expected: FAIL (`Cannot find module '../matieres'`).

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/matieres.ts
export const MATIERES_METHODE = ['francais', 'maths'] as const
export type MatiereMethode = (typeof MATIERES_METHODE)[number]

export const LABELS_MATIERE: Record<MatiereMethode, string> = {
  francais: 'Français',
  maths: 'Maths',
}

export function isMatiereMethode(v: string): v is MatiereMethode {
  return (MATIERES_METHODE as readonly string[]).includes(v)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/matieres.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/matieres.ts src/lib/__tests__/matieres.test.ts
git commit -m "feat: constante des matieres-methode (francais, maths)"
```

---

### Task 2: Migration SQL (table `progression` + colonnes `matiere`)

**Files:**
- Create: `supabase/migrations/003_multi_methodes.sql`

Cette migration est appliquée en prod via le MCP Supabase / dashboard. Elle ne casse PAS le code existant : on **ajoute** sans encore retirer les colonnes de `semaines` (suppression différée en Task 9, après bascule du code).

- [ ] **Step 1: Écrire la migration**

```sql
-- supabase/migrations/003_multi_methodes.sql

-- 1) Nouvelle table progression : contenu d'une methode par matiere x semaine
create table progression (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  matiere text not null,
  numero int not null,
  items text[] not null default '{}',
  pages text,
  mots_exemple text[],
  unique(class_id, matiere, numero)
);
alter table progression enable row level security;
create policy "Users manage own progression" on progression
  using (class_id in (select id from classes where user_id = auth.uid()))
  with check (class_id in (select id from classes where user_id = auth.uid()));

-- 2) Recopie du francais existant (semaines.graphemes -> progression)
insert into progression (class_id, matiere, numero, items, pages, mots_exemple)
select class_id, 'francais', numero, graphemes, manuel_pages, mots_exemple
from semaines;

-- 3) Colonne matiere sur acquisitions (existant = francais)
alter table acquisitions add column matiere text not null default 'francais';
alter table acquisitions drop constraint acquisitions_semaine_id_eleve_id_grapheme_key;
alter table acquisitions add constraint acquisitions_unique
  unique (semaine_id, eleve_id, matiere, grapheme);

-- 4) Colonne matiere sur appreciations (existant = francais)
alter table appreciations add column matiere text not null default 'francais';
alter table appreciations drop constraint appreciations_semaine_id_eleve_id_key;
alter table appreciations add constraint appreciations_unique
  unique (semaine_id, eleve_id, matiere);
```

> Note : les noms de contraintes (`acquisitions_semaine_id_eleve_id_grapheme_key`, `appreciations_semaine_id_eleve_id_key`) sont les noms Postgres par défaut générés depuis `001_schema.sql`. Si la prod a un nom différent, vérifier via `\d acquisitions` / le dashboard et ajuster.

- [ ] **Step 2: Vérifier la syntaxe localement (lint visuel)**

Relire la migration : chaque `alter` cible une table existante (`acquisitions`, `appreciations`), la recopie (étape 2) tourne avant l'ajout des contraintes d'unicité. Aucune colonne supprimée ici.

- [ ] **Step 3: Commit (l'application en prod se fera à l'étape de déploiement)**

```bash
git add supabase/migrations/003_multi_methodes.sql
git commit -m "feat(db): migration multi-methodes (table progression + colonne matiere)"
```

---

### Task 3: Types TypeScript

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Ajouter le type `Progression` et la `matiere` sur les types de suivi**

Ajouter dans `src/types/index.ts` :

```typescript
export type Progression = {
  id: string
  class_id: string
  matiere: string
  numero: number
  items: string[]
  pages: string | null
  mots_exemple: string[] | null
}
```

Modifier `Acquisition` et `Appreciation` pour ajouter `matiere: string` :

```typescript
export type Acquisition = {
  id: string
  semaine_id: string
  eleve_id: string
  matiere: string
  grapheme: string
  acquis: boolean
}

export type Appreciation = {
  id: string
  semaine_id: string
  eleve_id: string
  matiere: string
  statut: string | null
  commentaire: string | null
}
```

Laisser `Semaine` tel quel pour l'instant (les colonnes `graphemes`/`manuel_pages`/`mots_exemple` existent encore en base jusqu'à Task 9).

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: pas de nouvelle erreur liée à ces types (des erreurs apparaîtront aux endroits qui construisent `Acquisition`/`Appreciation` sans `matiere` — elles seront corrigées dans les tâches suivantes ; noter lesquelles).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): type Progression + matiere sur Acquisition/Appreciation"
```

---

## Phase 2 — Couche IA généralisée (items + matière + couverture)

### Task 4: Schéma IA générique (`graphemes` → `items`)

**Files:**
- Modify: `src/lib/ia/schema.ts`
- Modify: `src/data/manuels/index.ts` (type `ProgressionSemaine`)
- Modify: `src/lib/ia/__tests__/schema.test.ts`

- [ ] **Step 1: Mettre à jour les tests pour `items`**

Remplacer le contenu de `src/lib/ia/__tests__/schema.test.ts` par :

```typescript
import { normalizeProgression, PROGRESSION_JSON_SCHEMA } from '../schema'

describe('normalizeProgression', () => {
  test('renumérote les semaines de 1 à N dans l’ordre', () => {
    const out = normalizeProgression([
      { numero: 5, items: ['a'], pages: 'p.10', mots_exemple: ['ananas'] },
      { numero: 2, items: ['i'], pages: 'p.14', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([1, 2])
  })

  test('coupe à 36 semaines maximum', () => {
    const brut = Array.from({ length: 50 }, (_, i) => ({
      numero: i + 1, items: ['a'], pages: '', mots_exemple: [],
    }))
    expect(normalizeProgression(brut)).toHaveLength(36)
  })

  test('nettoie les champs manquants ou invalides', () => {
    const out = normalizeProgression([
      { numero: 1, items: null, pages: undefined },
    ])
    expect(out[0]).toEqual({ numero: 1, items: [], pages: '', mots_exemple: [] })
  })

  test('filtre les items vides et trim', () => {
    const out = normalizeProgression([
      { numero: 1, items: [' a ', '', 'ou'], pages: ' p.10 ', mots_exemple: [' ami ', ''] },
    ])
    expect(out[0].items).toEqual(['a', 'ou'])
    expect(out[0].pages).toBe('p.10')
    expect(out[0].mots_exemple).toEqual(['ami'])
  })

  test('le schéma JSON cible un objet { semaines: [...] } avec items', () => {
    expect(PROGRESSION_JSON_SCHEMA.type).toBe('object')
    expect(PROGRESSION_JSON_SCHEMA.properties.semaines.type).toBe('array')
    expect(PROGRESSION_JSON_SCHEMA.properties.semaines.items.properties).toHaveProperty('items')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/ia/__tests__/schema.test.ts`
Expected: FAIL (le schéma et `normalizeProgression` utilisent encore `graphemes`).

- [ ] **Step 3: Mettre à jour le type `ProgressionSemaine`**

Dans `src/data/manuels/index.ts`, renommer `graphemes` → `items` :

```typescript
export type ProgressionSemaine = {
  numero: number
  items: string[]
  pages: string
  mots_exemple: string[]
}
```

- [ ] **Step 4: Mettre à jour `schema.ts`**

Remplacer le contenu de `src/lib/ia/schema.ts` par :

```typescript
import type { ProgressionSemaine } from '@/data/manuels'

export const PROGRESSION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    semaines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          numero: { type: 'integer' },
          items: { type: 'array', items: { type: 'string' } },
          pages: { type: 'string' },
          mots_exemple: { type: 'array', items: { type: 'string' } },
        },
        required: ['numero', 'items', 'pages', 'mots_exemple'],
      },
    },
  },
  required: ['semaines'],
} as const

const MAX_SEMAINES = 36

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
}

export function normalizeProgression(brut: unknown[]): ProgressionSemaine[] {
  const items = Array.isArray(brut) ? brut : []
  const cleaned = items.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    return {
      numero: typeof o.numero === 'number' ? o.numero : 0,
      items: toStringArray(o.items),
      pages: typeof o.pages === 'string' ? o.pages.trim() : '',
      mots_exemple: toStringArray(o.mots_exemple),
    }
  })
  cleaned.sort((a, b) => a.numero - b.numero)
  return cleaned.slice(0, MAX_SEMAINES).map((s, i) => ({ ...s, numero: i + 1 }))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/lib/ia/__tests__/schema.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/ia/schema.ts src/data/manuels/index.ts src/lib/ia/__tests__/schema.test.ts
git commit -m "refactor(ia): schema generique items (au lieu de graphemes)"
```

---

### Task 5: Prompts par matière (extraction exhaustive + répartition)

**Files:**
- Modify: `src/lib/ia/prompts.ts`
- Modify: `src/lib/ia/__tests__/prompts.test.ts`

- [ ] **Step 1: Écrire le test**

Ajouter dans `src/lib/ia/__tests__/prompts.test.ts` (créer le bloc s'il n'existe pas) :

```typescript
import { systemImport, userImport } from '../prompts'

describe('systemImport par matière', () => {
  test('français parle de sons/graphèmes', () => {
    const s = systemImport('francais')
    expect(s.toLowerCase()).toContain('graphème')
  })
  test('maths parle de notions et de répartition par semaine', () => {
    const s = systemImport('maths')
    expect(s.toLowerCase()).toContain('notion')
    expect(s.toLowerCase()).toContain('semaine')
  })
  test('consigne d’exhaustivité présente dans les deux', () => {
    expect(systemImport('francais').toLowerCase()).toContain('aucun')
    expect(systemImport('maths').toLowerCase()).toContain('aucun')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/ia/__tests__/prompts.test.ts`
Expected: FAIL (`systemImport` n'existe pas — seul `SYSTEM_IMPORT` existe).

- [ ] **Step 3: Remplacer `SYSTEM_IMPORT` par une fonction `systemImport(matiere)`**

Dans `src/lib/ia/prompts.ts`, remplacer la constante `SYSTEM_IMPORT` (lignes 1-12) par :

```typescript
import type { MatiereMethode } from '@/lib/matieres'

const REGLE_EXHAUSTIVITE = `Procède en deux temps, sans rien oublier :
1) Recense d'ABORD la liste complète des contenus du document (aucun ne doit manquer).
2) Répartis ENSUITE ces contenus, semaine par semaine, dans l'ordre de l'année.
N'invente aucun contenu absent du document.`

export function systemImport(matiere: MatiereMethode): string {
  if (matiere === 'maths') {
    return `Tu es un expert des méthodes de mathématiques CP françaises.
On te donne le texte (programmation ou sommaire) d'une méthode de maths CP, souvent organisée PAR PÉRIODE et PAR DOMAINE (nombres, calcul mental, problèmes, grandeurs et mesures, espace et géométrie...).
Ta tâche : reconstruire une progression SEMAINE PAR SEMAINE.
${REGLE_EXHAUSTIVITE}
Règles :
- Une entrée par semaine, dans l'ordre chronologique.
- "items" = les notions/compétences travaillées cette semaine (ex: ["Nombres jusqu'à 10","Décomposer 4 et 5"]).
- Étale les notions d'une période sur les semaines de cette période (≈7 semaines par période).
- "pages" = les pages si présentes, sinon "". "mots_exemple" = [] (rarement pertinent en maths).
Réponds UNIQUEMENT via le format structuré imposé.`
  }
  return `Tu es un expert des méthodes de lecture CP françaises.
On te donne le texte (sommaire ou guide) d'un manuel de lecture CP.
Ta tâche : reconstruire la progression réelle, semaine par semaine.
${REGLE_EXHAUSTIVITE}
Règles :
- Une entrée par semaine, dans l'ordre chronologique de l'année.
- "items" = le(s) graphème(s)/son(s) étudié(s) cette semaine (ex: ["a"], ["on","an"]).
- "pages" = les pages du manuel si présentes (ex: "p. 10-13"), sinon "".
- "mots_exemple" = quelques mots d'exemple si présents, sinon [].
- N'invente pas de sons : si une semaine n'a pas de graphème identifiable, mets [].
- Respecte le nombre réel de semaines du manuel (souvent 30 à 36).
Réponds UNIQUEMENT via le format structuré imposé.`
}
```

> `userImport(texteManuel)` reste inchangé.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/ia/__tests__/prompts.test.ts`
Expected: PASS.

- [ ] **Step 5: Mettre à jour les appelants de `SYSTEM_IMPORT`**

Run: `npx grep -rn "SYSTEM_IMPORT" src` (ou recherche). Dans `src/app/api/ia-manuel/route.ts`, remplacer l'usage de `SYSTEM_IMPORT` par `systemImport(matiere)` (la `matiere` est ajoutée à la route en Task 7). Pour l'instant, si la route n'est pas encore modifiée, mettre `systemImport('francais')` pour garder la compilation verte ; ce sera finalisé en Task 7.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ia/prompts.ts src/lib/ia/__tests__/prompts.test.ts
git commit -m "feat(ia): prompts d'import par matiere + consigne d'exhaustivite"
```

---

### Task 6: Contrôle de couverture (aucune notion perdue)

**Files:**
- Create: `src/lib/ia/couverture.ts`
- Create: `src/lib/ia/__tests__/couverture.test.ts`

- [ ] **Step 1: Écrire le test**

```typescript
// src/lib/ia/__tests__/couverture.test.ts
import { notionsManquantes } from '../couverture'

describe('notionsManquantes', () => {
  test('aucune manquante quand tout est placé', () => {
    const ref = ['Nombres jusqu’à 10', 'Monnaie']
    const placees = [
      { numero: 1, items: ['Nombres jusqu’à 10'] },
      { numero: 2, items: ['Monnaie', 'autre'] },
    ]
    expect(notionsManquantes(ref, placees)).toEqual([])
  })

  test('détecte les notions de référence non placées', () => {
    const ref = ['Nombres jusqu’à 10', 'Monnaie', 'Solides']
    const placees = [{ numero: 1, items: ['Nombres jusqu’à 10'] }]
    expect(notionsManquantes(ref, placees)).toEqual(['Monnaie', 'Solides'])
  })

  test('comparaison insensible à la casse et aux espaces', () => {
    const ref = ['Monnaie']
    const placees = [{ numero: 1, items: ['  monnaie '] }]
    expect(notionsManquantes(ref, placees)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/ia/__tests__/couverture.test.ts`
Expected: FAIL (`Cannot find module '../couverture'`).

- [ ] **Step 3: Implémenter**

```typescript
// src/lib/ia/couverture.ts
const norm = (s: string) => s.trim().toLowerCase()

/** Renvoie les notions de `reference` qui n'apparaissent dans AUCUNE semaine placée. */
export function notionsManquantes(
  reference: string[],
  placees: Array<{ items: string[] }>,
): string[] {
  const placeesSet = new Set(placees.flatMap(p => p.items.map(norm)))
  return reference.filter(n => !placeesSet.has(norm(n)))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/ia/__tests__/couverture.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ia/couverture.ts src/lib/ia/__tests__/couverture.test.ts
git commit -m "feat(ia): controle de couverture (notions non placees)"
```

---

## Phase 3 — Import multi-matières / multi-fichiers

### Task 7: Route API d'import reçoit la matière

**Files:**
- Modify: `src/app/api/ia-manuel/route.ts`

- [ ] **Step 1: Lire la route existante**

Run: `cat src/app/api/ia-manuel/route.ts` (Read tool). Repérer où le body est parsé et où `SYSTEM_IMPORT` est utilisé.

- [ ] **Step 2: Ajouter `matiere` au body et l'utiliser**

Dans le handler `POST`, après le parsing du body, lire `matiere` et valider :

```typescript
import { systemImport } from '@/lib/ia/prompts'
import { isMatiereMethode } from '@/lib/matieres'

// dans POST, après avoir lu le body :
const matiere = isMatiereMethode(body?.matiere) ? body.matiere : 'francais'
// ... puis à l'appel Anthropic :
//   system: systemImport(matiere)   (au lieu de SYSTEM_IMPORT)
```

Conserver : modèle `claude-sonnet-4-6`, pas de `thinking`, sorties structurées via `PROGRESSION_JSON_SCHEMA`, et le `normalizeProgression(...)` sur la réponse.

- [ ] **Step 3: Vérifier le build**

Run: `npx next build`
Expected: `Compiled successfully` (aucune référence restante à `SYSTEM_IMPORT`).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ia-manuel/route.ts
git commit -m "feat(api): l'import IA recoit la matiere"
```

---

### Task 8: Action serveur `enregistrerProgressionMatiere`

**Files:**
- Create: `src/lib/actions/progression-matiere.ts`

- [ ] **Step 1: Lire un exemple d'action existante**

Run: lire `src/lib/actions/progression-ia.ts` (Read) pour reprendre le pattern (`'use server'`, `createClient`, lecture de la classe tolérante `maybeSingle()`, `revalidatePath`).

- [ ] **Step 2: Écrire l'action (delete + insert filtré par matière)**

```typescript
// src/lib/actions/progression-matiere.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProgressionSemaine } from '@/data/manuels'
import { isMatiereMethode } from '@/lib/matieres'

export async function enregistrerProgressionMatiere(
  matiere: string,
  semaines: ProgressionSemaine[],
) {
  if (!isMatiereMethode(matiere)) throw new Error('Matière inconnue')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  const { data: classe } = await supabase
    .from('classes')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!classe) throw new Error('Aucune classe')

  // Remplace UNIQUEMENT cette matière (jamais l'autre)
  await supabase.from('progression').delete()
    .eq('class_id', classe.id).eq('matiere', matiere)

  const lignes = semaines.map(s => ({
    class_id: classe.id,
    matiere,
    numero: s.numero,
    items: s.items,
    pages: s.pages || null,
    mots_exemple: s.mots_exemple ?? null,
  }))
  if (lignes.length > 0) {
    const { error } = await supabase.from('progression').insert(lignes)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/planning')
  revalidatePath('/accueil')
}
```

- [ ] **Step 3: Vérifier le build**

Run: `npx next build`
Expected: `Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/progression-matiere.ts
git commit -m "feat: action enregistrerProgressionMatiere (non destructive entre matieres)"
```

---

### Task 9: Génération initiale via la table `progression` + nettoyage `semaines`

**Files:**
- Modify: `src/lib/progression.ts`
- Modify: `src/lib/actions/setup.ts`
- Modify: `src/lib/__tests__/progression.test.ts`
- Create (suite migration): `supabase/migrations/004_semaines_cleanup.sql`

Objectif : à la création de classe, on insère les `semaines` (calendrier + EDM) ET les lignes `progression(matiere='francais')` issues de l'import. Puis on retire les colonnes de méthode de `semaines`.

- [ ] **Step 1: Lire `progression.ts` et son test**

Run: lire `src/lib/progression.ts` et `src/lib/__tests__/progression.test.ts`.

- [ ] **Step 2: Adapter `genererProgression` pour séparer calendrier et contenu**

Faire renvoyer à `genererProgression` deux jeux : les `semaines` (numero, date_debut, edm_theme, edm_competences, note) et les lignes de `progression` français. Adapter la signature :

```typescript
// dans src/lib/progression.ts
export function genererSemaines(rentreeDate: string): Omit<Semaine, 'id' | 'class_id' | 'graphemes' | 'manuel_pages' | 'mots_exemple'>[] {
  const debut = new Date(rentreeDate)
  return Array.from({ length: 36 }, (_, i) => {
    const semEdm = EDM_PROGRESSION_CP[i]
    return {
      numero: i + 1,
      date_debut: format(addWeeks(debut, i), 'yyyy-MM-dd'),
      edm_theme: semEdm.theme,
      edm_competences: semEdm.competences,
      note: null,
    }
  })
}

export function genererProgressionFrancais(
  manuelId: string,
  customProgression?: ProgressionSemaine[],
): Array<{ numero: number; items: string[]; pages: string | null; mots_exemple: string[] | null }> {
  const semaines = customProgression ?? MANUELS_DATA[manuelId as keyof typeof MANUELS_DATA]?.semaines
  if (!semaines) return []
  return semaines.slice(0, 36).map((s, i) => ({
    numero: i + 1,
    items: s.items,
    pages: s.pages || null,
    mots_exemple: s.mots_exemple ?? null,
  }))
}
```

> Adapter `MANUELS_DATA`/`LECTURE_PIANO` (mode démo) : la progression Lecture Piano utilise désormais `items` (renommé en Task 4). Vérifier `src/data/manuels/lecture-piano.ts` et renommer `graphemes` → `items` dedans.

- [ ] **Step 3: Adapter le test `progression.test.ts`**

Mettre à jour le test pour cibler `genererSemaines` (longueur 36, dates qui s'enchaînent) et `genererProgressionFrancais` (items présents). Reprendre les assertions existantes en remplaçant `genererProgression(...)` et `.graphemes` par les nouvelles fonctions et `.items`.

- [ ] **Step 4: Adapter `creerClasse` dans `setup.ts`**

Après l'insert de `semaines`, récupérer les ids, puis insérer les lignes `progression` français. Concrètement :

```typescript
// remplace l'ancien bloc semaines de setup.ts
const semaines = genererSemaines(formData.rentreeDate)
const { data: semInsert } = await supabase.from('semaines')
  .insert(semaines.map(s => ({ ...s, class_id: classe.id })))
  .select('id, numero')

const progFr = genererProgressionFrancais(formData.manuelId, formData.customProgression)
const progRows = progFr.map(p => ({
  class_id: classe.id, matiere: 'francais',
  numero: p.numero, items: p.items, pages: p.pages, mots_exemple: p.mots_exemple,
}))
if (progRows.length > 0) await supabase.from('progression').insert(progRows)
```

> `semInsert` n'est utilisé que si une étape ultérieure en a besoin ; sinon, ne pas faire le `.select`.

- [ ] **Step 5: Run tests + build**

Run: `npm test` puis `npx next build`
Expected: tests verts, build `Compiled successfully`.

- [ ] **Step 6: Migration de nettoyage `semaines` (appliquée APRÈS déploiement du code)**

```sql
-- supabase/migrations/004_semaines_cleanup.sql
alter table semaines drop column graphemes;
alter table semaines drop column manuel_pages;
alter table semaines drop column mots_exemple;
```

> ⚠️ À n'appliquer en prod qu'une fois le nouveau code en ligne (sinon le code lisant ces colonnes plante). Mettre à jour le type `Semaine` (retirer `graphemes`, `manuel_pages`, `mots_exemple`) dans `src/types/index.ts` au même moment.

- [ ] **Step 7: Commit**

```bash
git add src/lib/progression.ts src/lib/actions/setup.ts src/lib/__tests__/progression.test.ts src/data/manuels/lecture-piano.ts supabase/migrations/004_semaines_cleanup.sql src/types/index.ts
git commit -m "feat: generation via table progression + nettoyage colonnes semaines"
```

---

### Task 10: Composant `IaImport` — sélecteur de matière + multi-fichiers + couverture

**Files:**
- Modify: `src/components/setup/IaImport.tsx`
- Modify: `src/lib/ia/pdf-client.ts` (si besoin d'extraire plusieurs fichiers)

- [ ] **Step 1: Lire les composants existants**

Run: lire `src/components/setup/IaImport.tsx` et `src/lib/ia/pdf-client.ts`.

- [ ] **Step 2: Ajouter le sélecteur de matière**

En haut du composant, un `<select>` lié à un state `matiere` (`'francais' | 'maths'`), libellés depuis `LABELS_MATIERE`. Cette `matiere` est envoyée dans le body POST vers `/api/ia-manuel`.

- [ ] **Step 3: Passer l'input fichier en `multiple` + concaténer**

Sur le `<input type="file" accept="application/pdf">`, ajouter `multiple`. À la sélection, extraire le texte de **chaque** fichier via `pdf-client.ts` et concaténer (séparés par `\n\n--- fichier suivant ---\n\n`). Avertissement UI sous l'input : « Dépose les pages de programmation, pas le manuel entier (budget + rapidité). »

- [ ] **Step 4: Afficher le contrôle de couverture**

Après réception de la progression IA, si la matière est `maths`, calculer `notionsManquantes(reference, progression)` où `reference` = la liste extraite (voir note). Si non vide, afficher un bandeau orange : « ⚠️ N notions non placées : … » avec un bouton « Demander à l'IA de les ajouter » (réutilise le chat existant). 

> Note d'implémentation : pour obtenir `reference`, demander à la route de renvoyer aussi la liste brute extraite, OU dériver la référence du texte collé. MVP acceptable : référence = union des items de toutes les semaines au 1er import (le contrôle sert surtout après une correction via chat qui pourrait en retirer). Si trop complexe pour le MVP, afficher seulement un compteur « X notions réparties sur Y semaines » et garder le contrôle strict pour un itération suivante. Choisir l'option compteur si la route ne renvoie pas la référence.

- [ ] **Step 5: Brancher l'enregistrement sur `enregistrerProgressionMatiere`**

Le bouton « Enregistrer » appelle `enregistrerProgressionMatiere(matiere, progression)` (Task 8) au lieu de l'ancien chemin mono-méthode.

- [ ] **Step 6: Vérifier le build + run manuel**

Run: `npx next build`, puis `npm run dev` et tester l'import des 2 PDF de `docsmethodes/` (un par matière) : vérifier que l'import Maths ne supprime pas le Français.

- [ ] **Step 7: Commit**

```bash
git add src/components/setup/IaImport.tsx src/lib/ia/pdf-client.ts
git commit -m "feat(import): matiere + multi-fichiers + controle de couverture"
```

---

## Phase 4 — Affichage, suivi, bilan par matière

### Task 11: Lecture de la progression par matière (fiche semaine)

**Files:**
- Modify: page de la semaine (chercher : `src/app/(app)/**/semaine/**` ou via `npx grep -rn "graphemes" src/app`)
- Modify: `src/components/semaine/LectureBlock.tsx`

- [ ] **Step 1: Localiser la page semaine et sa lecture des données**

Run: `npx grep -rn "from('semaines')" src/app` et `npx grep -rn "graphemes" src/app src/components`.

- [ ] **Step 2: Charger les lignes `progression` de la semaine**

Là où la semaine est chargée, ajouter une requête `progression` filtrée par `class_id` et `numero` (la semaine courante), récupérant toutes les matières. Construire un objet `{ francais?: Progression, maths?: Progression }`.

- [ ] **Step 3: Afficher un bloc par matière**

Réutiliser/dupliquer `LectureBlock` en bloc générique « bloc matière » : titre = `LABELS_MATIERE[matiere]`, liste des `items`, `pages`, `mots_exemple`. Afficher le bloc Français puis le bloc Maths (si présent). Le bloc « Explorer le monde » reste inchangé.

- [ ] **Step 4: Vérifier le build + run manuel**

Run: `npx next build` puis `npm run dev` → ouvrir une semaine, voir les 2 blocs.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(semaine): affichage de la progression par matiere"
```

---

### Task 12: Suivi élève par matière (`StudentTracking`)

**Files:**
- Modify: `src/components/semaine/StudentTracking.tsx`
- Modify: `src/lib/actions/semaine.ts` (action de toggle d'acquisition)

- [ ] **Step 1: Lire `StudentTracking.tsx` et l'action d'acquisition**

Run: lire `src/components/semaine/StudentTracking.tsx` et `src/lib/actions/semaine.ts`. Repérer comment `acquisitions` est lu/écrit (par `grapheme`).

- [ ] **Step 2: Ajouter la dimension matière**

Le composant reçoit la liste des items **par matière** (depuis `progression`). Afficher une **section par matière** (titre + tableau d'étoiles). L'action de toggle doit transmettre `matiere` :

```typescript
// signature cible de l'action (semaine.ts)
export async function toggleAcquisition(
  semaineId: string, eleveId: string, matiere: string, grapheme: string, acquis: boolean
) { /* upsert sur (semaine_id, eleve_id, matiere, grapheme) */ }
```

Mettre à jour l'`upsert` Supabase pour inclure `matiere` et viser la contrainte `acquisitions_unique`.

- [ ] **Step 3: Lecture des acquisitions filtrée/groupée par matière**

Là où les acquisitions sont chargées, les grouper par `matiere` pour alimenter chaque section.

- [ ] **Step 4: Confettis/progression par matière**

La barre de progression et le déclenchement des confettis se calculent par matière (dernier item de la matière validé).

- [ ] **Step 5: Build + run manuel**

Run: `npx next build` puis `npm run dev` → cocher des étoiles en Français et en Maths, vérifier l'indépendance.

- [ ] **Step 6: Commit**

```bash
git add src/components/semaine/StudentTracking.tsx src/lib/actions/semaine.ts
git commit -m "feat(suivi): etoiles par matiere (francais + maths)"
```

---

### Task 13: Bilan par matière (`appreciations` + Bilan IA)

**Files:**
- Modify: `src/lib/actions/appreciation.ts`
- Modify: `src/components/semaine/StudentTracking.tsx`
- Modify: `src/app/api/ia-bilan/route.ts`
- Modify: `src/lib/ia/prompts.ts` (`userBilan`)

- [ ] **Step 1: Ajouter `matiere` à `upsertAppreciation`**

Dans `src/lib/actions/appreciation.ts`, ajouter le paramètre `matiere` et l'inclure dans l'`upsert` (cible : contrainte `appreciations_unique` sur `(semaine_id, eleve_id, matiere)`) :

```typescript
export async function upsertAppreciation(
  semaineId: string, eleveId: string, matiere: string,
  statut: string | null, commentaire: string | null,
) { /* upsert avec onConflict: 'semaine_id,eleve_id,matiere' */ }
```

- [ ] **Step 2: UI bilan par matière**

Dans `StudentTracking`, le bloc « Bilan » + bouton « ✨ Bilan IA » + commentaire passe **dans chaque section matière**, et appelle `upsertAppreciation(..., matiere, ...)`.

- [ ] **Step 3: Bilan IA reçoit la matière**

Dans `src/app/api/ia-bilan/route.ts`, accepter `matiere` dans le body et la passer au prompt. Adapter `userBilan` (prompts.ts) pour parler de « notions » génériques au lieu de « sons », en gardant le placeholder `[ELEVE]` (RGPD : prénom jamais envoyé). Renommer les champs internes `sonsAcquis`/`sonsNonAcquis` → `itemsAcquis`/`itemsNonAcquis` et adapter `SYSTEM_BILAN` pour rester neutre (élève de CP, matière donnée).

- [ ] **Step 4: Build + run manuel**

Run: `npx next build` puis `npm run dev` → générer un bilan IA Français et un Maths, vérifier que le prénom n'est pas envoyé (placeholder remplacé côté navigateur) et que chaque bilan est sauvegardé séparément.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/appreciation.ts src/components/semaine/StudentTracking.tsx src/app/api/ia-bilan/route.ts src/lib/ia/prompts.ts
git commit -m "feat(bilan): bilan + Bilan IA par matiere (RGPD preserve)"
```

---

### Task 14: Paramètres — section « Mes méthodes »

**Files:**
- Modify: `src/app/(app)/parametres/page.tsx`
- Modify/Create: `src/components/parametres/MethodesEditor.tsx`

- [ ] **Step 1: Lire la page paramètres et `ManuelEditor`**

Run: lire `src/app/(app)/parametres/page.tsx` et `src/components/parametres/ManuelEditor.tsx`.

- [ ] **Step 2: Créer `MethodesEditor`**

Composant listant les 2 matières (`LABELS_MATIERE`), avec pour chacune un bouton « Importer / corriger via l'IA » qui ouvre `IaImport` (Task 10) **pré-réglé sur la matière**. Réimport filtré → ne touche que cette matière (via `enregistrerProgressionMatiere`).

- [ ] **Step 3: Intégrer dans la page Paramètres**

Ajouter la section « 📚 Mes méthodes » dans `parametres/page.tsx`. (Le `ManuelEditor` destructif existant peut être conservé pour « tout régénérer » ou retiré si redondant — décision : conserver, mais clarifier le libellé « Changer toute la configuration ».)

- [ ] **Step 4: Build + run manuel**

Run: `npx next build` puis `npm run dev` → depuis Paramètres, réimporter Maths seul, vérifier que Français est intact.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/parametres/page.tsx" src/components/parametres/MethodesEditor.tsx
git commit -m "feat(parametres): section Mes methodes (import par matiere)"
```

---

## Vérification finale (avant déploiement)

- [ ] `npm test` → tous verts (anciens + nouveaux).
- [ ] `npx next build` → `Compiled successfully`.
- [ ] Appliquer `003_multi_methodes.sql` en prod (MCP Supabase / dashboard), vérifier que le Français existant est recopié dans `progression`.
- [ ] Déployer le code sur Vercel.
- [ ] Appliquer `004_semaines_cleanup.sql` **après** confirmation que la prod tourne sur le nouveau code.
- [ ] Test prod : import Français + import Maths (depuis `docsmethodes/`), suivi + bilan par matière, aucun écrasement.

---

## Hors périmètre de ce plan (plan séparé)

- **Cahier journal 3 colonnes (Section 3B)** : à détailler dès réception de la trame de la collègue (date en haut ; colonnes Horaires/Matière/Déroulement adaptatives ; alimentation depuis `emploi_du_temps` + `progression`).
