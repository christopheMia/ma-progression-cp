# Méthodes par matière — Fondation (Plan 1/2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le lien méthode↔créneau « par mots-clés » par un lien explicite via une table `methodes`, sans rien casser, pour que n'importe quelle matière puisse alimenter le cahier journal.

**Architecture:** Nouvelle table `methodes` (1 ligne par matière d'une classe). `emploi_du_temps.methode_id` relie un créneau à une méthode ; `progression.methode_id` relie le contenu hebdo à la méthode. Le cahier journal pré-remplit un créneau en faisant correspondre `creneau.methode_id` à la ligne `progression` de la semaine. Un helper `ensureMethode()` garantit qu'une méthode existe à chaque écriture de progression.

**Tech Stack:** Next.js 16, Supabase (Postgres + RLS), TypeScript, Jest (ts-jest).

**Périmètre de CE plan (Plan 1) :** schéma + lien journal + tous les chemins d'écriture de `progression`. **Hors de ce plan (→ Plan 2) :** suppression de la liste en dur `MATIERES_METHODE`, UI de création de méthode libre, sélection des créneaux dans les éditeurs d'EDT, opt-in suivi, `MethodesEditor`/`IaImport`/`StudentTracking` dynamiques, affichage multi-matières de la fiche semaine.

**Spec :** `docs/superpowers/specs/2026-06-25-methodes-par-matiere-design.md`

---

### Task 0 : Sécuriser (sauvegarde + env de test + branche)

**But :** ne jamais toucher la prod de Cécile directement. Le tier gratuit Supabase n'a pas de branching → on utilise un **second projet Supabase gratuit** comme test (ou Supabase local), et on sauvegarde la prod.

- [ ] **Step 1 : Sauvegarde de la prod**

Exporter la base de prod avant toute migration (dump SQL daté dans un dossier ignoré par git) :

```bash
mkdir -p backups
# Récupérer la connection string "Session pooler" dans Supabase → Project Settings → Database
pg_dump "postgresql://postgres.<ref>:<password>@<host>:5432/postgres" \
  --no-owner --no-privileges -f "backups/prod-$(date +%Y%m%d-%H%M).sql"
```

Vérifier que le fichier `backups/prod-*.sql` n'est pas vide (> 10 Ko).

- [ ] **Step 2 : Ajouter `backups/` au `.gitignore`**

Ajouter la ligne `backups/` à la fin de `.gitignore` (créer le fichier s'il n'existe pas).

- [ ] **Step 3 : Créer un projet Supabase de TEST**

Créer un **nouveau projet Supabase gratuit** (« ma-progression-cp-test »). Y appliquer le schéma de référence `supabase/migrations/006_schema_complet_idempotent.sql` (via le SQL Editor) pour obtenir une base valide vide. Noter son URL + anon key.

- [ ] **Step 4 : Brancher l'appli locale sur le projet de test**

Dans `.env.local`, pointer `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` vers le **projet de test** (garder les valeurs de prod de côté). Tout le développement de ce plan se fait sur le projet de test.

- [ ] **Step 5 : Créer la branche de travail**

```bash
git checkout -b feat/methodes-par-matiere
```

---

### Task 1 : Migration `008_methodes.sql` (table + colonnes + backfill)

**Files:**
- Create: `supabase/migrations/008_methodes.sql`
- Modify: `supabase/migrations/006_schema_complet_idempotent.sql` (source de vérité)

- [ ] **Step 1 : Écrire la migration 008**

Créer `supabase/migrations/008_methodes.sql` :

```sql
-- 008_methodes.sql — généralisation des méthodes à n'importe quelle matière.
-- Idempotent. Crée la table `methodes`, relie EDT + progression, et reprend
-- les données existantes (1 méthode par (class_id, matiere), créneaux reliés
-- par l'ancienne logique mots-clés). Voir spec 2026-06-25-methodes-par-matiere.

-- ── table methodes ────────────────────────────────────────────────────────
create table if not exists methodes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  matiere text not null,
  manuel text,
  niveau text,
  suivi_actif boolean not null default true,
  created_at timestamptz default now()
);
alter table methodes enable row level security;
do $$ begin
  create policy "Users manage own methodes" on methodes
    using (class_id in (select id from classes where user_id = auth.uid()))
    with check (class_id in (select id from classes where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table methodes add constraint methodes_class_matiere_key unique (class_id, matiere);
exception when duplicate_object then null; end $$;

-- ── lien créneau ↔ méthode + visibilité journal ───────────────────────────
alter table emploi_du_temps add column if not exists methode_id uuid references methodes on delete set null;
alter table emploi_du_temps add column if not exists visible_journal boolean not null default true;

-- ── progression rattachée à une méthode ───────────────────────────────────
alter table progression add column if not exists methode_id uuid references methodes on delete cascade;

-- ── backfill 1 : une méthode par (class_id, matiere), reliée à progression ─
do $$
declare r record; mid uuid;
begin
  for r in select distinct class_id, matiere from progression where methode_id is null loop
    select id into mid from methodes where class_id = r.class_id and matiere = r.matiere limit 1;
    if mid is null then
      insert into methodes (class_id, matiere, suivi_actif)
        values (r.class_id, r.matiere, true) returning id into mid;
    end if;
    update progression set methode_id = mid
      where class_id = r.class_id and matiere = r.matiere and methode_id is null;
  end loop;
end $$;

-- ── backfill 2 : relier les créneaux EDT via l'ancienne logique mots-clés ──
do $$
declare r record; mid uuid;
begin
  for r in select id, class_id, matiere from emploi_du_temps where methode_id is null loop
    mid := null;
    if lower(r.matiere) like '%graphème%' or lower(r.matiere) like '%graphe%' then
      select id into mid from methodes where class_id = r.class_id and matiere = 'francais' limit 1;
    elsif lower(r.matiere) like '%math%' or lower(r.matiere) like '%calcul%' then
      select id into mid from methodes where class_id = r.class_id and matiere = 'maths' limit 1;
    end if;
    if mid is not null then
      update emploi_du_temps set methode_id = mid where id = r.id;
    end if;
  end loop;
end $$;
```

- [ ] **Step 2 : Reporter le schéma dans 006 (source de vérité)**

À la fin de `supabase/migrations/006_schema_complet_idempotent.sql`, ajouter le **bloc table `methodes`** (copie identique à la Step 1, sans les backfills) + les deux `alter table … add column if not exists` (`emploi_du_temps.methode_id`, `emploi_du_temps.visible_journal`, `progression.methode_id`). Objectif : un déploiement « from scratch » via 006 recrée aussi `methodes`.

- [ ] **Step 3 : Appliquer la migration sur le projet de TEST**

Dans le SQL Editor du projet de **test** (PAS la prod), coller et exécuter le contenu de `008_methodes.sql`. Aucune erreur attendue.

- [ ] **Step 4 : Vérifier le schéma**

Dans le SQL Editor de test, exécuter :

```sql
select column_name from information_schema.columns
where table_name = 'emploi_du_temps' and column_name in ('methode_id','visible_journal');
select count(*) from methodes;
```

Attendu : 2 colonnes listées ; `methodes` existe (count ≥ 0).

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/008_methodes.sql supabase/migrations/006_schema_complet_idempotent.sql
git commit -m "feat(db): table methodes + lien methode_id (migration 008)"
```

---

### Task 2 : Types TypeScript

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1 : Ajouter le type `Methode` et les nouveaux champs**

Dans `src/types/index.ts` :

1. Ajouter le type `Methode` (après le type `Progression`) :

```ts
export type Methode = {
  id: string
  class_id: string
  matiere: string
  manuel: string | null
  niveau: string | null
  suivi_actif: boolean
}
```

2. Dans `CreneauHoraire`, ajouter après `type: 'cours' | 'routine'` :

```ts
  methode_id: string | null
  visible_journal: boolean
```

3. Remplacer le type `ProgressionMatiere` par :

```ts
/** Ligne de progression d'une matière pour une semaine (issue de la table progression). */
export type ProgressionMatiere = {
  methode_id: string | null
  matiere: string
  items: string[]
  pages: string | null
  mots_exemple: string[] | null
}
```

- [ ] **Step 2 : Vérifier la compilation des types**

Run: `npx tsc --noEmit`
Attendu : des erreurs UNIQUEMENT dans les fichiers qui construisent un `CreneauHoraire`/`ProgressionMatiere` littéral sans les nouveaux champs (corrigés aux tâches suivantes : test cahier-journal, journal.ts). Noter la liste ; ne pas commiter encore.

---

### Task 3 : Lien par `methode_id` dans le cahier journal (TDD)

**Files:**
- Modify: `src/lib/cahier-journal.ts`
- Test: `src/lib/__tests__/cahier-journal.test.ts`

- [ ] **Step 1 : Réécrire le test (échouera)**

Remplacer **tout** le contenu de `src/lib/__tests__/cahier-journal.test.ts` par :

```ts
import { genererCahierJournal } from '../cahier-journal'
import type { CreneauHoraire } from '@/types'

const creneau = (over: Partial<CreneauHoraire>): CreneauHoraire => ({
  id: 'x', class_id: 'c', jour: 'lundi', heure_debut: '08:45', heure_fin: '09:15',
  matiere: 'Lecture', ordre: 0, couleur: null, type: 'cours',
  methode_id: null, visible_journal: true, ...over,
})

describe('genererCahierJournal (lien par méthode)', () => {
  const progression = [
    { methode_id: 'm-fr', matiere: 'francais', items: ['a'], pages: 'p.10-13', mots_exemple: ['ami', 'papa'] },
    { methode_id: 'm-ma', matiere: 'maths', items: ['Nombres jusqu’à 10'], pages: 'p.8', mots_exemple: [] },
  ]

  test('une fiche par jour, dans l’ordre', () => {
    const edt = [creneau({ jour: 'lundi' }), creneau({ jour: 'jeudi' })]
    expect(genererCahierJournal(edt, progression).map(j => j.jour)).toEqual(['lundi', 'jeudi'])
  })

  test('les lignes routine ne sont pas remplissables', () => {
    const edt = [creneau({ matiere: 'Récréation', type: 'routine' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.type).toBe('routine')
    expect(s.deroulement).toBe('')
  })

  test('un créneau relié à la méthode française est pré-rempli', () => {
    const edt = [creneau({ matiere: 'Lecture', methode_id: 'm-fr' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('a')
    expect(s.deroulement).toContain('p.10-13')
  })

  test('un créneau relié à la méthode maths est pré-rempli', () => {
    const edt = [creneau({ matiere: 'Maths', methode_id: 'm-ma' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('Nombres jusqu’à 10')
  })

  test('un créneau sans méthode a un déroulement vide', () => {
    const edt = [creneau({ matiere: 'Arts visuels', methode_id: null })]
    expect(genererCahierJournal(edt, progression)[0].seances[0].deroulement).toBe('')
  })

  test('un créneau masqué (visible_journal=false) n’apparaît pas', () => {
    const edt = [
      creneau({ matiere: 'Lecture', methode_id: 'm-fr' }),
      creneau({ matiere: 'Anglais', visible_journal: false, ordre: 1 }),
    ]
    const seances = genererCahierJournal(edt, progression)[0].seances
    expect(seances).toHaveLength(1)
    expect(seances[0].matiere).toBe('Lecture')
  })
})
```

- [ ] **Step 2 : Lancer le test → échec**

Run: `npm test -- cahier-journal`
Attendu : ÉCHEC (l'implémentation relie encore par mots-clés, et ne filtre pas `visible_journal`).

- [ ] **Step 3 : Réécrire l'implémentation**

Remplacer **tout** le contenu de `src/lib/cahier-journal.ts` par :

```ts
import { CreneauHoraire, JourJournal, SeanceJournal, ProgressionMatiere } from '@/types'

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const

function deroulementInitial(creneau: CreneauHoraire, progression: ProgressionMatiere[]): string {
  if (creneau.type === 'routine') return ''
  if (!creneau.methode_id) return ''
  const p = progression.find(x => x.methode_id === creneau.methode_id)
  if (!p || p.items.length === 0) return ''
  const items = p.items.join(', ')
  const pages = p.pages ? ` — ${p.pages}` : ''
  const mots = p.mots_exemple && p.mots_exemple.length ? ` (mots : ${p.mots_exemple.join(', ')})` : ''
  return `${items}${pages}${mots}`
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

  return JOURS_ORDRE
    .filter(jour => parJour.has(jour))
    .map(jour => ({
      jour,
      seances: (parJour.get(jour) ?? [])
        .sort((a, b) => a.ordre - b.ordre)
        .map((c): SeanceJournal => ({
          matiere: c.matiere,
          heure_debut: c.heure_debut,
          heure_fin: c.heure_fin,
          type: c.type,
          deroulement: deroulementInitial(c, progression),
        })),
    }))
}
```

- [ ] **Step 4 : Lancer le test → succès**

Run: `npm test -- cahier-journal`
Attendu : PASS (6 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/cahier-journal.ts src/lib/__tests__/cahier-journal.test.ts src/types/index.ts
git commit -m "feat(journal): relier créneau↔méthode par methode_id + créneaux masquables"
```

---

### Task 4 : Charger `methode_id` dans la génération du journal

**Files:**
- Modify: `src/lib/actions/journal.ts:17-19`

- [ ] **Step 1 : Ajouter `methode_id` au select de progression**

Dans `src/lib/actions/journal.ts`, remplacer la requête progression :

```ts
  const { data: progression } = await supabase
    .from('progression').select('matiere, items, pages, mots_exemple')
    .eq('class_id', semaine.class_id).eq('numero', semaine.numero)
```

par :

```ts
  const { data: progression } = await supabase
    .from('progression').select('methode_id, matiere, items, pages, mots_exemple')
    .eq('class_id', semaine.class_id).eq('numero', semaine.numero)
```

(L'EDT est déjà chargé via `select('*')`, donc `methode_id` et `visible_journal` sont inclus automatiquement.)

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Attendu : plus d'erreur liée à `ProgressionMatiere` dans `journal.ts`.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/actions/journal.ts
git commit -m "feat(journal): charger methode_id pour le pré-remplissage"
```

---

### Task 5 : Helper `ensureMethode()`

**Files:**
- Create: `src/lib/methodes-db.ts`

- [ ] **Step 1 : Écrire le helper**

Créer `src/lib/methodes-db.ts` :

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Récupère l'id de la méthode (class_id, matiere) en la créant si elle n'existe pas.
 * Utilisé par tous les chemins qui écrivent dans `progression` pour garantir le lien.
 */
export async function ensureMethode(
  supabase: SupabaseClient,
  classId: string,
  matiere: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from('methodes').select('id')
    .eq('class_id', classId).eq('matiere', matiere)
    .limit(1).maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('methodes').insert({ class_id: classId, matiere })
    .select('id').single()
  if (error || !created) throw new Error(error?.message ?? 'Création de méthode impossible')
  return created.id
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Attendu : aucune nouvelle erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/methodes-db.ts
git commit -m "feat(methodes): helper ensureMethode (get-or-create)"
```

---

### Task 6 : Brancher `methode_id` sur tous les chemins d'écriture de `progression`

**But :** chaque insertion de `progression` doit poser `methode_id` (sinon le journal ne relie plus le contenu créé après la migration). On utilise `ensureMethode()`.

**Files:**
- Modify: `src/lib/actions/progression-matiere.ts`
- Modify: `src/lib/actions/setup.ts:40-45`
- Modify: `src/lib/actions/demo.ts:71-76`
- Modify: `src/lib/actions/parametres.ts:129-135`
- Modify: `src/lib/actions/progression-ia.ts:35-44`

- [ ] **Step 1 : `progression-matiere.ts`**

Ajouter l'import en haut : `import { ensureMethode } from '@/lib/methodes-db'`.
Remplacer le bloc « Remplace UNIQUEMENT cette matière » + construction des lignes par :

```ts
  const methodeId = await ensureMethode(supabase, classe.id, matiere)

  // Remplace UNIQUEMENT cette matière (jamais l'autre)
  await supabase.from('progression').delete()
    .eq('class_id', classe.id).eq('matiere', matiere)

  const lignes = semaines.map(s => ({
    class_id: classe.id,
    methode_id: methodeId,
    matiere,
    numero: s.numero,
    items: s.items,
    pages: s.pages || null,
    mots_exemple: s.mots_exemple ?? null,
  }))
```

- [ ] **Step 2 : `setup.ts`**

Ajouter l'import : `import { ensureMethode } from '@/lib/methodes-db'`.
Remplacer le bloc `progFr` (lignes ~40-45) par :

```ts
  const progFr = genererProgressionFrancais(formData.manuelId, formData.customProgression)
  if (progFr.length > 0) {
    const methodeId = await ensureMethode(supabase, classe.id, 'francais')
    await supabase.from('progression').insert(
      progFr.map(p => ({ ...p, class_id: classe.id, methode_id: methodeId, matiere: 'francais' as const }))
    )
  }
```

- [ ] **Step 3 : `demo.ts`**

Ajouter l'import : `import { ensureMethode } from '@/lib/methodes-db'`.
Remplacer le bloc `progFr` (lignes ~71-76) par :

```ts
  const progFr = genererProgressionFrancais('lecture-piano')
  if (progFr.length > 0) {
    const methodeId = await ensureMethode(supabase, classe.id, 'francais')
    await supabase.from('progression').insert(
      progFr.map(p => ({ ...p, class_id: classe.id, methode_id: methodeId, matiere: 'francais' as const }))
    )
  }
```

- [ ] **Step 4 : `parametres.ts` (updateManuel)**

Ajouter l'import en haut du fichier : `import { ensureMethode } from '@/lib/methodes-db'`.
Remplacer le bloc `progFr` (lignes ~129-135) par :

```ts
  await supabase.from('progression').delete().eq('class_id', classe.id).eq('matiere', 'francais')
  const progFr = genererProgressionFrancais(manuelId, customProgression)
  if (progFr.length > 0) {
    const methodeId = await ensureMethode(supabase, classe.id, 'francais')
    await supabase.from('progression').insert(
      progFr.map(p => ({ ...p, class_id: classe.id, methode_id: methodeId, matiere: 'francais' as const }))
    )
  }
```

- [ ] **Step 5 : `progression-ia.ts` (corrigerProgression)**

Ajouter l'import : `import { ensureMethode } from '@/lib/methodes-db'`.
Remplacer le bloc `lignesFr` (lignes ~35-44) par :

```ts
  await supabase.from('progression').delete().eq('class_id', classId).eq('matiere', 'francais')
  const methodeId = await ensureMethode(supabase, classId, 'francais')
  const lignesFr = progression.map(s => ({
    class_id: classId,
    methode_id: methodeId,
    matiere: 'francais' as const,
    numero: s.numero,
    items: s.items,
    pages: s.pages || null,
    mots_exemple: s.mots_exemple ?? null,
  }))
  if (lignesFr.length > 0) await supabase.from('progression').insert(lignesFr)
```

- [ ] **Step 6 : Vérifier la compilation + tous les tests**

Run: `npx tsc --noEmit && npm test`
Attendu : compilation OK ; tous les tests existants au vert (46 + cahier-journal réécrit).

- [ ] **Step 7 : Commit**

```bash
git add src/lib/actions/progression-matiere.ts src/lib/actions/setup.ts src/lib/actions/demo.ts src/lib/actions/parametres.ts src/lib/actions/progression-ia.ts
git commit -m "feat(methodes): poser methode_id sur tous les chemins d'écriture de progression"
```

---

### Task 7 : Vérification de bout en bout (sur le projet de TEST)

- [ ] **Step 1 : Build de production**

Run: `npm run build`
Attendu : `Compiled successfully`, aucune erreur de type.

- [ ] **Step 2 : Smoke test « démo »**

`npm run dev`, se connecter, charger la **classe démo** (bouton dans /setup ou Paramètres). Ouvrir une **fiche semaine** d'une semaine en cours → le **cahier journal** doit afficher le créneau « Lecture » **pré-rempli** (son + pages de la semaine), et les créneaux EPS/Arts présents mais vides. Vérifier dans le SQL Editor de test : `select count(*) from methodes;` ≥ 1, et `select count(*) from progression where methode_id is null;` = 0.

- [ ] **Step 3 : Smoke test « changement de manuel »**

Paramètres → changer de manuel (ou réimporter le français via l'IA). Rouvrir une fiche semaine → le journal lecture est toujours pré-rempli (donc `methode_id` bien reposé par `ensureMethode`).

- [ ] **Step 4 : Commit éventuel + fin**

Si tout est vert, le socle est posé. Ne PAS encore appliquer la migration en prod : on le fera juste avant la beta, après le Plan 2, avec un nouveau `pg_dump`.

```bash
git push -u origin feat/methodes-par-matiere
```

---

## Ce que ce plan NE fait PAS (→ Plan 2, à détailler ensuite)

- Supprimer `MATIERES_METHODE`/`LABELS_MATIERE` codés en dur dans `src/lib/matieres.ts` (et ses consommateurs `IaImport`, `MethodesEditor`).
- UI : créer une méthode pour **n'importe quelle** matière (champ libre), choisir les **créneaux** qu'elle alimente (dropdown dans `TimetableEditor`/`EmploiDuTempsEditor`), interrupteur « afficher dans le journal », opt-in « suivre les acquis ».
- `StudentTracking` : boucler sur les méthodes `suivi_actif`.
- Fiche semaine (`semaine/[id]/page.tsx`) : afficher toutes les méthodes (pas seulement francais/maths en dur).

Ces éléments dépendent du socle posé ici et seront un plan dédié, écrit après l'exécution du Plan 1.

## Auto-revue (faite)
- **Couverture spec :** modèle de données (Task 1-2), lien souple par méthode (Task 3, `methode_id`), `visible_journal` (Task 3), migration idempotente + backfill Cécile (Task 1), chemins d'écriture (Task 6), périmètre CP→CM2 (pas de blocage niveau). Suivi opt-in + UI = explicitement Plan 2.
- **Placeholders :** aucun — code complet à chaque step.
- **Cohérence des types :** `methode_id` ajouté à `CreneauHoraire`, `ProgressionMatiere` (Task 2) et consommé identiquement dans `cahier-journal.ts` (Task 3) et `journal.ts` (Task 4). `ensureMethode(supabase, classId, matiere): Promise<string>` appelée avec la même signature partout (Task 5-6).
