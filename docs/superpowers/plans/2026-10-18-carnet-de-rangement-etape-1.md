# Carnet de rangement, étape 1 : le carnet, sa lecture, « Mon rangement »

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à chaque classe un carnet de règles « ce type va dans cette case » que le cahier journal applique en premier, que l'enseignante voit et corrige dans Paramètres, et qu'elle peut remplir en le disant avec ses mots (petit appel Haiku).

**Architecture:** Une table `regles_rangement` (migration 031) par classe. Un module pur `src/lib/regles-rangement.ts` porte toute la logique (clé de type, quelle règle pour quelle séance ou notion, cases disponibles, validation, regroupement). `genererCahierJournal` reçoit les règles en quatrième paramètre facultatif : sans règle, aucun chemin de code ne change, d'où la garantie « carnet vide = cahier journal identique ». La section « Mon rangement » de Paramètres lit et écrit par des actions serveur ; l'aide « avec mes mots » passe par une route `ia-regle` (Haiku 5.5, sortie structurée) et un composant réutilisable aux étapes 2 et 3.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (PostgreSQL, RLS), Jest + Testing Library, SDK Anthropic `@anthropic-ai/sdk` 0.104 (sorties structurées `output_config.format`).

**Spec (fait foi):** `docs/superpowers/specs/2026-10-18-carnet-de-rangement-design.md`. Fil des décisions : `AVANCEMENT-IMPORT-SEANCES.md`, section « CADRAGE DE L'ÉCRAN D'ACCOMPAGNEMENT IA ». Carte du cahier journal : `wiki/entities/profenpoche-circuit-cahier-journal.md` du dépôt MON AIOS.

---

## Règles du chantier (à relire avant chaque tâche)

- Branche `seances-taches-5-12`. Ne pas changer de branche, **ne rien pousser, ne rien mettre en ligne, ne pas appliquer la migration 031 en base** : ces trois gestes attendent l'accord de Christophe.
- **Les 1071 tests actuels restent verts sans être modifiés.** Si un test existant casse, c'est une régression du code, jamais une attente à réécrire.
- Aucun tiret long (le caractère U+2014) dans ce qui est écrit : code, commentaires, textes d'écran, commits. Le code existant en contient (`pagesEtMots`) : n'y touchez pas, n'en ajoutez pas.
- Les messages destinés à l'enseignante sont RENVOYÉS par les actions serveur (`resultat`, `src/lib/resultat.ts`), jamais levés : en production, Next.js efface le texte d'une erreur levée.
- Commandes : un fichier de tests `npx jest <chemin>` ; tout `npx jest` ; les types `npx tsc --noEmit`. Les lancer depuis `C:\Users\youck\Desktop\claude\ma-progression-cp`.

## Vérifications faites en écrivant ce plan (18/10/2026)

| Point | Constat |
|---|---|
| Haiku le plus récent | `claude-haiku-5-5` (guide officiel `claude-api` du 06/10/2026). 0,10 $ en entrée et 0,50 $ en sortie par million de jetons pour un prompt de moins de 100 000 jetons (0,50 / 2,50 au-delà, sans objet ici). L'appli utilise aujourd'hui `claude-haiku-4-5` à 1 $ / 5 $ |
| Réflexion sur Haiku 5.5 | Active par défaut (adaptative), effort par défaut `medium`. On passe `output_config.effort: 'low'` et on laisse de la marge dans `max_tokens` (la réflexion compte dedans). Une réponse peut commencer par des blocs `thinking` : on lit le bloc de type `text`, jamais `content[0]` |
| Sorties structurées | `output_config: { format: { type: 'json_schema', schema } }`, déjà employé par `src/app/api/ia-edt/route.ts` |
| Refus | Haiku 5.5 peut répondre `stop_reason: 'refusal'` sans repli serveur : déjà traduit par `messageReponseIncomplete` (`src/lib/ia/erreurs.ts`) |
| Modèle d'accès 016 | `methode_sources` est en lecture seule pour l'appli et s'écrit par fonctions SQL, parce qu'une source et la progression changent ensemble. Une règle est une ligne seule : on garde de 016 le contrôle par le propriétaire de la classe (`classes.user_id = auth.uid()`) et le `revoke` des droits par défaut, et on autorise l'écriture directe filtrée par la même condition, comme `criteres_observation` (018) |

## Fichiers touchés

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/031_regles_rangement.sql` (créé) | la table, ses contraintes, son accès |
| `src/types/index.ts` | types `JourSemaine`, `RegleRangement` |
| `src/lib/progression-seances.ts` | exporte `domaineAbrege` (aucun changement de comportement) |
| `src/lib/regles-rangement.ts` (créé) | toute la logique pure du carnet |
| `src/lib/notions-creneaux.ts` | `placerNotionsDuJour` accepte les cases imposées par le carnet |
| `src/lib/cahier-journal.ts` | `genererCahierJournal(edt, progression, precedente, regles)` |
| `src/lib/actions/journal.ts` | lit le carnet avec le reste, sans jamais en dépendre |
| `src/lib/actions/regles-rangement.ts` (créé) | actions serveur : cases de la classe, enregistrer, supprimer |
| `src/lib/ia/anthropic.ts`, `src/lib/ia/cout.ts` | modèle `MODELE_REGLE` et son tarif |
| `src/lib/ia/schema-regle.ts` (créé) | schéma de sortie et lecture prudente de la réponse |
| `src/lib/ia/prompts.ts` | consignes de l'appel `ia-regle` |
| `src/app/api/ia-regle/route.ts` (créé) | la route IA « avec mes mots » |
| `src/lib/ia/regle-client.ts` (créé) | l'appel de la route depuis le navigateur |
| `src/components/rangement/AvecMesMots.tsx` (créé) | « Dis-moi où tu la fais », réutilisé aux étapes 2 et 3 |
| `src/components/parametres/MonRangementEditor.tsx` (créé) | la section « Mon rangement » |
| `src/app/(app)/parametres/page.tsx` | branche la section |

Chaque fichier de tests voyage dans le même commit que le fichier qu'il couvre.

---

### Task 1: La table du carnet (migration 031)

**Files:**
- Create: `supabase/migrations/031_regles_rangement.sql`
- Test: `src/lib/__tests__/regles-rangement-migration.test.ts`

- [x] **Step 1: Écrire le test qui échoue**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const migration = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '031_regles_rangement.sql'),
  'utf8',
).replace(/\r\n/g, '\n')

describe('migration du carnet de rangement', () => {
  test('crée une seule table, sans toucher aux autres', () => {
    expect(migration).toMatch(/create table if not exists public\.regles_rangement/i)
    expect(migration).not.toMatch(/alter table public\.(?!regles_rangement)/i)
    expect(migration).not.toMatch(/drop |delete from /i)
  })

  test('une règle par type et par classe, effacée avec la classe', () => {
    expect(migration).toMatch(/class_id uuid references public\.classes on delete cascade not null/i)
    expect(migration).toMatch(/unique \(class_id, type_cle\)/i)
    expect(migration).toMatch(/jour in \('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'\)/i)
    expect(migration).toMatch(/origine in \('main', 'cahier', 'ia'\)/i)
  })

  test('réservée au propriétaire de la classe', () => {
    expect(migration).toMatch(/enable row level security/i)
    expect(migration).toMatch(/for all\s+to authenticated/i)
    expect(migration.match(/c\.user_id = \(select auth\.uid\(\)\)/gi)).toHaveLength(2)
    expect(migration).toMatch(/with check/i)
    expect(migration).toMatch(/revoke all on table public\.regles_rangement from anon, authenticated/i)
    expect(migration).toMatch(/grant select, insert, update, delete on table public\.regles_rangement to authenticated/i)
  })
})
```

- [x] **Step 2: Vérifier qu'il échoue**

Run: `npx jest src/lib/__tests__/regles-rangement-migration.test.ts`
Expected: FAIL, `ENOENT` sur `031_regles_rangement.sql`.

- [x] **Step 3: Écrire la migration**

```sql
-- 031_regles_rangement.sql
--
-- Le carnet de rangement d'une classe : « Chant va dans Musique ».
-- Conception validée le 18/10/2026 :
-- docs/superpowers/specs/2026-10-18-carnet-de-rangement-design.md
--
-- Migration additive : aucune table existante n'est modifiée. Un carnet vide
-- laisse le cahier journal identique à celui d'avant.
--
-- Accès : comme methode_sources (016), seul le propriétaire de la classe voit
-- ses règles. Contrairement à 016, l'appli écrit directement : une règle est
-- une ligne seule, sans autre table à garder cohérente (modèle de 018).

create table if not exists public.regles_rangement (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes on delete cascade not null,
  -- Le type tel qu'écrit (« Écoute musicale »).
  type text not null,
  -- Le type comparé : sans accents, sans la marque du pluriel (cleType).
  type_cle text not null,
  -- Le nom de la case, tel qu'écrit dans emploi_du_temps.matiere.
  creneau text not null,
  -- Jour préféré, pour ce qui n'a pas de jour. Vide : aucun.
  jour text,
  origine text not null default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regles_rangement_type_non_vide check (length(trim(type)) > 0 and length(trim(type_cle)) > 0),
  constraint regles_rangement_creneau_non_vide check (length(trim(creneau)) > 0),
  constraint regles_rangement_jour_valide check (jour is null or jour in ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi')),
  constraint regles_rangement_origine_valide check (origine in ('main', 'cahier', 'ia')),
  constraint regles_rangement_unique unique (class_id, type_cle)
);

alter table public.regles_rangement enable row level security;

do $$ begin
  create policy "Users manage own storage rules"
    on public.regles_rangement
    for all
    to authenticated
    using (
      exists (
        select 1
        from public.classes c
        where c.id = regles_rangement.class_id
          and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1
        from public.classes c
        where c.id = regles_rangement.class_id
          and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;

-- Supabase peut accorder des droits de table par défaut : on repart de rien,
-- puis on rend aux enseignantes connectées ce que la policy filtre.
revoke all on table public.regles_rangement from anon, authenticated;
grant select, insert, update, delete on table public.regles_rangement to authenticated;
```

- [x] **Step 4: Vérifier qu'il passe**

Run: `npx jest src/lib/__tests__/regles-rangement-migration.test.ts`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add supabase/migrations/031_regles_rangement.sql src/lib/__tests__/regles-rangement-migration.test.ts
git commit -m "Carnet de rangement : migration 031 (table regles_rangement, non appliquee)"
```

**Fini quand :** le test passe. La migration N'EST PAS appliquée en base (décision de Christophe, voir la tâche 13).

---

### Task 2: Le cœur pur : quelle règle pour quelle chose

**Files:**
- Modify: `src/types/index.ts` (après `ProgressionMatiere`)
- Modify: `src/lib/progression-seances.ts` (`function domaineAbrege` devient `export function domaineAbrege`)
- Create: `src/lib/regles-rangement.ts`
- Test: `src/lib/__tests__/regles-rangement.test.ts`

- [x] **Step 1: Ajouter les types**

Dans `src/types/index.ts`, après le type `ProgressionMatiere` :

```ts
/** Un jour de la semaine d'école, tel qu'écrit en base. */
export type JourSemaine = CreneauHoraire['jour']

/**
 * Une règle du carnet de rangement d'une classe (migration 031) : « Chant va
 * dans Musique ». Conception du 18/10/2026.
 */
export type RegleRangement = {
  id: string
  class_id: string
  /** Le type tel qu'écrit (« Écoute musicale »). */
  type: string
  /** Le type comparé, calculé par `cleType`. Unique par classe. */
  type_cle: string
  /** Le nom de la case, tel qu'écrit dans l'emploi du temps. */
  creneau: string
  /** Jour préféré, pour ce qui n'a pas de jour. */
  jour: JourSemaine | null
  origine: 'main' | 'cahier' | 'ia'
}
```

Dans `src/lib/progression-seances.ts`, remplacer `function domaineAbrege(domaine: string): string {` par `export function domaineAbrege(domaine: string): string {`. Rien d'autre.

- [x] **Step 2: Écrire les tests qui échouent**

```ts
import {
  cleType, indexerRegles, regleDeSeance, regleDeNotion, estCaseDeRegle, lireRegles,
} from '../regles-rangement'
import type { CreneauHoraire, SeanceProgression } from '@/types'

const regle = (type: string, creneau: string, jour: CreneauHoraire['jour'] | null = null) =>
  ({ type, creneau, jour })

const seance = (libelle: string, domaine = '', jour: number | null = null): SeanceProgression =>
  ({ jour, domaine, libelle })

const c = (matiere: string, type: 'cours' | 'routine' = 'cours'): CreneauHoraire => ({
  id: matiere, class_id: 'classe', jour: 'jeudi', heure_debut: '08:00', heure_fin: '08:30',
  matiere, ordre: 0, couleur: null, type, methode_id: null, visible_journal: true,
})

describe('cleType', () => {
  it('compare sans accents, sans majuscules, sans la marque du pluriel', () => {
    expect(cleType('Écoute musicale')).toBe(cleType('ecoute musicales'))
    expect(cleType('Chants')).toBe('chant')
  })
  it('reconnaît la forme longue d’une abréviation de Cécile', () => {
    expect(cleType('Lecture compréhension')).toBe(cleType('LC'))
  })
  it('un type vide n’a pas de clé', () => {
    expect(cleType('   ')).toBe('')
  })
})

describe('quelle règle', () => {
  const index = indexerRegles([regle('Chant', 'Musique', 'jeudi'), regle('Fluence', 'Ateliers de français')])

  it('une séance relève de la règle de son domaine', () => {
    expect(regleDeSeance(seance('Chant : L’Europe', 'Chant'), index)?.creneau).toBe('Musique')
  })
  it('sans domaine rempli, le texte avant les deux points fait foi', () => {
    expect(regleDeSeance(seance('Fluence : texte 1'), index)?.creneau).toBe('Ateliers de français')
  })
  it('une séance sans type ne relève d’aucune règle', () => {
    expect(regleDeSeance(seance('Les prénoms de la classe'), index)).toBeUndefined()
  })
  it('une notion relève de la règle du premier de ses domaines qui en a une', () => {
    const index2 = indexerRegles([regle('EVARS', 'APC')])
    expect(regleDeNotion('EMC/EVARS/PHARE : Les familles', index2)?.creneau).toBe('APC')
    expect(regleDeNotion('Chant : L’Europe', index)?.jour).toBe('jeudi')
    expect(regleDeNotion('Numération : 5', index)).toBeUndefined()
  })
  it('un carnet vide ne donne aucune règle', () => {
    expect(regleDeSeance(seance('Chant : X', 'Chant'), indexerRegles([]))).toBeUndefined()
  })
})

describe('estCaseDeRegle', () => {
  it('compare le nom de la case sans accents ni majuscules', () => {
    expect(estCaseDeRegle(c('ateliers de francais'), regle('Fluence', 'Ateliers de français'))).toBe(true)
  })
  it('une routine n’est jamais la case d’une règle', () => {
    expect(estCaseDeRegle(c('Musique', 'routine'), regle('Chant', 'Musique'))).toBe(false)
  })
})

describe('lireRegles', () => {
  it('garde les lignes bien formées, écarte le reste', () => {
    expect(lireRegles([
      { type: 'Chant', creneau: 'Musique', jour: 'jeudi' },
      { type: 'Fluence', creneau: 'APC', jour: null },
      { type: 'Danse', creneau: 'EPS', jour: 'samedi' },
      { type: '', creneau: 'EPS', jour: null },
      null,
    ])).toEqual([
      { type: 'Chant', creneau: 'Musique', jour: 'jeudi' },
      { type: 'Fluence', creneau: 'APC', jour: null },
      { type: 'Danse', creneau: 'EPS', jour: null },
    ])
    expect(lireRegles(null)).toEqual([])
  })
})
```

- [x] **Step 3: Vérifier qu'ils échouent**

Run: `npx jest src/lib/__tests__/regles-rangement.test.ts`
Expected: FAIL, `Cannot find module '../regles-rangement'`.

- [x] **Step 4: Écrire le module**

```ts
import type { CreneauHoraire, JourSemaine, SeanceProgression } from '@/types'
import { sansAccents } from '@/data/trame-edt'
import { mots } from '@/lib/familles-seances'
import { domaineAbrege, domaineDe } from '@/lib/progression-seances'
import { domainesNotion } from '@/lib/notions-creneaux'

/**
 * Le carnet de rangement : des règles par type, « Chant va dans Musique »,
 * que le cahier journal lit EN PREMIER (conception validée par Christophe le
 * 18/10/2026, docs/superpowers/specs/2026-10-18-carnet-de-rangement-design.md).
 *
 * Ce module est pur : ni base, ni réseau. Il dit quelle règle vaut pour une
 * séance ou une notion, et si une case est celle d'une règle. Le placement
 * lui-même vit dans `cahier-journal.ts` et `notions-creneaux.ts`.
 */

export const JOURS_SEMAINE: readonly JourSemaine[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']

/** Ce que le cahier journal a besoin de savoir d'une règle. */
export type RegleAppliquee = { type: string; creneau: string; jour: JourSemaine | null }

export function estJourSemaine(v: unknown): v is JourSemaine {
  return typeof v === 'string' && (JOURS_SEMAINE as readonly string[]).includes(v)
}

/**
 * Le type comparé : l'abréviation de Cécile si elle en a une (« Lecture
 * compréhension » et « LC » sont le même type), puis la lecture `mots` de
 * `familles-seances.ts` (sans accents, sans la marque du pluriel).
 */
export function cleType(type: string): string {
  return mots(domaineAbrege(type.trim()))
}

/** Les règles par clé de type. Une clé vide n'est jamais indexée. */
export function indexerRegles(regles: RegleAppliquee[]): Map<string, RegleAppliquee> {
  const index = new Map<string, RegleAppliquee>()
  for (const r of regles) {
    const cle = cleType(r.type)
    if (cle && !index.has(cle)) index.set(cle, r)
  }
  return index
}

/** Le type d'une séance : son domaine s'il est rempli, sinon le texte avant les deux points. */
export function regleDeSeance(s: SeanceProgression, index: Map<string, RegleAppliquee>): RegleAppliquee | undefined {
  if (index.size === 0) return undefined
  const cle = cleType(s.domaine || domaineDe(s.libelle))
  return cle ? index.get(cle) : undefined
}

/** Le type d'une notion : chacun de ses domaines ; le premier qui a une règle l'emporte. */
export function regleDeNotion(notion: string, index: Map<string, RegleAppliquee>): RegleAppliquee | undefined {
  if (index.size === 0) return undefined
  for (const d of domainesNotion(notion)) {
    const r = index.get(cleType(d))
    if (r) return r
  }
  return undefined
}

/** Vrai pour une case de cours qui porte le nom de la case de la règle. Le jour se juge à part. */
export function estCaseDeRegle(c: CreneauHoraire, r: RegleAppliquee): boolean {
  return c.type === 'cours' && sansAccents(c.matiere) === sansAccents(r.creneau)
}

/**
 * Les règles lues en base, sans jamais faire échouer le cahier journal : une
 * ligne mal formée est écartée, un jour illisible devient « aucun jour ».
 */
export function lireRegles(v: unknown): RegleAppliquee[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((brut): RegleAppliquee[] => {
    const o = (brut ?? {}) as Record<string, unknown>
    const type = typeof o.type === 'string' ? o.type.trim() : ''
    const creneau = typeof o.creneau === 'string' ? o.creneau.trim() : ''
    if (!type || !creneau) return []
    return [{ type, creneau, jour: estJourSemaine(o.jour) ? o.jour : null }]
  })
}
```

Note : `notions-creneaux.ts` importe déjà `familles-seances.ts` et `progression-seances.ts`, pas `regles-rangement.ts` : il n'y a pas d'import circulaire. Le garder ainsi (la tâche 3 ne fait PAS importer `regles-rangement.ts` par `notions-creneaux.ts`).

- [x] **Step 5: Vérifier qu'ils passent, et que rien d'autre ne bouge**

Run: `npx jest src/lib/__tests__/regles-rangement.test.ts`
Expected: PASS.
Run: `npx jest src/lib/__tests__/progression-seances.test.ts src/lib/__tests__/familles-seances.test.ts`
Expected: PASS, aucun test modifié.

- [x] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/progression-seances.ts src/lib/regles-rangement.ts src/lib/__tests__/regles-rangement.test.ts
git commit -m "Carnet de rangement : quelle regle pour quelle seance ou notion"
```

**Fini quand :** les nouveaux tests passent et les tests existants des deux modules touchés passent sans modification.

---

### Task 3: Les notions acceptent les cases imposées par le carnet

**Files:**
- Modify: `src/lib/notions-creneaux.ts` (`placerNotionsDuJour` et un type exporté)
- Test: `src/lib/__tests__/notions-carnet.test.ts`

- [x] **Step 1: Écrire les tests qui échouent**

```ts
import { placerNotionsDuJour, type CreneauNotions } from '../notions-creneaux'

const cr = (nom: string, progression: number | null = null, general = false, ouvert = true): CreneauNotions =>
  ({ nom, progression, general, ouvert })

const CHANT = 'Chant : L’Europe'

describe('placerNotionsDuJour et le carnet', () => {
  it('sans carnet, rien ne change : la notion à son nom va dans sa case', () => {
    const { parCreneau } = placerNotionsDuJour([cr('Chant', 0)], [[CHANT]])
    expect(parCreneau).toEqual([[{ progression: 0, rang: 0 }]])
  })

  it('une notion du carnet va dans les cases données, même une case fermée aux notions', () => {
    const { parCreneau } = placerNotionsDuJour(
      [cr('Musique', 0), cr('Ateliers de français', null, false, false)],
      [[CHANT]], undefined, () => new Set([1]),
    )
    expect(parCreneau).toEqual([[], [{ progression: 0, rang: 0 }]])
  })

  it('une notion du carnet ne va ni dans la case à son nom, ni dans la case générale', () => {
    const { parCreneau } = placerNotionsDuJour(
      [cr('Chant', 0), cr('Arts', 0, true)], [[CHANT]], undefined, () => new Set<number>(),
    )
    expect(parCreneau).toEqual([[], []])
  })

  it('les autres notions gardent leur placement', () => {
    const { parCreneau } = placerNotionsDuJour(
      [cr('Musique', 0), cr('Arts', 0, true)],
      [[CHANT, 'Arts plastiques : tour Eiffel']], undefined,
      (_k, rang) => (rang === 0 ? new Set([0]) : undefined),
    )
    expect(parCreneau).toEqual([[{ progression: 0, rang: 0 }], [{ progression: 0, rang: 1 }]])
  })

  it('une notion du carnet n’est jamais « continuée » par un créneau partagé', () => {
    // Sans progression, le poème qui continue SERAIT « continué » sans carnet.
    const sansCarnet = placerNotionsDuJour([cr('EMC / Poésie')], [['Poésie : Trois escargots']], [[false]])
    expect(sansCarnet.continuees).toEqual([{ progression: 0, rang: 0 }])
    const { continuees } = placerNotionsDuJour(
      [cr('EMC / Poésie')], [['Poésie : Trois escargots']], [[false]], () => new Set<number>(),
    )
    expect(continuees).toEqual([])
  })
})
```

- [x] **Step 2: Vérifier qu'ils échouent**

Run: `npx jest src/lib/__tests__/notions-carnet.test.ts`
Expected: le premier test PASSE (comportement d'aujourd'hui), les quatre autres ÉCHOUENT (le quatrième argument est ignoré : la notion va encore à son nom ou au général).

- [x] **Step 3: Écrire le code**

Dans `src/lib/notions-creneaux.ts`, ajouter avant `placerNotionsDuJour` :

```ts
/**
 * Pour une notion qui relève d'une règle du carnet de rangement : les rangs,
 * dans les créneaux du jour, des cases où la règle la met (ensemble vide : pas
 * ce jour-là). `undefined` : pas de règle, la notion se place par son nom.
 * Calculé par `cahier-journal.ts`, qui connaît le jour et les règles.
 */
export type CasesDeRegle = (progression: number, rang: number) => Set<number> | undefined
```

Remplacer la signature et le corps de `placerNotionsDuJour` (le commentaire au-dessus reste, compléter son dernier paragraphe par : « LE CARNET DE RANGEMENT (18/10/2026) passe en premier : une notion pour laquelle `casesDeRegle` répond va dans ces cases et nulle part ailleurs, même dans un créneau fermé aux notions ; elle ne se place ni par son nom, ni dans le créneau général. Sans `casesDeRegle`, rien ne change. ») :

```ts
export function placerNotionsDuJour(
  creneaux: CreneauNotions[],
  notions: string[][],
  nouvelles: boolean[][] = notions.map(liste => liste.map(() => true)),
  casesDeRegle?: CasesDeRegle,
): { parCreneau: NotionPlacee[][]; continuees: NotionPlacee[] } {
  // Le carnet d'abord : les cases de la règle de chaque notion, s'il y en a une.
  const regle = notions.map((liste, k) => liste.map((_, r) => casesDeRegle?.(k, r)))
  // Les notions d'une autre matière qu'un créneau partagé a écartées parce
  // qu'elles continuent (le poème déjà montré la semaine où il a commencé) :
  // l'appelant ne les met pas à placer chaque semaine.
  const continuees: NotionPlacee[] = []
  const parLeNom = (cr: CreneauNotions): boolean[][] => {
    // Une notion du carnet ne se place jamais par son nom.
    const brut = notions.map((liste, k) => liste.map((n, r) => !regle[k][r] && cr.ouvert && creneauNommePour(cr.nom, n)))
    if (!estCreneauPartage(cr.nom)) return brut
    // Sans progression (pas de ligne d'EMC cette semaine-là), tout ce qu'il
    // nomme est « d'une autre matière » : le poème n'entre que s'il est nouveau.
    const autre = (k: number) => cr.progression === null || k !== cr.progression
    const decouverte = brut.some((liste, k) => autre(k) && liste.some((oui, r) => oui && nouvelles[k][r]))
    brut.forEach((liste, k) => liste.forEach((oui, r) => {
      if (oui && autre(k) && !nouvelles[k][r]) continuees.push({ progression: k, rang: r })
    }))
    return brut.map((liste, k) => liste.map((oui, r) =>
      oui && (autre(k) ? nouvelles[k][r] : !decouverte)))
  }
  const nommePour = creneaux.map((cr, i) => parLeNom(cr).map((liste, k) =>
    liste.map((oui, r) => (regle[k][r] ? regle[k][r]!.has(i) : oui))))
  const aSonCreneau = notions.map((liste, k) =>
    liste.map((_, r) => nommePour.some(parProgression => parProgression[k][r])))

  const parCreneau = creneaux.map((cr, i) => {
    const ordre = cr.progression === null
      ? notions.map((_, k) => k)
      : [cr.progression, ...notions.map((_, k) => k).filter(k => k !== cr.progression)]
    return ordre.flatMap(k => notions[k].flatMap((_, rang): NotionPlacee[] => {
      if (regle[k][rang]) return nommePour[i][k][rang] ? [{ progression: k, rang }] : []
      if (!cr.ouvert) return []
      const general = cr.general && cr.progression === k && !aSonCreneau[k][rang]
      return nommePour[i][k][rang] || general ? [{ progression: k, rang }] : []
    }))
  })
  return { parCreneau, continuees }
}
```

Pourquoi c'est identique sans carnet : `regle` ne contient que des `undefined`, donc `brut` est le même, `nommePour` aussi, et un créneau fermé rend toujours une liste vide.

- [x] **Step 4: Vérifier**

Run: `npx jest src/lib/__tests__/notions-carnet.test.ts src/lib/__tests__/cahier-journal-notions.test.ts`
Expected: PASS, aucun test existant modifié.

- [x] **Step 5: Commit**

```bash
git add src/lib/notions-creneaux.ts src/lib/__tests__/notions-carnet.test.ts
git commit -m "Carnet de rangement : les notions acceptent les cases du carnet"
```

**Fini quand :** les deux fichiers de tests passent.

---

### Task 4: Le cahier journal applique le carnet en premier

**Files:**
- Modify: `src/lib/cahier-journal.ts` (`notionsDeLaSemaine`, `genererCahierJournal`)
- Test: `src/lib/__tests__/cahier-journal-carnet.test.ts`

Rappel de la conception (« Comment le cahier journal s'en sert ») : séance datée, première case libre de ce nom ce jour-là (le jour du document l'emporte) ; séance sans jour, jour préféré sinon premier jour qui a la case, une fois ; notion, la case chaque jour où elle existe, ou seulement le jour préféré ; case absente : à placer. Pas de règle : rangement d'aujourd'hui. Les lignes anciennes (« Jour N » sans séances, option B) ne relèvent pas du carnet à l'étape 1.

- [x] **Step 1: Écrire les tests qui échouent**

```ts
import { genererCahierJournal } from '../cahier-journal'
import type { CreneauHoraire, JourJournal, ProgressionMatiere, SeanceProgression } from '@/types'
import type { RegleAppliquee } from '../regles-rangement'

/**
 * Le carnet de rangement dans le cahier journal (conception du 18/10/2026).
 * Cases inspirées du vrai emploi du temps de Cécile (aucune reliée à une
 * méthode) ; sa case « Musique » est le jeudi, la classe de test en a une le
 * mardi : on garde les deux pour voir le jour préféré.
 */
type Jour = CreneauHoraire['jour']
const c = (jour: Jour, ordre: number, matiere: string, type: 'cours' | 'routine' = 'cours'): CreneauHoraire => ({
  id: `${jour}-${ordre}`, class_id: 'classe', jour, heure_debut: '08:00', heure_fin: '08:30',
  matiere, ordre, couleur: null, type, methode_id: null, visible_journal: true,
})
const EDT: CreneauHoraire[] = [
  c('lundi', 3, 'Phonologie encodage décodage'), c('lundi', 4, 'Ateliers de français'), c('lundi', 9, 'Mathématiques'),
  c('mardi', 3, 'Phonologie encodage décodage'), c('mardi', 4, 'Ateliers de français'), c('mardi', 13, 'Musique'),
  c('jeudi', 3, 'Phonologie encodage décodage'), c('jeudi', 4, 'Ateliers de français'),
  c('jeudi', 13, 'Musique'), c('jeudi', 15, 'Arts plastiques'),
  c('vendredi', 3, 'Phonologie encodage décodage'), c('vendredi', 4, 'Ateliers de français'), c('vendredi', 5, 'APC'),
]

// Domaine vide, comme les 715 séances de Cécile remplies par 028 : le type se
// lit devant les deux points, et le libellé ressort intact de `lireSeances`.
const PHONO: SeanceProgression = { jour: 1, domaine: '', libelle: 'Phonologie : le son a' }
const FLUENCE_MARDI: SeanceProgression = { jour: 2, domaine: '', libelle: 'Fluence : texte 1' }
const FLUENCE_SANS_JOUR: SeanceProgression = { jour: null, domaine: '', libelle: 'Fluence : texte 2' }
const CHANT = 'Chant : L’Europe'
const ARTS = 'Arts plastiques : Dessiner la tour Eiffel'

const PROGRESSION: ProgressionMatiere[] = [
  { methode_id: null, matiere: 'francais', items: [], pages: null, mots_exemple: [],
    seances: [PHONO, FLUENCE_MARDI, FLUENCE_SANS_JOUR] },
  { methode_id: null, matiere: 'arts', items: [CHANT, ARTS], pages: null, mots_exemple: [] },
  { methode_id: null, matiere: 'maths', items: ['Numération : 5'], pages: null, mots_exemple: [] },
]

const regle = (type: string, creneau: string, jour: Jour | null = null): RegleAppliquee => ({ type, creneau, jour })
const jour = (j: JourJournal[], nom: Jour) => j.find(x => x.jour === nom)!
const dans = (j: JourJournal, nom: string) => j.seances.find(s => s.matiere === nom)!.deroulement
const aPlacer = (j: JourJournal[]) => j.flatMap(x => (x.aPlacer ?? []).map(a => `${x.jour}:${a.libelle}`))

describe('carnet vide : cahier journal identique', () => {
  it('sans règle, avec un carnet vide ou des règles hors sujet, le résultat est le même', () => {
    const sans = genererCahierJournal(EDT, PROGRESSION)
    expect(genererCahierJournal(EDT, PROGRESSION, undefined, [])).toEqual(sans)
    expect(genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Danse', 'EPS')])).toEqual(sans)
  })
  it('sans carnet, la fluence et le chant partent à placer (le constat du 18/10)', () => {
    const j = genererCahierJournal(EDT, PROGRESSION)
    expect(aPlacer(j)).toEqual(expect.arrayContaining(['mardi:Fluence : texte 1', 'lundi:Fluence : texte 2', `lundi:${CHANT}`]))
  })
})

describe('les notions', () => {
  it('« Chant vers Musique » : le chant paraît dans chaque case Musique de la semaine', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Musique')])
    expect(dans(jour(j, 'mardi'), 'Musique')).toBe(CHANT)
    expect(dans(jour(j, 'jeudi'), 'Musique')).toBe(CHANT)
    expect(aPlacer(j)).not.toContain(`lundi:${CHANT}`)
  })
  it('avec un jour préféré, seulement ce jour-là', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Musique', 'jeudi')])
    expect(dans(jour(j, 'jeudi'), 'Musique')).toBe(CHANT)
    expect(dans(jour(j, 'mardi'), 'Musique')).toBe('Musique')
  })
  it('une règle vers une case qui n’existe pas envoie la notion à placer, une fois', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Éveil musical')])
    expect(aPlacer(j).filter(x => x.endsWith(CHANT))).toEqual([`lundi:${CHANT}`])
  })
  it('les autres notions gardent leur place', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Musique')])
    expect(dans(jour(j, 'jeudi'), 'Arts plastiques')).toBe(ARTS)
  })
})

describe('les séances', () => {
  it('séance datée : la case de la règle, le jour du document', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Ateliers de français', 'vendredi')])
    expect(dans(jour(j, 'mardi'), 'Ateliers de français')).toBe('Fluence : texte 1')
  })
  it('séance sans jour : le jour préféré de la règle', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Ateliers de français', 'vendredi')])
    expect(dans(jour(j, 'vendredi'), 'Ateliers de français')).toBe('Fluence : texte 2')
    expect(aPlacer(j)).not.toContain('lundi:Fluence : texte 2')
  })
  it('séance sans jour, règle sans jour : le premier jour qui a la case, une seule fois', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Ateliers de français')])
    expect(dans(jour(j, 'lundi'), 'Ateliers de français')).toBe('Fluence : texte 2')
    expect(j.filter(x => dans(x, 'Ateliers de français') === 'Fluence : texte 2')).toHaveLength(1)
  })
  it('case de la règle absente ce jour-là : à placer', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'APC')])
    expect(aPlacer(j)).toContain('mardi:Fluence : texte 1')
    expect(dans(jour(j, 'vendredi'), 'APC')).toBe('Fluence : texte 2')
  })
  it('la règle passe en premier : elle prend la case, la séance à son nom part à placer', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Phonologie encodage décodage')])
    expect(dans(jour(j, 'lundi'), 'Phonologie encodage décodage')).toBe('Fluence : texte 2')
    expect(aPlacer(j)).toContain('lundi:Phonologie : le son a')
  })
  it('la phonologie sans règle reste à sa place', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Ateliers de français')])
    expect(dans(jour(j, 'lundi'), 'Phonologie encodage décodage')).toBe('Phonologie : le son a')
  })
})
```

- [x] **Step 2: Vérifier qu'ils échouent**

Run: `npx jest src/lib/__tests__/cahier-journal-carnet.test.ts`
Expected: FAIL sur les tests « notions » et « séances » (le quatrième argument est ignoré). Les deux tests « carnet vide » passent déjà : c'est voulu, ils gardent la non-régression.

Si le test « sans carnet, la fluence et le chant partent à placer » ÉCHOUE, s'arrêter : le constat de départ n'est pas celui de la conception, le signaler avant d'écrire du code.

- [x] **Step 3: Écrire le code**

Dans `src/lib/cahier-journal.ts` :

1. Imports, à ajouter :

```ts
import {
  indexerRegles, regleDeNotion, regleDeSeance, estCaseDeRegle, type RegleAppliquee,
} from '@/lib/regles-rangement'
```

2. Ajouter, avant `notionsDeLaSemaine` :

```ts
/**
 * Une case qui reçoit, en plus de son contenu, des lignes venues d'ailleurs
 * (le carnet de rangement). Un contenu qui n'est que le nom de la case
 * s'efface devant elles ; sinon elles s'écrivent dessous, une par ligne.
 */
function avecLignes(contenu: string, ajout: string | undefined, nom: string): string {
  if (!ajout) return contenu
  return contenu === nom || contenu === '' ? ajout : `${contenu}\n${ajout}`
}

/**
 * Le jour (rang dans la semaine d'école) où le carnet range une séance SANS
 * jour : le jour préféré de la règle, sinon le premier jour qui a sa case.
 * -1 : aucun.
 */
function jourDuCarnet(
  regle: RegleAppliquee,
  jours: { jour: string; creneaux: CreneauHoraire[] }[],
): number {
  if (regle.jour) return jours.findIndex(j => j.jour === regle.jour)
  return jours.findIndex(j => j.creneaux.some(c => estCaseDeRegle(c, regle)))
}
```

3. `notionsDeLaSemaine` : changer le type de `jours` en `{ jour: string; creneaux: CreneauHoraire[]; progressionDe: (ProgressionMatiere | null)[] }[]`, ajouter le dernier paramètre `regles: Map<string, RegleAppliquee>`, et remplacer la construction de `placements` par :

```ts
  // Le carnet de rangement passe en premier (conception du 18/10/2026) : une
  // notion dont le type a une règle va dans la case de la règle, chaque jour
  // où elle existe, ou seulement le jour préféré.
  const regleDe = notions.map(liste => liste.map(n => regleDeNotion(n, regles)))

  const placements = jours.map(({ jour, creneaux, progressionDe }) => {
    const casesDeRegle = (k: number, rang: number) => {
      const r = regleDe[k][rang]
      if (!r) return undefined
      if (r.jour && r.jour !== jour) return new Set<number>()
      return new Set(creneaux.flatMap((c, i) => (estCaseDeRegle(c, r) ? [i] : [])))
    }
    const { parCreneau, continuees } = placerNotionsDuJour(creneaux.map((c, i) => {
      const p = progressionDe[i]
      return {
        nom: c.matiere,
        progression: rangDe(p),
        general: p ? estCreneauGenerique(c.matiere, p) : false,
        ouvert: c.type !== 'routine' && !(p && horsNotions(p)),
      }
    }), notions, nouvelles, casesDeRegle)
```

(la suite du bloc, à partir de `for (const liste of parCreneau)`, ne change pas). Une notion du carnet qu'aucune case n'a reçue de la semaine reste `montrees = false` : elle part à placer une fois, le premier jour, par le code existant. C'est le cas « case absente » de la conception.

4. `genererCahierJournal` : nouvelle signature et documentation.

```ts
export function genererCahierJournal(
  emploiDuTemps: CreneauHoraire[],
  progression: ProgressionMatiere[],
  precedente?: ProgressionMatiere[],
  regles: RegleAppliquee[] = [],
): JourJournal[] {
```

Ajouter à la fin de son commentaire : « `regles` est le carnet de rangement de la classe (conception du 18/10/2026), appliqué EN PREMIER : une séance ou une notion dont le type a une règle va dans la case de la règle, ou à placer si elle n'y trouve pas de place ; le reste suit le rangement ci-dessus. Carnet vide : cahier journal identique. »

Dans le corps :

- la construction de `jours` rend aussi le nom du jour : `return { jour, creneaux, progressionDe }` ;
- juste après `jours`, avant `notionsDeLaSemaine` :

```ts
  // Le carnet de rangement, et les séances datées qu'il range, avec le jour
  // où il les range. Un « Jour 5 » sur une semaine de quatre jours garde le
  // rangement d'aujourd'hui : il part à placer avec sa mention d'origine.
  const index = indexerRegles(regles)
  const duCarnet = new Map<SeanceProgression, { regle: RegleAppliquee; jour: number }>()
  for (const p of datees) {
    for (const s of lues.get(p) ?? []) {
      const regle = regleDeSeance(s, index)
      if (!regle || (s.jour !== null && s.jour > joursEcole.length)) continue
      duCarnet.set(s, { regle, jour: s.jour !== null ? s.jour - 1 : jourDuCarnet(regle, jours) })
    }
  }
```

- l'appel devient `notionsDeLaSemaine(jours, progression, p => datees.includes(p) || anciennes.includes(p), precedente, index)` ;
- dans la fabrication de chaque jour, juste après `const aPlacer: SeancePlacer[] = []` :

```ts
    // Le carnet d'abord : chaque séance qu'il range prend la première case
    // libre qui porte le nom de sa règle ; sinon elle part à placer.
    const parRegle = new Map<number, string>()
    for (const [s, { regle, jour: rang }] of duCarnet) {
      if (rang === -1 ? indexJour !== 0 : rang !== indexJour) continue
      const i = rang === -1 ? -1 : creneaux.findIndex((c, j) => !parRegle.has(j) && estCaseDeRegle(c, regle))
      if (i >= 0) parRegle.set(i, s.libelle)
      else aPlacer.push({ libelle: s.libelle, origine: s.jour === null ? 'semaine' : null })
    }
```

- dans la boucle `for (const p of datees)` des séances du jour, exclure les cases prises et les séances du carnet :

```ts
      const indices = creneaux.flatMap((_, i) => (progressionDe[i] === p && !parRegle.has(i) ? [i] : []))
      const duJour = (lues.get(p) ?? []).filter(s => s.jour === indexJour + 1 && !duCarnet.has(s))
```

- remplacer la fabrication de `seances` (le `creneaux.map` qui suit) par :

```ts
    const seances = creneaux.map((c, i): SeanceJournal => {
      const base = {
        matiere: c.matiere, heure_debut: c.heure_debut,
        heure_fin: c.heure_fin, type: c.type,
      }
      // Les routines (récréation, accueil, rituels) ne se remplissent pas.
      if (c.type === 'routine') return { ...base, deroulement: '' }

      const p = progressionDe[i]
      const notionsIci = notions.textes[indexJour].get(i)
      let contenu: string
      // Sans progression, il peut encore porter le nom d'une notion (17/10).
      if (!p) contenu = notionsIci ?? c.matiere
      else if (anciennes.includes(p)) {
        // Une case de l'ancien remplissage ne reçoit des notions que du carnet.
        contenu = avecLignes(itemsAnciens(p, indexJour, joursEcole.length) || c.matiere, notionsIci, c.matiere)
      } else if (!datees.includes(p)) {
        // Un créneau sans notion (un rituel) affiche son nom.
        contenu = notionsIci ?? c.matiere
      } else {
        // Un créneau sans séance affiche son nom, jamais une case vide (31/07).
        contenu = avecLignes(placees.get(i)?.libelle ?? c.matiere, notionsIci, c.matiere)
      }
      // La séance que le carnet a posée ici passe devant le reste.
      const duCarnetIci = parRegle.get(i)
      if (!duCarnetIci) return { ...base, deroulement: contenu }
      return { ...base, deroulement: contenu === c.matiere ? duCarnetIci : `${duCarnetIci}\n${contenu}` }
    })
```

- dans la boucle « hors des jours d'école », la condition de la séance sans jour devient `if (s.jour === null && indexJour === 0 && !duCarnet.has(s))`.

Pourquoi c'est identique sans carnet : `index` est vide, donc `duCarnet` et `parRegle` aussi ; `notionsIci` n'existe jamais pour une case fermée aux notions (la tâche 3 le garantit) ; chaque branche rend exactement l'ancienne valeur.

- [x] **Step 4: Vérifier**

Run: `npx jest src/lib/__tests__/cahier-journal-carnet.test.ts`
Expected: PASS.
Run: `npx jest src/lib/__tests__/cahier-journal`
Expected: PASS pour les sept fichiers `cahier-journal*`, aucun test existant modifié.
Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [x] **Step 5: Commit**

```bash
git add src/lib/cahier-journal.ts src/lib/__tests__/cahier-journal-carnet.test.ts
git commit -m "Carnet de rangement : le cahier journal applique les regles en premier"
```

**Fini quand :** les nouveaux tests passent, les sept fichiers `cahier-journal*` existants passent sans changement, `tsc` est muet.

---

### Task 5: Le cahier journal lit le carnet, sans jamais en dépendre

**Files:**
- Modify: `src/lib/actions/journal.ts`
- Test: `src/lib/actions/__tests__/journal-carnet.test.ts` (créer le dossier `__tests__`)

Point de sécurité : le code peut être mis en ligne avant la migration 031. La lecture du carnet qui échoue (table absente) doit donner un carnet vide, et le cahier journal se fabrique comme aujourd'hui.

- [x] **Step 1: Écrire les tests qui échouent**

```ts
import { genererCahierJournal } from '@/lib/cahier-journal'
import type { CreneauHoraire, ProgressionMatiere } from '@/types'

type Reponse = { data: unknown; error: unknown }
const mockReponses: Record<string, Reponse> = {}
const mockEcritures: { table: string; geste: string }[] = []

function mockRequete(table: string) {
  const reponse = () => mockReponses[table] ?? { data: null, error: null }
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit']) q[m] = () => q
  q.single = async () => reponse()
  q.maybeSingle = async () => reponse()
  q.insert = async () => { mockEcritures.push({ table, geste: 'insert' }); return { error: null } }
  q.upsert = async () => { mockEcritures.push({ table, geste: 'upsert' }); return { error: null } }
  q.then = (ok: (v: Reponse) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(reponse()).then(ok, ko)
  return q
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'prof-1' } } }) },
    from: (table: string) => mockRequete(table),
  })),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { genererOuChargerJournal, regenererJournal } from '../journal'

const creneau = (jour: CreneauHoraire['jour'], matiere: string): CreneauHoraire => ({
  id: `${jour}-${matiere}`, class_id: 'classe', jour, heure_debut: '08:00', heure_fin: '08:30',
  matiere, ordre: 1, couleur: null, type: 'cours', methode_id: null, visible_journal: true,
})
const EDT = [creneau('lundi', 'Mathématiques'), creneau('jeudi', 'Musique')]
const PROGRESSION: ProgressionMatiere[] = [
  { methode_id: null, matiere: 'arts', items: ['Chant : L’Europe'], pages: null, mots_exemple: [] },
]

beforeEach(() => {
  for (const k of Object.keys(mockReponses)) delete mockReponses[k]
  mockEcritures.length = 0
  mockReponses.semaines = { data: { id: 's1', class_id: 'classe', numero: 3 }, error: null }
  mockReponses.cahier_journal = { data: null, error: null }
  mockReponses.emploi_du_temps = { data: EDT, error: null }
  mockReponses.progression = { data: PROGRESSION, error: null }
})

describe('le cahier journal et le carnet de rangement', () => {
  it('carnet illisible (migration pas encore passée) : le cahier d’aujourd’hui, sans erreur', async () => {
    mockReponses.regles_rangement = { data: null, error: { message: 'relation "regles_rangement" does not exist' } }
    const r = await genererOuChargerJournal('s1')
    expect(r).toEqual({ ok: true, valeur: genererCahierJournal(EDT, PROGRESSION, PROGRESSION) })
    expect(mockEcritures).toEqual([{ table: 'cahier_journal', geste: 'insert' }])
  })

  it('les règles du carnet sont appliquées à la fabrication', async () => {
    mockReponses.regles_rangement = { data: [{ type: 'Chant', creneau: 'Musique', jour: null }], error: null }
    const r = await genererOuChargerJournal('s1')
    if (!r.ok) throw new Error(r.message)
    const jeudi = r.valeur.find(j => j.jour === 'jeudi')!
    expect(jeudi.seances.find(s => s.matiere === 'Musique')!.deroulement).toBe('Chant : L’Europe')
  })

  it('régénérer applique aussi le carnet', async () => {
    mockReponses.regles_rangement = { data: [{ type: 'Chant', creneau: 'Musique', jour: null }], error: null }
    const r = await regenererJournal('s1')
    if (!r.ok) throw new Error(r.message)
    expect(r.valeur.find(j => j.jour === 'jeudi')!.seances[0].deroulement).toBe('Chant : L’Europe')
    expect(mockEcritures).toEqual([{ table: 'cahier_journal', geste: 'upsert' }])
  })
})
```

- [x] **Step 2: Vérifier qu'ils échouent**

Run: `npx jest src/lib/actions/__tests__/journal-carnet.test.ts`
Expected: le premier test PASSE déjà (rien ne lit encore le carnet), les deux autres ÉCHOUENT (« Musique » au lieu du chant).

- [x] **Step 3: Écrire le code**

Dans `src/lib/actions/journal.ts`, ajouter l'import `import { lireRegles } from '@/lib/regles-rangement'`, puis, après `contexteJournal`, la fonction commune :

```ts
type Contexte = Awaited<ReturnType<typeof contexteJournal>>

/**
 * Charge ce qu'il faut et fabrique le cahier journal d'une semaine. Commun à
 * l'ouverture et à « Régénérer », qui le chargeaient chacun de leur côté.
 *
 * Deux lectures sont facultatives et ne bloquent jamais le cahier :
 * - la semaine d'avant (une notion qui continue, voir `placerNotionsDuJour`) ;
 * - le carnet de rangement (migration 031). Illisible, par exemple avant que
 *   la migration soit passée, il compte pour vide : le cahier est alors
 *   exactement celui d'avant le carnet.
 */
async function fabriquerJournal({ supabase, semaine }: Contexte) {
  const [
    { data: edt, error: edtError },
    { data: progression, error: progressionError },
    { data: precedente, error: precedenteError },
    { data: regles, error: reglesError },
  ] = await Promise.all([
    supabase.from('emploi_du_temps').select('*').eq('class_id', semaine.class_id),
    supabase.from('progression').select('methode_id, matiere, items, pages, mots_exemple, seances')
      .eq('class_id', semaine.class_id).eq('numero', semaine.numero),
    supabase.from('progression').select('methode_id, matiere, items, pages, mots_exemple')
      .eq('class_id', semaine.class_id).eq('numero', semaine.numero - 1),
    supabase.from('regles_rangement').select('type, creneau, jour').eq('class_id', semaine.class_id),
  ])
  if (edtError || progressionError) {
    throw new Error('Les données nécessaires au cahier journal n’ont pas pu être chargées.')
  }
  return genererCahierJournal(
    edt ?? [], progression ?? [],
    precedenteError ? undefined : precedente ?? [],
    reglesError ? [] : lireRegles(regles),
  )
}
```

Dans `genererOuChargerJournal`, remplacer tout le bloc qui va de `const [` jusqu'à la ligne `const contenu = genererCahierJournal(...)` comprise par :

```ts
    const contexte = await contexteJournal(semaineId)
```

placé en tête (à la place de `const { supabase, semaine } = await contexteJournal(semaineId)`), puis `const { supabase } = contexte` et, à l'endroit du calcul, `const contenu = await fabriquerJournal(contexte)`. Faire de même dans `regenererJournal`. Le reste (lecture du cahier existant, insert, upsert, `revalidatePath`, messages) ne change pas.

- [x] **Step 4: Vérifier**

Run: `npx jest src/lib/actions/__tests__/journal-carnet.test.ts`
Expected: PASS (3 tests).
Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [x] **Step 5: Commit**

```bash
git add src/lib/actions/journal.ts src/lib/actions/__tests__/journal-carnet.test.ts
git commit -m "Carnet de rangement : le cahier journal lit le carnet, vide s'il est illisible"
```

**Fini quand :** les trois tests passent, dont celui de la table absente.

---

### Task 6: Ce que montre « Mon rangement » (logique pure)

**Files:**
- Modify: `src/lib/regles-rangement.ts`
- Test: `src/lib/__tests__/regles-rangement-parametres.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import {
  casesDisponibles, estRegleSansCase, regrouperRegles, preparerRegle, lireReglesCompletes,
} from '../regles-rangement'
import type { CreneauHoraire, RegleRangement } from '@/types'

type Ligne = Pick<CreneauHoraire, 'jour' | 'matiere' | 'type' | 'visible_journal'>
const l = (jour: CreneauHoraire['jour'], matiere: string, type: 'cours' | 'routine' = 'cours', visible_journal = true): Ligne =>
  ({ jour, matiere, type, visible_journal })
const EDT: Ligne[] = [
  l('lundi', 'Mathématiques'), l('jeudi', 'mathématiques'), l('jeudi', 'Musique'),
  l('lundi', 'Récréation', 'routine'), l('mardi', 'Rituel : je découvre une œuvre', 'cours', false),
  l('vendredi', 'APC'),
]
const regle = (id: string, type: string, creneau: string, jour: CreneauHoraire['jour'] | null = null): RegleRangement =>
  ({ id, class_id: 'classe', type, type_cle: type.toLowerCase(), creneau, jour, origine: 'main' })

describe('casesDisponibles', () => {
  it('seulement les cases de cours visibles, une fois par nom, avec leurs jours', () => {
    expect(casesDisponibles(EDT)).toEqual([
      { nom: 'APC', jours: ['vendredi'] },
      { nom: 'Mathématiques', jours: ['lundi', 'jeudi'] },
      { nom: 'Musique', jours: ['jeudi'] },
    ])
  })
})

describe('estRegleSansCase', () => {
  const cases = casesDisponibles(EDT)
  it('une case renommée ou supprimée est signalée', () => {
    expect(estRegleSansCase(regle('1', 'Chant', 'Éveil musical'), cases)).toBe(true)
  })
  it('une case qui n’existe pas le jour préféré est signalée', () => {
    expect(estRegleSansCase(regle('1', 'Chant', 'Musique', 'lundi'), cases)).toBe(true)
  })
  it('une règle juste ne l’est pas', () => {
    expect(estRegleSansCase(regle('1', 'Chant', 'musique', 'jeudi'), cases)).toBe(false)
  })
})

describe('regrouperRegles', () => {
  it('les types qui vont dans la même case, le même jour, sur une ligne', () => {
    const groupes = regrouperRegles([
      regle('1', 'Chant', 'Musique', 'jeudi'), regle('2', 'Fluence', 'APC'),
      regle('3', 'Écoute musicale', 'musique', 'jeudi'),
    ])
    expect(groupes.map(g => [g.creneau, g.jour, g.regles.map(r => r.type)])).toEqual([
      ['APC', null, ['Fluence']],
      ['Musique', 'jeudi', ['Chant', 'Écoute musicale']],
    ])
  })
})

describe('preparerRegle', () => {
  const cases = casesDisponibles(EDT)
  it('reprend l’écriture de la case telle qu’elle est dans l’emploi du temps', () => {
    expect(preparerRegle({ type: ' Chant ', creneau: 'musique', jour: 'jeudi' }, cases)).toEqual({
      ok: true, valeur: { type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi' },
    })
  })
  it('refuse une case absente, avec un message pour elle', () => {
    expect(preparerRegle({ type: 'Chant', creneau: 'Chorale', jour: null }, cases))
      .toEqual({ ok: false, message: 'Je ne trouve pas de case « Chorale » dans ton emploi du temps.' })
  })
  it('refuse un jour où la case n’existe pas', () => {
    expect(preparerRegle({ type: 'Chant', creneau: 'Musique', jour: 'lundi' }, cases))
      .toEqual({ ok: false, message: 'Ta case « Musique » n’existe pas le lundi.' })
  })
  it('refuse un type vide, une routine, une case cachée', () => {
    expect(preparerRegle({ type: '  ', creneau: 'Musique', jour: null }, cases).ok).toBe(false)
    expect(preparerRegle({ type: 'Jeu', creneau: 'Récréation', jour: null }, cases).ok).toBe(false)
    expect(preparerRegle({ type: 'Art', creneau: 'Rituel : je découvre une œuvre', jour: null }, cases).ok).toBe(false)
  })
})

describe('lireReglesCompletes', () => {
  it('lit les lignes de la base et écarte les incomplètes', () => {
    expect(lireReglesCompletes([
      { id: '1', class_id: 'c', type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi', origine: 'ia' },
      { id: '2', class_id: 'c', type: 'Fluence', type_cle: 'fluence', creneau: 'APC', jour: 'dimanche', origine: '?' },
      { id: 3, class_id: 'c', type: 'X', type_cle: 'x', creneau: 'APC' },
    ])).toEqual([
      { id: '1', class_id: 'c', type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi', origine: 'ia' },
      { id: '2', class_id: 'c', type: 'Fluence', type_cle: 'fluence', creneau: 'APC', jour: null, origine: 'main' },
    ])
  })
})
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx jest src/lib/__tests__/regles-rangement-parametres.test.ts`
Expected: FAIL, fonctions non exportées.

- [ ] **Step 3: Écrire le code**

Ajouter à `src/lib/regles-rangement.ts` (et `RegleRangement` à l'import des types) :

```ts
/** Une case que l'enseignante peut choisir pour une règle : son nom, ses jours. */
export type CaseDisponible = { nom: string; jours: JourSemaine[] }

type LigneEdt = Pick<CreneauHoraire, 'jour' | 'matiere' | 'type' | 'visible_journal'>

/**
 * Les cases qu'une règle peut viser : les cases de COURS visibles dans le
 * cahier journal (conception : les routines cachées ne sont pas proposées).
 * Un nom écrit deux fois (« Mathématiques », « mathématiques ») est une seule
 * case, sous sa première écriture rencontrée. Rangées par nom.
 */
export function casesDisponibles(edt: LigneEdt[]): CaseDisponible[] {
  const parCle = new Map<string, CaseDisponible>()
  for (const c of edt) {
    if (c.type !== 'cours' || c.visible_journal === false) continue
    const cle = sansAccents(c.matiere)
    if (!cle) continue
    const k = parCle.get(cle) ?? { nom: c.matiere.trim(), jours: [] }
    if (!k.jours.includes(c.jour)) k.jours.push(c.jour)
    parCle.set(cle, k)
  }
  return [...parCle.values()]
    .map(k => ({ ...k, jours: JOURS_SEMAINE.filter(j => k.jours.includes(j)) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

function caseNommee(cases: CaseDisponible[], nom: string): CaseDisponible | undefined {
  const cle = sansAccents(nom)
  return cases.find(k => sansAccents(k.nom) === cle)
}

/** Une règle dont la case n'existe plus, ou plus ce jour-là : signalée en orange. */
export function estRegleSansCase(r: Pick<RegleRangement, 'creneau' | 'jour'>, cases: CaseDisponible[]): boolean {
  const k = caseNommee(cases, r.creneau)
  return !k || (r.jour !== null && !k.jours.includes(r.jour))
}

export type GroupeRegles = { creneau: string; jour: JourSemaine | null; regles: RegleRangement[] }

/** Pour l'affichage : une ligne par case et par jour, les types regroupés. */
export function regrouperRegles(regles: RegleRangement[]): GroupeRegles[] {
  const groupes = new Map<string, GroupeRegles>()
  for (const r of regles) {
    const cle = `${sansAccents(r.creneau)}|${r.jour ?? ''}`
    const g = groupes.get(cle) ?? { creneau: r.creneau, jour: r.jour, regles: [] }
    g.regles.push(r)
    groupes.set(cle, g)
  }
  const rangJour = (j: JourSemaine | null) => (j === null ? -1 : JOURS_SEMAINE.indexOf(j))
  return [...groupes.values()].sort((a, b) =>
    a.creneau.localeCompare(b.creneau, 'fr') || rangJour(a.jour) - rangJour(b.jour))
}

export type RegleAEnregistrer = { type: string; type_cle: string; creneau: string; jour: JourSemaine | null }

/**
 * Vérifie une règle avant de l'enregistrer, contre l'emploi du temps de la
 * classe. Le message est écrit pour l'enseignante.
 */
export function preparerRegle(
  entree: { type: string; creneau: string; jour: JourSemaine | null },
  cases: CaseDisponible[],
): { ok: true; valeur: RegleAEnregistrer } | { ok: false; message: string } {
  const type = entree.type.trim()
  const type_cle = cleType(type)
  if (!type || !type_cle) return { ok: false, message: 'Écris ce que tu ranges (par exemple « Chant »).' }
  if (type.length > 80) return { ok: false, message: 'Ce nom est trop long : 80 caractères au plus.' }
  const k = caseNommee(cases, entree.creneau)
  if (!k) return { ok: false, message: `Je ne trouve pas de case « ${entree.creneau.trim()} » dans ton emploi du temps.` }
  if (entree.jour !== null && !k.jours.includes(entree.jour)) {
    return { ok: false, message: `Ta case « ${k.nom} » n’existe pas le ${entree.jour}.` }
  }
  return { ok: true, valeur: { type, type_cle, creneau: k.nom, jour: entree.jour } }
}

const ORIGINES: readonly RegleRangement['origine'][] = ['main', 'cahier', 'ia']

/** Les lignes complètes de la base, pour Paramètres. */
export function lireReglesCompletes(v: unknown): RegleRangement[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((brut): RegleRangement[] => {
    const o = (brut ?? {}) as Record<string, unknown>
    const texte = (x: unknown) => (typeof x === 'string' ? x.trim() : '')
    const [id, class_id, type, type_cle, creneau] = [o.id, o.class_id, o.type, o.type_cle, o.creneau].map(texte)
    if (!id || !class_id || !type || !type_cle || !creneau) return []
    const origine = ORIGINES.find(x => x === o.origine) ?? 'main'
    return [{ id, class_id, type, type_cle, creneau, jour: estJourSemaine(o.jour) ? o.jour : null, origine }]
  })
}
```

Note sur le test `lireReglesCompletes` : la troisième ligne (`id: 3`, un nombre) est écartée par `texte`, c'est voulu.

- [ ] **Step 4: Vérifier**

Run: `npx jest src/lib/__tests__/regles-rangement`
Expected: PASS (les trois fichiers `regles-rangement*`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/regles-rangement.ts src/lib/__tests__/regles-rangement-parametres.test.ts
git commit -m "Carnet de rangement : cases disponibles, regles signalees, regroupement, verification"
```

**Fini quand :** les trois fichiers de tests du module passent.

---

### Task 7: Les actions serveur du carnet

**Files:**
- Create: `src/lib/actions/regles-rangement.ts`
- Test: `src/lib/actions/__tests__/regles-rangement-actions.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
type Reponse = { data: unknown; error: unknown }
const mockReponses: Record<string, Reponse> = {}
const mockGestes: { table: string; geste: string; valeur?: unknown; options?: unknown }[] = []

function mockRequete(table: string) {
  const reponse = () => mockReponses[table] ?? { data: null, error: null }
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit']) q[m] = () => q
  q.single = async () => reponse()
  q.maybeSingle = async () => reponse()
  for (const geste of ['insert', 'update', 'upsert', 'delete']) {
    q[geste] = (valeur?: unknown, options?: unknown) => { mockGestes.push({ table, geste, valeur, options }); return q }
  }
  q.then = (ok: (v: Reponse) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(reponse()).then(ok, ko)
  return q
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'prof-1' } } }) },
    from: (table: string) => mockRequete(table),
  })),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { casesDeMaClasse, enregistrerRegle, supprimerRegle } from '../regles-rangement'

const LIGNE = { id: 'r1', class_id: 'classe', type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi', origine: 'main' }

beforeEach(() => {
  for (const k of Object.keys(mockReponses)) delete mockReponses[k]
  mockGestes.length = 0
  mockReponses.classes = { data: { id: 'classe' }, error: null }
  mockReponses.emploi_du_temps = {
    data: [{ jour: 'jeudi', matiere: 'Musique', type: 'cours', visible_journal: true }], error: null,
  }
  mockReponses.regles_rangement = { data: LIGNE, error: null }
})

describe('actions du carnet de rangement', () => {
  it('les cases de la classe', async () => {
    expect(await casesDeMaClasse()).toEqual({ ok: true, valeur: [{ nom: 'Musique', jours: ['jeudi'] }] })
  })

  it('une règle neuve s’enregistre par type, avec la clé calculée côté serveur', async () => {
    const r = await enregistrerRegle({ type: 'Chant', creneau: 'musique', jour: 'jeudi' })
    expect(r).toEqual({ ok: true, valeur: LIGNE })
    expect(mockGestes).toEqual([{
      table: 'regles_rangement', geste: 'upsert',
      valeur: expect.objectContaining({ class_id: 'classe', type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi', origine: 'main' }),
      options: { onConflict: 'class_id,type_cle' },
    }])
  })

  it('une règle refusée n’écrit rien', async () => {
    const r = await enregistrerRegle({ type: 'Chant', creneau: 'Chorale', jour: null })
    expect(r).toEqual({ ok: false, message: 'Je ne trouve pas de case « Chorale » dans ton emploi du temps.' })
    expect(mockGestes).toEqual([])
  })

  it('modifier une règle passe par son identifiant', async () => {
    await enregistrerRegle({ id: 'r1', type: 'Chant', creneau: 'Musique', jour: null })
    expect(mockGestes[0]).toMatchObject({ table: 'regles_rangement', geste: 'update' })
  })

  it('deux règles pour un même type : un message clair', async () => {
    mockReponses.regles_rangement = { data: null, error: { code: '23505' } }
    const r = await enregistrerRegle({ id: 'r1', type: 'Chant', creneau: 'Musique', jour: null })
    expect(r).toEqual({ ok: false, message: 'Tu as déjà une règle pour « Chant ». Modifie celle-là.' })
  })

  it('supprimer', async () => {
    mockReponses.regles_rangement = { data: null, error: null }
    expect(await supprimerRegle('r1')).toEqual({ ok: true, valeur: undefined })
    expect(mockGestes[0]).toMatchObject({ table: 'regles_rangement', geste: 'delete' })
  })
})
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx jest src/lib/actions/__tests__/regles-rangement-actions.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Écrire les actions**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resultat, type Resultat } from '@/lib/resultat'
import {
  casesDisponibles, lireReglesCompletes, preparerRegle, type CaseDisponible,
} from '@/lib/regles-rangement'
import type { JourSemaine, RegleRangement } from '@/types'

// Ces actions RENVOIENT leur message d'erreur au lieu de le lever : en
// production, Next.js efface le texte d'une erreur levée dans une action
// serveur et l'enseignante ne lirait qu'un digest. Voir `src/lib/resultat.ts`.

type Client = Awaited<ReturnType<typeof createClient>>

async function maClasse(): Promise<{ supabase: Client; classId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tu dois être connectée pour modifier ton rangement.')
  const { data: classe, error } = await supabase.from('classes').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error || !classe) throw new Error('Ta classe est introuvable.')
  return { supabase, classId: classe.id as string }
}

async function casesDe(supabase: Client, classId: string): Promise<CaseDisponible[]> {
  const { data, error } = await supabase.from('emploi_du_temps')
    .select('jour, matiere, type, visible_journal').eq('class_id', classId)
  if (error) throw new Error('Ton emploi du temps n’a pas pu être lu.')
  return casesDisponibles((data ?? []) as Parameters<typeof casesDisponibles>[0])
}

/** Les cases de cours visibles de la classe, pour les choix et pour l'IA. */
export async function casesDeMaClasse(): Promise<Resultat<CaseDisponible[]>> {
  return resultat(async () => {
    const { supabase, classId } = await maClasse()
    return casesDe(supabase, classId)
  }, 'Ton emploi du temps n’a pas pu être lu.')
}

/**
 * Enregistre une règle. Sans `id`, une règle pour un type déjà rangé le
 * remplace (une règle par type et par classe). Avec `id`, la règle est
 * modifiée. La case est vérifiée contre l'emploi du temps de la classe.
 */
export async function enregistrerRegle(entree: {
  id?: string
  type: string
  creneau: string
  jour: JourSemaine | null
  origine?: RegleRangement['origine']
}): Promise<Resultat<RegleRangement>> {
  return resultat(async () => {
    const { supabase, classId } = await maClasse()
    const prete = preparerRegle(entree, await casesDe(supabase, classId))
    if (!prete.ok) throw new Error(prete.message)
    const champs = { ...prete.valeur, updated_at: new Date().toISOString() }
    const colonnes = 'id, class_id, type, type_cle, creneau, jour, origine'
    const { data, error } = entree.id
      ? await supabase.from('regles_rangement').update(champs)
        .eq('id', entree.id).eq('class_id', classId).select(colonnes).single()
      : await supabase.from('regles_rangement')
        .upsert({ ...champs, class_id: classId, origine: entree.origine ?? 'main' }, { onConflict: 'class_id,type_cle' })
        .select(colonnes).single()
    if (error?.code === '23505') throw new Error(`Tu as déjà une règle pour « ${prete.valeur.type} ». Modifie celle-là.`)
    const [regle] = lireReglesCompletes(data ? [data] : [])
    if (error || !regle) throw new Error('La règle n’a pas pu être enregistrée.')
    revalidatePath('/parametres')
    return regle
  }, 'La règle n’a pas pu être enregistrée.')
}

export async function supprimerRegle(id: string): Promise<Resultat<void>> {
  return resultat(async () => {
    const { supabase, classId } = await maClasse()
    const { error } = await supabase.from('regles_rangement').delete().eq('id', id).eq('class_id', classId)
    if (error) throw new Error('La règle n’a pas pu être supprimée.')
    revalidatePath('/parametres')
  }, 'La règle n’a pas pu être supprimée.')
}
```

Si `tsc` refuse `prete.valeur` après `throw` (rétrécissement), écrire `if (!prete.ok) throw new Error(prete.message)` puis `const valeur = prete.valeur` : le comportement ne change pas.

- [ ] **Step 4: Vérifier**

Run: `npx jest src/lib/actions/__tests__/regles-rangement-actions.test.ts`
Expected: PASS (6 tests).
Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/regles-rangement.ts src/lib/actions/__tests__/regles-rangement-actions.test.ts
git commit -m "Carnet de rangement : actions serveur (cases, enregistrer, supprimer)"
```

**Fini quand :** les six tests passent et `tsc` est muet.

---

### Task 8: L'appel IA « avec mes mots » : modèle, tarif, schéma, consignes

**Files:**
- Modify: `src/lib/ia/anthropic.ts`, `src/lib/ia/cout.ts`, `src/lib/ia/prompts.ts`
- Create: `src/lib/ia/schema-regle.ts`
- Test: `src/lib/ia/__tests__/schema-regle.test.ts`, et un cas ajouté au `test.each` de `src/lib/ia/__tests__/anthropic.test.ts` (AJOUT d'une ligne au tableau : aucun test existant n'est modifié dans son attente)

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/lib/ia/__tests__/anthropic.test.ts`, ajouter `MODELE_REGLE` à l'import et la ligne `['regle', MODELE_REGLE],` au tableau du `test.each` « le modèle %s est au catalogue de tarifs ».

`src/lib/ia/__tests__/schema-regle.test.ts` :

```ts
import { lireReponseRegle, REGLE_JSON_SCHEMA } from '../schema-regle'
import { SYSTEM_REGLE, userRegle } from '../prompts'

const CASES = [
  { nom: 'APC', jours: ['mardi' as const] },
  { nom: 'Musique', jours: ['jeudi' as const] },
]
const brut = (o: Record<string, string>) => ({ statut: 'regle', type: '', creneau: '', jour: '', plus_proche: '', ...o })

describe('lireReponseRegle', () => {
  it('une règle sur une case qui existe, à l’écriture de l’emploi du temps', () => {
    expect(lireReponseRegle(brut({ type: 'Chant', creneau: 'musique', jour: 'jeudi' }), CASES)).toEqual({
      statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: 'jeudi' },
    })
  })
  it('le type connu l’emporte sur celui que l’IA a lu', () => {
    expect(lireReponseRegle(brut({ type: 'chants', creneau: 'Musique' }), CASES, 'Chant')).toEqual({
      statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: null },
    })
  })
  it('une case inventée par l’IA n’est jamais rendue comme règle', () => {
    expect(lireReponseRegle(brut({ type: 'Fluence', creneau: 'Ateliers', plus_proche: 'Atelier X' }), CASES)).toEqual({
      statut: 'introuvable', type: 'Fluence', demande: 'Ateliers', plusProche: null,
    })
  })
  it('case introuvable avec une case proche qui existe', () => {
    expect(lireReponseRegle(brut({ statut: 'introuvable', type: 'Fluence', creneau: 'Soutien', jour: 'mardi', plus_proche: 'APC' }), CASES))
      .toEqual({ statut: 'introuvable', type: 'Fluence', demande: 'Soutien le mardi', plusProche: { creneau: 'APC', jour: 'mardi' } })
  })
  it('la case existe, mais pas ce jour-là : introuvable, la case sans jour en proposition', () => {
    expect(lireReponseRegle(brut({ type: 'Fluence', creneau: 'APC', jour: 'vendredi' }), CASES)).toEqual({
      statut: 'introuvable', type: 'Fluence', demande: 'APC le vendredi', plusProche: { creneau: 'APC', jour: null },
    })
  })
  it('incompris : réponse vide, mal formée, ou sans type', () => {
    expect(lireReponseRegle(null, CASES)).toEqual({ statut: 'incompris' })
    expect(lireReponseRegle(brut({ statut: 'incompris' }), CASES)).toEqual({ statut: 'incompris' })
    expect(lireReponseRegle(brut({ creneau: 'Musique' }), CASES)).toEqual({ statut: 'incompris' })
  })
})

describe('le schéma et les consignes', () => {
  it('le schéma impose les cinq champs', () => {
    expect(REGLE_JSON_SCHEMA.required).toEqual(['statut', 'type', 'creneau', 'jour', 'plus_proche'])
  })
  it('les consignes donnent la phrase, le type connu et les cases par jour', () => {
    const texte = userRegle({ phrase: 'le chant c’est le jeudi en musique', type: 'Chant', cases: CASES })
    expect(texte).toContain('le chant c’est le jeudi en musique')
    expect(texte).toContain('Type concerné : Chant')
    expect(texte).toContain('jeudi : Musique')
    expect(texte).toContain('mardi : APC')
    expect(SYSTEM_REGLE).toContain('introuvable')
  })
})
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx jest src/lib/ia/__tests__/schema-regle.test.ts src/lib/ia/__tests__/anthropic.test.ts`
Expected: FAIL (modules et exports absents).

- [ ] **Step 3: Écrire le code**

`src/lib/ia/anthropic.ts`, après `MODELE_COURT` :

```ts
// « Avec mes mots » (carnet de rangement, 18/10/2026) : comprendre une phrase
// courte et rendre une règle. Haiku 5.5 (vérifié le 18/10/2026 : 0,10 $ /
// 0,50 $ le million de jetons, dix fois moins que Haiku 4.5). Sa réflexion est
// active par défaut : la route la règle sur l'effort `low` et laisse de la
// marge dans `max_tokens`, qui la compte.
export const MODELE_REGLE = 'claude-haiku-5-5'
```

`src/lib/ia/cout.ts`, dans `TARIFS_USD_PAR_MTOK`, ajouter la ligne :

```ts
  // Tarif des prompts de moins de 100 000 jetons (0,50 / 2,50 au-delà) :
  // « avec mes mots » envoie quelques centaines de jetons.
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
```

`src/lib/ia/schema-regle.ts` :

```ts
import { sansAccents } from '@/data/trame-edt'
import { estJourSemaine, type CaseDisponible } from '@/lib/regles-rangement'
import type { JourSemaine } from '@/types'

/**
 * L'appel « avec mes mots » (carnet de rangement, conception du 18/10/2026) :
 * l'enseignante dit où elle fait une séance, l'IA en fait une règle.
 *
 * Le code ne fait jamais confiance au nom de case rendu : il le cherche dans
 * l'emploi du temps. Une case inventée devient « introuvable », jamais une
 * règle. Rien n'est enregistré ici : c'est son « C'est ça » qui enregistre.
 */
export const REGLE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    statut: { type: 'string', enum: ['regle', 'introuvable', 'incompris'] },
    type: { type: 'string' },
    creneau: { type: 'string' },
    jour: { type: 'string', enum: ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] },
    plus_proche: { type: 'string' },
  },
  required: ['statut', 'type', 'creneau', 'jour', 'plus_proche'],
} as const

export type RegleComprise = { type: string; creneau: string; jour: JourSemaine | null }

export type ReponseRegle =
  | { statut: 'regle'; regle: RegleComprise }
  | { statut: 'introuvable'; type: string; demande: string; plusProche: { creneau: string; jour: JourSemaine | null } | null }
  | { statut: 'incompris' }

export function lireReponseRegle(brut: unknown, cases: CaseDisponible[], typeConnu?: string): ReponseRegle {
  if (!brut || typeof brut !== 'object') return { statut: 'incompris' }
  const o = brut as Record<string, unknown>
  const texte = (x: unknown) => (typeof x === 'string' ? x.trim() : '')
  const type = typeConnu?.trim() || texte(o.type)
  if (o.statut === 'incompris' || !type) return { statut: 'incompris' }
  if (o.statut !== 'regle' && o.statut !== 'introuvable') return { statut: 'incompris' }

  const jour = estJourSemaine(o.jour) ? o.jour : null
  const nommee = (nom: string) => cases.find(k => sansAccents(k.nom) === sansAccents(nom) && sansAccents(nom) !== '')
  const demandee = nommee(texte(o.creneau))
  if (o.statut === 'regle' && demandee && (jour === null || demandee.jours.includes(jour))) {
    return { statut: 'regle', regle: { type, creneau: demandee.nom, jour } }
  }
  const proche = nommee(texte(o.plus_proche)) ?? demandee
  const demande = texte(o.creneau)
  return {
    statut: 'introuvable',
    type,
    demande: demande && jour ? `${demande} le ${jour}` : demande,
    plusProche: proche ? { creneau: proche.nom, jour: jour && proche.jours.includes(jour) ? jour : null } : null,
  }
}
```

`src/lib/ia/prompts.ts`, à la fin du fichier (ajouter `import type { CaseDisponible } from '@/lib/regles-rangement'` en tête) :

```ts
/** « Avec mes mots » : une phrase de l'enseignante devient une règle de rangement. */
export const SYSTEM_REGLE = `Tu aides une enseignante de CP à ranger son cahier journal.
Elle te dit, avec ses mots, dans quelle case de son emploi du temps elle fait un type de séance.
Tu rends une seule règle : le type de séance, la case, et le jour s'il est dit.

- type : le type de séance dont elle parle, au singulier, avec une majuscule (« la fluence » donne « Fluence »). Si un type concerné t'est donné, reprends-le tel quel.
- creneau : la case qu'elle nomme. Écris-la EXACTEMENT comme dans la liste de ses cases.
- jour : le jour qu'elle dit (lundi à vendredi), sinon vide.
- statut « regle » : la case qu'elle nomme est dans la liste, et existe ce jour-là s'il est dit.
- statut « introuvable » : la case qu'elle nomme n'est pas dans la liste, ou pas ce jour-là. Mets dans creneau ce qu'elle a dit, et dans plus_proche le nom exact de la case de la liste qui ressemble le plus à ce qu'elle veut (vide si aucune).
- statut « incompris » : sa phrase ne dit pas où ranger quelque chose.
N'invente jamais une case qui n'est pas dans la liste.`

export function userRegle(opts: { phrase: string; type?: string; cases: CaseDisponible[] }): string {
  const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const
  const lignes = jours.flatMap(j => {
    const noms = opts.cases.filter(k => k.jours.includes(j)).map(k => k.nom)
    return noms.length ? [`${j} : ${noms.join(', ')}`] : []
  })
  return [
    'Ses cases, jour par jour :',
    ...lignes,
    '',
    opts.type ? `Type concerné : ${opts.type}` : 'Type concerné : à lire dans sa phrase',
    '',
    'Sa phrase :',
    opts.phrase,
  ].join('\n')
}
```

- [ ] **Step 4: Vérifier**

Run: `npx jest src/lib/ia/__tests__`
Expected: PASS, dont `cout.test.ts` et `prompts.test.ts` inchangés.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ia/anthropic.ts src/lib/ia/cout.ts src/lib/ia/prompts.ts src/lib/ia/schema-regle.ts src/lib/ia/__tests__/schema-regle.test.ts src/lib/ia/__tests__/anthropic.test.ts
git commit -m "Carnet de rangement : appel IA avec mes mots (Haiku 5.5, schema, consignes)"
```

**Fini quand :** tous les tests de `src/lib/ia/__tests__` passent.

---

### Task 9: La route `ia-regle`

**Files:**
- Create: `src/app/api/ia-regle/route.ts`
- Test: `src/app/api/ia-regle/route.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
const mockCreate = jest.fn()
const mockEnregistrerUsageIA = jest.fn()
const mockUtilisateurCourant = jest.fn()
const mockCasesDeMaClasse = jest.fn()
const mockSoldeIA = jest.fn()

jest.mock('@/lib/ia/anthropic', () => ({
  getAnthropicClient: jest.fn(() => ({ messages: { create: mockCreate } })),
  MODELE_REGLE: 'modele-test',
}))
jest.mock('@/lib/actions/ia-usage', () => ({
  enregistrerUsageIA: mockEnregistrerUsageIA,
  soldeIA: mockSoldeIA,
}))
jest.mock('@/lib/supabase/session', () => ({ utilisateurCourant: mockUtilisateurCourant }))
jest.mock('@/lib/actions/regles-rangement', () => ({ casesDeMaClasse: mockCasesDeMaClasse }))

import { POST } from './route'

const requete = (corps: unknown) => new Request('http://localhost/api/ia-regle', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
})
function reponseIA(sortie: unknown, stop_reason = 'end_turn') {
  mockCreate.mockResolvedValue({
    content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(sortie) }],
    usage: { input_tokens: 300, output_tokens: 40 }, stop_reason,
  })
}

describe('POST /api/ia-regle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUtilisateurCourant.mockResolvedValue({ id: 'prof-1' })
    mockSoldeIA.mockResolvedValue({ consommeUsd: 0, restantUsd: null, releveAt: null, soldeReleveUsd: null })
    mockCasesDeMaClasse.mockResolvedValue({ ok: true, valeur: [{ nom: 'Musique', jours: ['jeudi'] }] })
  })

  it('sans connexion : refusé, sans appel IA', async () => {
    mockUtilisateurCourant.mockResolvedValue(null)
    expect((await POST(requete({ phrase: 'le chant en musique' }))).status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('jauge IA vide : refusé, sans appel IA', async () => {
    mockSoldeIA.mockResolvedValue({ consommeUsd: 5, restantUsd: 0, releveAt: null, soldeReleveUsd: 5 })
    expect((await POST(requete({ phrase: 'le chant en musique' }))).status).toBe(402)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('phrase vide : un message pour elle', async () => {
    const r = await POST(requete({ phrase: ' ' }))
    expect(r.status).toBe(400)
    expect(await r.json()).toEqual({ error: 'Dis-moi en une phrase où tu fais cette séance.' })
  })

  it('emploi du temps vide : pas d’appel IA', async () => {
    mockCasesDeMaClasse.mockResolvedValue({ ok: true, valeur: [] })
    expect((await POST(requete({ phrase: 'le chant en musique' }))).status).toBe(422)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rend la règle comprise, en lisant le bloc texte après la réflexion, et compte la dépense', async () => {
    reponseIA({ statut: 'regle', type: 'Chant', creneau: 'musique', jour: 'jeudi', plus_proche: '' })
    const r = await POST(requete({ phrase: 'le chant c’est le jeudi en musique' }))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: 'jeudi' } } })
    expect(mockEnregistrerUsageIA).toHaveBeenCalledWith(expect.objectContaining({ route: 'ia-regle', modele: 'modele-test' }))
    const appel = mockCreate.mock.calls[0][0]
    expect(appel.model).toBe('modele-test')
    expect(appel.output_config.effort).toBe('low')
    expect(appel.output_config.format.type).toBe('json_schema')
  })

  it('réponse illisible : « incompris », jamais une erreur', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'pas du json' }], usage: {}, stop_reason: 'end_turn' })
    expect(await (await POST(requete({ phrase: 'bonjour' }))).json()).toEqual({ reponse: { statut: 'incompris' } })
  })

  it('réponse coupée : 422 avec un conseil, après avoir compté la dépense', async () => {
    reponseIA({}, 'max_tokens')
    expect((await POST(requete({ phrase: 'le chant en musique' }))).status).toBe(422)
    expect(mockEnregistrerUsageIA).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx jest src/app/api/ia-regle/route.test.ts`
Expected: FAIL, `Cannot find module './route'`.

- [ ] **Step 3: Écrire la route**

```ts
import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_REGLE } from '@/lib/ia/anthropic'
import { SYSTEM_REGLE, userRegle } from '@/lib/ia/prompts'
import { REGLE_JSON_SCHEMA, lireReponseRegle } from '@/lib/ia/schema-regle'
import { messageErreurIA, messageReponseIncomplete } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'
import { casesDeMaClasse } from '@/lib/actions/regles-rangement'
import { garderAppelIA } from '@/lib/ia/garde'

export const maxDuration = 30

/**
 * « Avec mes mots » (carnet de rangement, 18/10/2026) : l'enseignante dit où
 * elle fait une séance, l'IA rend une règle qu'elle validera (« C'est ça »).
 * Les cases sont lues en base, jamais reçues du navigateur : la réponse est
 * vérifiée contre son vrai emploi du temps. Rien n'est enregistré ici.
 */
export async function POST(request: Request) {
  const refus = await garderAppelIA()
  if (refus) return refus
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const phrase = typeof body.phrase === 'string' ? body.phrase.trim() : ''
    const type = typeof body.type === 'string' ? body.type.trim() : ''
    if (phrase.length < 3 || phrase.length > 500) {
      return NextResponse.json({ error: 'Dis-moi en une phrase où tu fais cette séance.' }, { status: 400 })
    }
    const cases = await casesDeMaClasse()
    if (!cases.ok) return NextResponse.json({ error: cases.message }, { status: 500 })
    if (cases.valeur.length === 0) {
      return NextResponse.json(
        { error: 'Ton emploi du temps est vide : remplis-le d’abord dans Paramètres.' },
        { status: 422 },
      )
    }

    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: MODELE_REGLE,
      // Haiku 5.5 réfléchit par défaut et la réflexion compte dans ce plafond :
      // de la marge pour une réponse de cinq champs.
      max_tokens: 2000,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: REGLE_JSON_SCHEMA },
      },
      system: SYSTEM_REGLE,
      messages: [{ role: 'user', content: userRegle({ phrase, type: type || undefined, cases: cases.valeur }) }],
    })

    await enregistrerUsageIA({ route: 'ia-regle', modele: MODELE_REGLE, usage: message.usage })

    // Usage enregistré d'abord : les jetons produits sont facturés même coupés.
    const incomplete = messageReponseIncomplete(message.stop_reason, 'Réessaie avec une phrase plus courte.')
    if (incomplete) return NextResponse.json({ error: incomplete.message }, { status: incomplete.status })

    // Une réponse peut commencer par des blocs de réflexion : on lit le texte.
    const bloc = message.content.find(b => b.type === 'text')
    let brut: unknown = null
    try {
      brut = bloc && 'text' in bloc ? JSON.parse(bloc.text) : null
    } catch {
      brut = null
    }
    return NextResponse.json({ reponse: lireReponseRegle(brut, cases.valeur, type || undefined) })
  } catch (err) {
    console.error('ia-regle error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
```

Si `npx tsc --noEmit` refuse `effort` dans `output_config` (SDK 0.104 trop ancien pour le connaître) : NE PAS monter le SDK dans ce chantier. Retirer la ligne `effort: 'low'`, passer `max_tokens` à 4000 (effort par défaut `medium`, plus de réflexion), adapter le test (`expect(appel.output_config.effort).toBeUndefined()`), et noter le point dans `AVANCEMENT-IMPORT-SEANCES.md`.

- [ ] **Step 4: Vérifier**

Run: `npx jest src/app/api/ia-regle/route.test.ts`
Expected: PASS (7 tests).
Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ia-regle/route.ts src/app/api/ia-regle/route.test.ts
git commit -m "Carnet de rangement : route ia-regle (avec mes mots)"
```

**Fini quand :** les sept tests passent et `tsc` est muet.

---

### Task 10: « Dis-moi où tu la fais » (composant réutilisable)

**Files:**
- Create: `src/lib/ia/regle-client.ts`
- Create: `src/components/rangement/AvecMesMots.tsx`
- Test: `src/components/rangement/__tests__/AvecMesMots.test.tsx`

Ce composant resert aux étapes 2 (bandeau du cahier journal) et 3 (import) : il ne connaît ni Paramètres ni la base. Il reçoit `onValidee`, qui enregistre et rend un message d'erreur ou `null`.

- [ ] **Step 1: Écrire les tests qui échouent**

```tsx
/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AvecMesMots from '@/components/rangement/AvecMesMots'
import { demanderRegle } from '@/lib/ia/regle-client'

jest.mock('@/lib/ia/regle-client', () => ({ demanderRegle: jest.fn() }))
const demander = demanderRegle as jest.Mock

function ecrireEtComprendre(phrase: string) {
  fireEvent.change(screen.getByLabelText('Dis-moi où tu la fais'), { target: { value: phrase } })
  fireEvent.click(screen.getByRole('button', { name: 'Comprendre' }))
}

beforeEach(() => jest.clearAllMocks())

it('montre ce qu’elle a compris, et enregistre sur « C’est ça »', async () => {
  demander.mockResolvedValue({ ok: true, reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: 'jeudi' } } })
  const onValidee = jest.fn(async () => null)
  render(<AvecMesMots onValidee={onValidee} />)
  ecrireEtComprendre('le chant c’est le jeudi en musique')
  expect(await screen.findByText('J’ai compris : Chant vers Musique, le jeudi.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'C’est ça' }))
  await waitFor(() => expect(onValidee).toHaveBeenCalledWith({ type: 'Chant', creneau: 'Musique', jour: 'jeudi' }))
  expect(await screen.findByText('C’est noté.')).toBeTruthy()
})

it('« Je réexplique » n’enregistre rien', async () => {
  demander.mockResolvedValue({ ok: true, reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: null } } })
  const onValidee = jest.fn(async () => null)
  render(<AvecMesMots onValidee={onValidee} />)
  ecrireEtComprendre('le chant en musique')
  fireEvent.click(await screen.findByRole('button', { name: 'Je réexplique' }))
  expect(screen.queryByText(/J’ai compris/)).toBeNull()
  expect(onValidee).not.toHaveBeenCalled()
})

it('case introuvable : le dit, et propose la plus proche', async () => {
  demander.mockResolvedValue({ ok: true, reponse: {
    statut: 'introuvable', type: 'Fluence', demande: 'Soutien le mardi', plusProche: { creneau: 'APC', jour: 'mardi' },
  } })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  ecrireEtComprendre('la fluence en soutien le mardi')
  expect(await screen.findByText('Je ne trouve pas de case « Soutien le mardi » dans ton emploi du temps.')).toBeTruthy()
  expect(screen.getByText('J’ai compris : Fluence vers APC, le mardi.')).toBeTruthy()
})

it('incompris deux fois : propose de la poser à la main, rien n’est enregistré', async () => {
  demander.mockResolvedValue({ ok: true, reponse: { statut: 'incompris' } })
  const onValidee = jest.fn(async () => null)
  render(<AvecMesMots onValidee={onValidee} />)
  ecrireEtComprendre('bonjour')
  expect(await screen.findByText('Je n’ai pas compris. Redis-le autrement, avec le nom de ta case.')).toBeTruthy()
  ecrireEtComprendre('euh')
  expect(await screen.findByText('Je n’ai pas compris, tu peux la poser à la main dans le cahier journal.')).toBeTruthy()
  expect(onValidee).not.toHaveBeenCalled()
})

it('IA indisponible : son message, jamais bloquée', async () => {
  demander.mockResolvedValue({ ok: false, message: 'Le crédit IA est épuisé.' })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  ecrireEtComprendre('le chant en musique')
  expect(await screen.findByText('Le crédit IA est épuisé.')).toBeTruthy()
  expect((screen.getByLabelText('Dis-moi où tu la fais') as HTMLTextAreaElement).disabled).toBe(false)
})
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx jest src/components/rangement`
Expected: FAIL, modules introuvables.

- [ ] **Step 3: Écrire le code**

`src/lib/ia/regle-client.ts` :

```ts
import type { ReponseRegle } from '@/lib/ia/schema-regle'

/** Appelle `/api/ia-regle` depuis le navigateur. Ne lève jamais : rend un message. */
export async function demanderRegle(
  phrase: string,
  type?: string,
): Promise<{ ok: true; reponse: ReponseRegle } | { ok: false; message: string }> {
  try {
    const res = await fetch('/api/ia-regle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase, type }),
    })
    const json = await res.json().catch(() => ({})) as { reponse?: ReponseRegle; error?: unknown }
    if (!res.ok || !json.reponse) {
      return {
        ok: false,
        message: typeof json.error === 'string' ? json.error : 'Je n’arrive pas à comprendre pour l’instant. Réessaie dans un moment.',
      }
    }
    return { ok: true, reponse: json.reponse }
  } catch {
    return { ok: false, message: 'Je n’arrive pas à joindre l’aide pour l’instant. Réessaie dans un moment.' }
  }
}
```

`src/components/rangement/AvecMesMots.tsx` :

```tsx
'use client'
import { useState } from 'react'
import { demanderRegle } from '@/lib/ia/regle-client'
import type { RegleComprise } from '@/lib/ia/schema-regle'

/** « Chant vers Musique, le jeudi » */
export function phraseRegle(r: RegleComprise): string {
  return `${r.type} vers ${r.creneau}${r.jour ? `, le ${r.jour}` : ''}`
}

/**
 * « Avec mes mots » (conception du 18/10/2026) : elle dit où elle fait une
 * séance, l'appli lui montre la règle comprise, elle répond « C'est ça » ou
 * « Je réexplique ». Rien n'est enregistré sans son « C'est ça ». Jamais
 * bloquée : une erreur s'affiche, le champ reste ouvert.
 *
 * Servira aussi au bandeau du cahier journal (étape 2) et à l'import
 * (étape 3) : `typeConnu` y donne le type déjà connu.
 */
export default function AvecMesMots({ typeConnu, onValidee, exemple }: {
  typeConnu?: string
  /** Enregistre la règle ; rend un message d'erreur, ou `null`. */
  onValidee: (regle: RegleComprise) => Promise<string | null>
  exemple?: string
}) {
  const [phrase, setPhrase] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [proposee, setProposee] = useState<RegleComprise | null>(null)
  const [introuvable, setIntrouvable] = useState<string | null>(null)
  const [incompris, setIncompris] = useState(0)
  const [erreur, setErreur] = useState<string | null>(null)
  const [notee, setNotee] = useState(false)

  async function comprendre() {
    setEnCours(true)
    setErreur(null)
    setProposee(null)
    setIntrouvable(null)
    setNotee(false)
    const r = await demanderRegle(phrase, typeConnu)
    setEnCours(false)
    if (!r.ok) {
      setErreur(r.message)
      return
    }
    const rep = r.reponse
    if (rep.statut === 'regle') {
      setProposee(rep.regle)
    } else if (rep.statut === 'introuvable') {
      setIntrouvable(rep.demande
        ? `Je ne trouve pas de case « ${rep.demande} » dans ton emploi du temps.`
        : 'Je ne trouve pas cette case dans ton emploi du temps.')
      if (rep.plusProche) setProposee({ type: rep.type, ...rep.plusProche })
    } else {
      setIncompris(n => n + 1)
    }
  }

  async function valider() {
    if (!proposee) return
    setEnCours(true)
    const message = await onValidee(proposee)
    setEnCours(false)
    if (message) {
      setErreur(message)
      return
    }
    setNotee(true)
    setProposee(null)
    setIntrouvable(null)
    setPhrase('')
    setIncompris(0)
  }

  function reexpliquer() {
    setProposee(null)
    setIntrouvable(null)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-700">
        Dis-moi où tu la fais
        <textarea
          className="mt-1 block w-full rounded border p-2 text-sm"
          rows={2}
          value={phrase}
          disabled={enCours}
          placeholder={exemple ?? 'Par exemple : le chant, c’est en Musique le jeudi'}
          onChange={e => setPhrase(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="rounded bg-violet-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        disabled={enCours || phrase.trim().length < 3}
        onClick={comprendre}
      >
        Comprendre
      </button>

      {introuvable && <p className="text-sm text-amber-700">{introuvable}</p>}
      {proposee && (
        <div className="rounded border border-violet-200 bg-violet-50 p-2 text-sm">
          <p>J’ai compris : {phraseRegle(proposee)}.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="rounded bg-violet-600 px-3 py-1 text-white" disabled={enCours} onClick={valider}>
              C’est ça
            </button>
            <button type="button" className="rounded border px-3 py-1" disabled={enCours} onClick={reexpliquer}>
              Je réexplique
            </button>
          </div>
        </div>
      )}
      {incompris === 1 && <p className="text-sm text-amber-700">Je n’ai pas compris. Redis-le autrement, avec le nom de ta case.</p>}
      {incompris >= 2 && <p className="text-sm text-amber-700">Je n’ai pas compris, tu peux la poser à la main dans le cahier journal.</p>}
      {erreur && <p className="text-sm text-red-700">{erreur}</p>}
      {notee && <p className="text-sm text-green-700">C’est noté.</p>}
    </div>
  )
}
```

Le message affiché par le test « J’ai compris : Chant vers Musique, le jeudi. » est rendu en un seul nœud texte : si Testing Library ne le trouve pas parce que React le découpe, écrire `<p>{`J’ai compris : ${phraseRegle(proposee)}.`}</p>`.

- [ ] **Step 4: Vérifier**

Run: `npx jest src/components/rangement`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ia/regle-client.ts src/components/rangement/AvecMesMots.tsx src/components/rangement/__tests__/AvecMesMots.test.tsx
git commit -m "Carnet de rangement : composant Avec mes mots"
```

**Fini quand :** les cinq tests passent.

---

### Task 11: La section « Mon rangement »

**Files:**
- Create: `src/components/parametres/MonRangementEditor.tsx`
- Test: `src/components/parametres/__tests__/MonRangementEditor.test.tsx`

- [ ] **Step 1: Écrire les tests qui échouent**

```tsx
/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import MonRangementEditor from '@/components/parametres/MonRangementEditor'
import { enregistrerRegle, supprimerRegle } from '@/lib/actions/regles-rangement'
import type { RegleRangement } from '@/types'

jest.mock('@/lib/actions/regles-rangement', () => ({
  enregistrerRegle: jest.fn(),
  supprimerRegle: jest.fn(async () => ({ ok: true, valeur: undefined })),
}))
jest.mock('@/lib/ia/regle-client', () => ({ demanderRegle: jest.fn() }))

const regle = (id: string, type: string, creneau: string, jour: RegleRangement['jour'] = null): RegleRangement =>
  ({ id, class_id: 'classe', type, type_cle: type.toLowerCase(), creneau, jour, origine: 'main' })
const CASES = [
  { nom: 'APC', jours: ['mardi' as const, 'vendredi' as const] },
  { nom: 'Musique', jours: ['jeudi' as const] },
]

beforeEach(() => jest.clearAllMocks())

it('carnet vide : le dit simplement', () => {
  render(<MonRangementEditor initial={[]} cases={CASES} />)
  expect(screen.getByText('Ton carnet est vide : tout est rangé automatiquement.')).toBeTruthy()
})

it('regroupe sur une ligne les types qui vont dans la même case', () => {
  render(<MonRangementEditor initial={[regle('1', 'Chant', 'Musique', 'jeudi'), regle('2', 'Écoute musicale', 'Musique', 'jeudi')]} cases={CASES} />)
  const ligne = screen.getByText('Chant, Écoute musicale').closest('li')!
  expect(within(ligne).getByText('Musique')).toBeTruthy()
  expect(within(ligne).getByText('le jeudi')).toBeTruthy()
  expect(screen.getByText('Ce qui n’est pas ici est rangé automatiquement.')).toBeTruthy()
})

it('signale en orange une règle dont la case n’existe plus, avec « Corriger »', () => {
  render(<MonRangementEditor initial={[regle('1', 'Chant', 'Éveil musical')]} cases={CASES} />)
  expect(screen.getByText('Cette case n’existe plus dans ton emploi du temps.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Corriger' })).toBeTruthy()
})

it('modifier le jour d’une règle', async () => {
  ;(enregistrerRegle as jest.Mock).mockResolvedValue({ ok: true, valeur: regle('2', 'Fluence', 'APC', 'vendredi') })
  render(<MonRangementEditor initial={[regle('2', 'Fluence', 'APC')]} cases={CASES} />)
  fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
  fireEvent.change(screen.getByLabelText('Jour pour Fluence'), { target: { value: 'vendredi' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
  await waitFor(() => expect(enregistrerRegle).toHaveBeenCalledWith({ id: '2', type: 'Fluence', creneau: 'APC', jour: 'vendredi' }))
  expect(await screen.findByText('le vendredi')).toBeTruthy()
})

it('supprimer demande une confirmation', async () => {
  render(<MonRangementEditor initial={[regle('2', 'Fluence', 'APC')]} cases={CASES} />)
  fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
  expect(supprimerRegle).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer' }))
  await waitFor(() => expect(supprimerRegle).toHaveBeenCalledWith('2'))
  expect(await screen.findByText('Ton carnet est vide : tout est rangé automatiquement.')).toBeTruthy()
})

it('carnet pas encore installé : un message, rien d’autre', () => {
  render(<MonRangementEditor initial={[]} cases={CASES} indisponible />)
  expect(screen.getByText('Le carnet de rangement n’est pas encore activé.')).toBeTruthy()
  expect(screen.queryByText('Ajouter une règle avec mes mots')).toBeNull()
})
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx jest src/components/parametres/__tests__/MonRangementEditor.test.tsx`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Écrire le composant**

```tsx
'use client'
import { useState } from 'react'
import AvecMesMots from '@/components/rangement/AvecMesMots'
import { enregistrerRegle, supprimerRegle } from '@/lib/actions/regles-rangement'
import {
  JOURS_SEMAINE, estRegleSansCase, regrouperRegles, type CaseDisponible, type GroupeRegles,
} from '@/lib/regles-rangement'
import type { JourSemaine, RegleRangement } from '@/types'

/**
 * Paramètres, « Mon rangement » (maquette validée le 18/10/2026) : ce que je
 * range, va dans la case, jour. Les types d'une même case sont sur une ligne.
 * Une règle dont la case n'existe plus est signalée en orange.
 */
export default function MonRangementEditor({ initial, cases, indisponible = false }: {
  initial: RegleRangement[]
  cases: CaseDisponible[]
  indisponible?: boolean
}) {
  const [regles, setRegles] = useState(initial)
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [ajout, setAjout] = useState(false)

  if (indisponible) {
    return <p className="text-sm text-gray-500">Le carnet de rangement n’est pas encore activé.</p>
  }

  const remplacer = (r: RegleRangement) =>
    setRegles(liste => [...liste.filter(x => x.id !== r.id && x.type_cle !== r.type_cle), r])
  const retirer = (id: string) => setRegles(liste => liste.filter(x => x.id !== id))
  const groupes = regrouperRegles(regles)
  const cleGroupe = (g: GroupeRegles) => g.regles.map(r => r.id).join('|')

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Ce qui n’est pas ici est rangé automatiquement.</p>
      {groupes.length === 0 && (
        <p className="text-sm text-gray-500">Ton carnet est vide : tout est rangé automatiquement.</p>
      )}
      <ul className="space-y-2">
        {groupes.map(g => {
          const sansCase = estRegleSansCase(g, cases)
          const cle = cleGroupe(g)
          return (
            <li key={cle} className={`rounded border p-2 text-sm ${sansCase ? 'border-orange-300 bg-orange-50' : ''}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{g.regles.map(r => r.type).join(', ')}</span>
                <span className="text-gray-500">va dans</span>
                <span>{g.creneau}</span>
                <span className="text-gray-500">{g.jour ? `le ${g.jour}` : 'pas de jour préféré'}</span>
                <button type="button" className="ml-auto text-violet-700 hover:underline"
                  onClick={() => setOuvert(ouvert === cle ? null : cle)}>
                  {sansCase ? 'Corriger' : 'Modifier'}
                </button>
              </div>
              {sansCase && <p className="mt-1 text-orange-700">Cette case n’existe plus dans ton emploi du temps.</p>}
              {ouvert === cle && g.regles.map(r => (
                <EditeurRegle key={r.id} regle={r} cases={cases}
                  onEnregistree={nouvelle => { remplacer(nouvelle); setOuvert(null) }}
                  onSupprimee={() => { retirer(r.id); setOuvert(null) }} />
              ))}
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-gray-500">
        Tes cahiers journaux déjà ouverts ne changent pas tout seuls : dans la semaine voulue, clique sur
        « Régénérer » (tes retouches de cette semaine seront remplacées).
      </p>
      {ajout ? (
        <AvecMesMots onValidee={async r => {
          const res = await enregistrerRegle({ type: r.type, creneau: r.creneau, jour: r.jour })
          if (!res.ok) return res.message
          remplacer(res.valeur)
          return null
        }} />
      ) : (
        <button type="button" className="rounded border border-violet-300 px-3 py-1 text-sm text-violet-700"
          onClick={() => setAjout(true)}>
          Ajouter une règle avec mes mots
        </button>
      )}
    </div>
  )
}

function EditeurRegle({ regle, cases, onEnregistree, onSupprimee }: {
  regle: RegleRangement
  cases: CaseDisponible[]
  onEnregistree: (r: RegleRangement) => void
  onSupprimee: () => void
}) {
  const [type, setType] = useState(regle.type)
  const [creneau, setCreneau] = useState(regle.creneau)
  const [jour, setJour] = useState<JourSemaine | null>(regle.jour)
  const [confirmer, setConfirmer] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const joursDeLaCase = cases.find(k => k.nom === creneau)?.jours ?? JOURS_SEMAINE

  async function enregistrer() {
    setEnCours(true)
    const res = await enregistrerRegle({ id: regle.id, type, creneau, jour })
    setEnCours(false)
    if (!res.ok) setErreur(res.message)
    else onEnregistree(res.valeur)
  }

  async function supprimer() {
    setEnCours(true)
    const res = await supprimerRegle(regle.id)
    setEnCours(false)
    if (!res.ok) setErreur(res.message)
    else onSupprimee()
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2">
      <label className="text-xs text-gray-600">Ce que je range
        <input aria-label={`Type ${regle.type}`} className="mt-1 block rounded border p-1 text-sm"
          value={type} onChange={e => setType(e.target.value)} />
      </label>
      <label className="text-xs text-gray-600">Va dans la case
        <select aria-label={`Case pour ${regle.type}`} className="mt-1 block rounded border p-1 text-sm"
          value={creneau} onChange={e => { setCreneau(e.target.value); setJour(null) }}>
          {!cases.some(k => k.nom === creneau) && <option value={creneau}>{creneau} (introuvable)</option>}
          {cases.map(k => <option key={k.nom} value={k.nom}>{k.nom}</option>)}
        </select>
      </label>
      <label className="text-xs text-gray-600">Jour
        <select aria-label={`Jour pour ${regle.type}`} className="mt-1 block rounded border p-1 text-sm"
          value={jour ?? ''} onChange={e => setJour((e.target.value || null) as JourSemaine | null)}>
          <option value="">Pas de jour préféré</option>
          {joursDeLaCase.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </label>
      <button type="button" className="rounded bg-violet-600 px-3 py-1 text-sm text-white" disabled={enCours} onClick={enregistrer}>
        Enregistrer
      </button>
      {confirmer ? (
        <button type="button" className="rounded bg-red-600 px-3 py-1 text-sm text-white" disabled={enCours} onClick={supprimer}>
          Oui, supprimer
        </button>
      ) : (
        <button type="button" className="rounded border border-red-300 px-3 py-1 text-sm text-red-700" onClick={() => setConfirmer(true)}>
          Supprimer
        </button>
      )}
      {erreur && <p className="w-full text-sm text-red-700">{erreur}</p>}
    </div>
  )
}
```

`estRegleSansCase(g, cases)` reçoit un groupe : il a bien `creneau` et `jour`, c'est le type attendu (`Pick<RegleRangement, 'creneau' | 'jour'>`).

- [ ] **Step 4: Vérifier**

Run: `npx jest src/components/parametres`
Expected: PASS, dont les tests existants du dossier inchangés.

- [ ] **Step 5: Commit**

```bash
git add src/components/parametres/MonRangementEditor.tsx src/components/parametres/__tests__/MonRangementEditor.test.tsx
git commit -m "Carnet de rangement : section Mon rangement"
```

**Fini quand :** les six nouveaux tests et ceux du dossier passent.

---

### Task 12: Brancher « Mon rangement » dans Paramètres

**Files:**
- Modify: `src/app/(app)/parametres/page.tsx`

Pas de test unitaire de page dans ce dépôt : la vérification est `tsc` plus l'essai à l'écran de la tâche 13.

- [ ] **Step 1: Ajouter la section au sommaire**

Dans `SECTIONS`, après `{ id: 'edt', titre: 'Emploi du temps' },` :

```ts
  { id: 'rangement', titre: 'Mon rangement' },
```

- [ ] **Step 2: Lire le carnet en parallèle, sans aller-retour de plus**

Imports à ajouter :

```ts
import MonRangementEditor from '@/components/parametres/MonRangementEditor'
import { casesDisponibles, lireReglesCompletes } from '@/lib/regles-rangement'
```

Remplacer :

```ts
  const { data, error } = await supabase.rpc('page_parametres')
```

par :

```ts
  // Le carnet de rangement (migration 031) est lu EN MÊME TEMPS que le reste :
  // pas de second aller-retour. La policy ne rend que les règles des classes
  // de l'enseignante ; on garde ensuite celles de cette classe. Illisible
  // (migration pas encore passée), la section le dit et rien d'autre ne casse.
  const [{ data, error }, { data: reglesLues, error: reglesErreur }] = await Promise.all([
    supabase.rpc('page_parametres'),
    supabase.from('regles_rangement').select('id, class_id, type, type_cle, creneau, jour, origine'),
  ])
```

Après `const sources = ...` :

```ts
  const regles = reglesErreur ? [] : lireReglesCompletes(reglesLues).filter(r => r.class_id === classe.id)
  const casesRangement = casesDisponibles((edt ?? []).map(c => ({
    jour: c.jour, matiere: c.matiere,
    type: (c.type ?? 'cours') as 'cours' | 'routine',
    visible_journal: (c.visible_journal ?? true) as boolean,
  })))
```

- [ ] **Step 3: Afficher la section après l'emploi du temps**

Juste après la `SectionRepliable id="edt"` (avant `id="rentree"`) :

```tsx
      <SectionRepliable id="rangement" titre="🗂️ Mon rangement">
        <MonRangementEditor initial={regles} cases={casesRangement} indisponible={Boolean(reglesErreur)} />
      </SectionRepliable>
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune sortie.
Run: `npx jest src/components/parametres`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/parametres/page.tsx"
git commit -m "Carnet de rangement : section Mon rangement dans Parametres"
```

**Fini quand :** `tsc` est muet et la section est dans le sommaire.

---

### Task 13: Vérification finale, carte et point de reprise

**Files:**
- Modify: `AVANCEMENT-IMPORT-SEANCES.md` (nouveau point de reprise en tête)
- Modify: `C:\Users\youck\Documents\Claude\Projects\MON AIOS\wiki\entities\profenpoche-circuit-cahier-journal.md` (règle `carte-de-fonctionnement` : mise à jour dans la même session que la modification)

- [ ] **Step 1: Toute la suite, et les types**

Run: `npx jest`
Expected: tous verts. Compter : 1071 anciens + les nouveaux. Aucun fichier de test existant modifié, sauf l'AJOUT d'une ligne au `test.each` de `anthropic.test.ts` (tâche 8). Vérifier avec :

```bash
git diff --stat 6c04eee -- src | grep -i test
```

Expected : seuls des fichiers créés par ce plan, plus `anthropic.test.ts` (2 lignes ajoutées).

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 2: Aucun tiret long ajouté**

```bash
git diff 6c04eee -- . | grep -n $'^+.*\u2014' || echo "aucun tiret long ajoute"
```

Expected : `aucun tiret long ajoute`.

- [ ] **Step 3: Relecture par un sous-agent**

Lancer un sous-agent `code-reviewer` (lecture seule ; l'annoncer à Christophe : quel agent, quel modèle, pour quoi) sur le diff de la branche depuis `6c04eee`, avec la conception en référence. Lui demander en priorité : la garantie « carnet vide = identique » (tâches 3 et 4), l'absence d'écriture sans geste de l'enseignante, la tolérance à la table absente (tâches 5 et 12). Corriger les points graves, chacun avec son test.

- [ ] **Step 4: Ce qui attend Christophe (ne PAS le faire sans son accord)**

1. Appliquer la migration 031 sur la base Supabase (connecteur Supabase ou éditeur SQL). Sans elle, l'appli marche comme avant et « Mon rangement » affiche « pas encore activé ».
2. Essai réel sur la classe « Bac a sable » (jamais celle de Cécile) : ajouter « le chant c'est en musique le jeudi », vérifier la règle, régénérer une semaine qui a du chant, relever le coût de l'appel dans la jauge IA.
3. Mise en ligne de la branche (avec le reste de `seances-taches-5-12`).

- [ ] **Step 5: Mettre à jour la carte de fonctionnement**

Dans `profenpoche-circuit-cahier-journal.md` : date de dernière vérification, une étape « Carnet de rangement » en tête du schéma mermaid (« Une règle existe pour son type ? » oui : case de la règle, sinon à placer ; non : rangement actuel), une ligne au tableau des étapes (`src/lib/regles-rangement.ts`, `genererCahierJournal` paramètre `regles`, `placerNotionsDuJour` paramètre `casesDeRegle`), la table `regles_rangement` dans « Ce qui compte en base », et au piège : changer une règle ne change pas les cahiers déjà ouverts. Pas de code recopié, pas de numéros de ligne.

- [ ] **Step 6: Point de reprise et commit**

Écrire en tête de `AVANCEMENT-IMPORT-SEANCES.md` un point de reprise daté : étape 1 codée, nombre de tests, migration NON appliquée, ce qui attend Christophe (step 4), suite = plan de l'étape 2.

```bash
git add AVANCEMENT-IMPORT-SEANCES.md
git commit -m "Carnet de rangement : etape 1 codee, point de reprise"
```

La carte vit dans le dépôt MON AIOS : elle part avec sa synchronisation automatique, pas dans ce commit.

**Fini quand :** suite verte, `tsc` muet, relecture traitée, carte et point de reprise à jour, rien de poussé, rien en ligne, migration non appliquée.

---

## Couverture de la conception (relecture du 18/10)

| Exigence de la conception | Tâche |
|---|---|
| Table 031, colonnes, unicité (`class_id`, `type_cle`), accès propriétaire | 1 |
| Type d'une séance (domaine, sinon avant les deux points), d'une notion (chacun de ses domaines) | 2 |
| Une règle ne vise qu'une case de cours visible ; routines cachées non proposées | 2 (`estCaseDeRegle`), 6 (`casesDisponibles`) |
| Séance datée : première case libre du jour, jour du document prioritaire, sinon à placer | 4 |
| Séance sans jour : jour préféré, sinon premier jour qui a la case, une fois | 4 |
| Notion : la case chaque jour, ou seulement le jour préféré | 3, 4 |
| Case absente : à placer, et règle signalée dans « Mon rangement » | 4, 6, 11 |
| Pas de règle : rangement d'aujourd'hui, option B comprise | 4 (les lignes anciennes ne relèvent pas du carnet) |
| Carnet vide = cahier identique, les 1071 tests verts sans changement | 3, 4, 13 |
| Règles lues par `actions/journal.ts` | 5 |
| Paramètres : voir, modifier, supprimer, ajouter avec ses mots ; regroupement ; orange + Corriger ; phrase « Ce qui n'est pas ici... » | 11, 12 |
| `ia-regle` Haiku, `garderAppelIA` puis `enregistrerUsageIA`, version et prix revérifiés | 8, 9 |
| « Case introuvable » avec la plus proche ; IA indisponible ; incompris deux fois ; rien sans geste | 8, 9, 10 |
| Tests : client IA simulé (format, case introuvable, jauge), accès de la table, vrai emploi du temps de Cécile | 1, 4, 9 ; essai réel : 13 step 4 |

Écart assumé, à connaître : la policy est vérifiée par lecture du SQL (tâche 1), pas par un essai entre deux comptes ; l'essai réel de la tâche 13 le complète une fois la migration appliquée.
