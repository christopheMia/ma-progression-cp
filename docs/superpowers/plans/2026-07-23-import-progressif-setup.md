# Import progressif des méthodes dans le setup - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de créer une classe sans méthode, ou d'ajouter progressivement plusieurs documents et matières que l'application regroupe sans perte.

**Architecture:** Les PDF sont transformés en sources pédagogiques structurées, conservées dans `methode_sources`. Une fonction pure matérialise ensuite ces sources sur les vraies semaines scolaires avec une priorité stable `période > programmation > sommaire`. Le setup conserve les sources en brouillon jusqu'à la création atomique de la classe, puis le même moteur est réutilisé dans Paramètres.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript 5, Supabase/PostgreSQL avec RLS, Anthropic structured outputs, Jest 30, Testing Library.

---

## Préconditions d'exécution

- Lire entièrement `MARCHE-A-SUIVRE-CODEX-CLAUDE.md`.
- Lire les guides locaux Next.js 16 sur les Route Handlers, `use server`, les formulaires, `redirect` et `revalidatePath`.
- Ne jamais envoyer les prénoms des élèves à l'IA.
- Ne jamais utiliser de tiret cadratin dans le code, les commentaires, les tests, la documentation ou les commits.
- Ne pas toucher au dossier local non suivi `partage/`.
- Chaque étape de commit ci-dessous est un point de contrôle proposé. Ne l'exécuter que si l'utilisateur a autorisé les commits.

## Carte des fichiers

### Nouveaux fichiers

- `src/lib/progression-sources.ts`
  - Types des sources, regroupement, empreinte, priorité, matérialisation et fusion.
- `src/lib/__tests__/progression-sources.test.ts`
  - Règles métier pures, sans Supabase ni IA.
- `src/components/methodes/SourceImporter.tsx`
  - Dépôt PDF ou texte, détection IA, correction des métadonnées et validation.
- `src/components/methodes/SourceContentPreview.tsx`
  - Aperçu éditable des semaines ou des périodes avant ajout.
- `src/components/setup/ProgressionsSetup.tsx`
  - Liste des cartes de méthodes et passage facultatif à l'étape suivante.
- `src/components/setup/__tests__/ProgressionsSetup.test.tsx`
  - Parcours avec zéro, une et plusieurs sources.
- `src/lib/actions/methode-sources.ts`
  - Ajout et retrait atomiques d'une source après création de la classe.
- `supabase/migrations/016_methode_sources.sql`
  - Table de provenance et fonctions PostgreSQL atomiques.

### Fichiers modifiés

- `src/lib/ia/schema-import-auto.ts`
  - Détection de la matière, du nom de méthode et de la période.
- `src/lib/ia/prompts.ts`
  - Consignes de détection sans matière imposée.
- `src/app/api/ia-manuel/route.ts`
  - Réponse structurée complète pour une source.
- `src/lib/__tests__/import-auto.test.ts`
  - Contrat de sortie IA.
- `src/lib/progression.ts`
  - Génération du squelette de 36 semaines sans méthode obligatoire.
- `src/lib/__tests__/progression.test.ts`
  - Classe vide et compatibilité démo.
- `src/lib/actions/setup.ts`
  - Création avec zéro ou plusieurs méthodes et sources.
- `src/app/(app)/setup/page.tsx`
  - Nouveau brouillon et nouvelle première étape.
- `src/components/parametres/MethodesEditor.tsx`
  - Liste des sources et import progressif.
- `src/app/(app)/parametres/page.tsx`
  - Chargement de `methode_sources` et retrait du flux historique à méthode unique.
- `src/app/(app)/planning/page.tsx`
  - Libellé basé sur les vraies méthodes, y compris aucune méthode.
- `src/types/index.ts`
  - Type `MethodeSource`.
- `supabase/migrations/006_schema_complet_idempotent.sql`
  - Ajout idempotent de `methode_sources`.
- `src/lib/__tests__/safe-replacement.test.ts`
  - Présence des transactions SQL et des politiques RLS.
- `MARCHE-A-SUIVRE-CODEX-CLAUDE.md`
  - Journal de passation final.

### Fichiers supprimés à la fin

- `src/components/setup/ManualSelector.tsx`
  - Remplacé par `ProgressionsSetup`.
- `src/components/setup/IaImport.tsx`
  - Remplacé par les composants ciblés de `components/methodes`.

## Task 1: Définir les sources et leurs règles de regroupement

**Files:**
- Create: `src/lib/progression-sources.ts`
- Create: `src/lib/__tests__/progression-sources.test.ts`

- [ ] **Step 1: Écrire les tests de types, priorité, regroupement et doublon**

Créer `src/lib/__tests__/progression-sources.test.ts` :

```ts
import {
  analyserAjoutSource,
  cleMethode,
  niveauPrecision,
  regrouperSources,
  type SourceProgression,
} from '../progression-sources'

function source(partial: Partial<SourceProgression> = {}): SourceProgression {
  return {
    clientId: partial.clientId ?? crypto.randomUUID(),
    nomSource: partial.nomSource ?? 'document.pdf',
    matiere: partial.matiere ?? 'Français',
    nomMethode: partial.nomMethode ?? "Les P'tites Poules",
    typeDocument: partial.typeDocument ?? 'manuel',
    periodeNumero: partial.periodeNumero ?? null,
    semaines: partial.semaines ?? [{ numero: 1, items: ['a'], pages: '', mots_exemple: [] }],
    periodes: partial.periodes ?? [],
    empreinteContenu: partial.empreinteContenu ?? crypto.randomUUID(),
  }
}

describe('sources de progression', () => {
  test('normalise les accents et la casse pour grouper une même méthode', () => {
    expect(cleMethode(source({ matiere: 'Français', nomMethode: "P'tites Poules" })))
      .toBe(cleMethode(source({ matiere: 'francais', nomMethode: "  P'TITES   POULES " })))
  })

  test('classe période au-dessus de programmation et manuel', () => {
    expect(niveauPrecision('periode')).toBeGreaterThan(niveauPrecision('programmation'))
    expect(niveauPrecision('programmation')).toBeGreaterThan(niveauPrecision('manuel'))
  })

  test('regroupe plusieurs documents dans une seule méthode', () => {
    const groupes = regrouperSources([
      source({ clientId: 's1', empreinteContenu: 'e1' }),
      source({ clientId: 's2', empreinteContenu: 'e2', typeDocument: 'periode', periodeNumero: 1 }),
    ])
    expect(groupes).toHaveLength(1)
    expect(groupes[0].sources.map(s => s.clientId)).toEqual(['s1', 's2'])
  })

  test('sépare deux matières', () => {
    expect(regrouperSources([
      source({ matiere: 'Français', empreinteContenu: 'e1' }),
      source({ matiere: 'Maths', empreinteContenu: 'e2' }),
    ])).toHaveLength(2)
  })

  test('bloque un doublon exact', () => {
    const existante = source({ empreinteContenu: 'meme-hash' })
    const analyse = analyserAjoutSource([existante], source({ empreinteContenu: 'meme-hash' }))
    expect(analyse.doublon).toBe(true)
    expect(analyse.autorisable).toBe(false)
  })

  test('annonce quun planning détaillé remplacera la période couverte', () => {
    const analyse = analyserAjoutSource(
      [source({ typeDocument: 'programmation', empreinteContenu: 'annuel' })],
      source({ typeDocument: 'periode', periodeNumero: 2, empreinteContenu: 'p2' }),
    )
    expect(analyse.doublon).toBe(false)
    expect(analyse.periodesRemplacees).toEqual([2])
    expect(analyse.message).toContain('Période 2')
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier l'échec**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/progression-sources.test.ts
```

Expected: FAIL avec `Cannot find module '../progression-sources'`.

- [ ] **Step 3: Créer les types et les fonctions minimales**

Créer `src/lib/progression-sources.ts` avec cette interface publique :

```ts
import type { ProgressionSemaine } from '@/data/manuels'
import type { PeriodeProgrammation } from '@/lib/repartition-periode'
import type { TypeDocumentImport } from '@/lib/ia/schema-import-auto'

export type SourceProgression = {
  clientId: string
  nomSource: string
  matiere: string
  nomMethode: string
  typeDocument: TypeDocumentImport
  periodeNumero: number | null
  semaines: ProgressionSemaine[]
  periodes: PeriodeProgrammation[]
  empreinteContenu: string
}

export type MethodeProgressionBrouillon = {
  cle: string
  matiere: string
  nomMethode: string
  suiviActif: boolean
  sources: SourceProgression[]
}

export type AnalyseAjoutSource = {
  doublon: boolean
  autorisable: boolean
  periodesRemplacees: number[]
  message: string
}

function normaliserCle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cleMethode(source: Pick<SourceProgression, 'matiere' | 'nomMethode'>): string {
  return `${normaliserCle(source.matiere)}::${normaliserCle(source.nomMethode)}`
}

export function niveauPrecision(type: TypeDocumentImport): number {
  return type === 'periode' ? 3 : type === 'programmation' ? 2 : 1
}

export function regrouperSources(sources: SourceProgression[]): MethodeProgressionBrouillon[] {
  const groupes = new Map<string, MethodeProgressionBrouillon>()
  for (const source of sources) {
    const cle = cleMethode(source)
    const groupe = groupes.get(cle) ?? {
      cle,
      matiere: source.matiere.trim(),
      nomMethode: source.nomMethode.trim(),
      suiviActif: true,
      sources: [],
    }
    groupe.sources.push(source)
    groupes.set(cle, groupe)
  }
  return [...groupes.values()]
}

export function analyserAjoutSource(
  existantes: SourceProgression[],
  candidate: SourceProgression,
): AnalyseAjoutSource {
  if (existantes.some(s => s.empreinteContenu === candidate.empreinteContenu)) {
    return {
      doublon: true,
      autorisable: false,
      periodesRemplacees: [],
      message: 'Ce document a déjà été ajouté.',
    }
  }

  const periodesRemplacees = candidate.typeDocument === 'periode' && candidate.periodeNumero
    ? [candidate.periodeNumero]
    : []
  return {
    doublon: false,
    autorisable: true,
    periodesRemplacees,
    message: periodesRemplacees.length
      ? `Période ${periodesRemplacees[0]} : le planning détaillé sera prioritaire.`
      : 'Ce document complétera la méthode.',
  }
}

export async function calculerEmpreinteSource(
  source: Omit<SourceProgression, 'clientId' | 'empreinteContenu'>,
): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(source))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 4: Relancer le test**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/progression-sources.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Point de contrôle Git proposé**

```powershell
git add src/lib/progression-sources.ts src/lib/__tests__/progression-sources.test.ts
git commit -m "feat: modeliser les sources de progression"
```

## Task 2: Étendre la détection IA à la matière et à la méthode

**Files:**
- Modify: `src/lib/ia/schema-import-auto.ts`
- Modify: `src/lib/ia/prompts.ts`
- Modify: `src/app/api/ia-manuel/route.ts`
- Modify: `src/lib/__tests__/import-auto.test.ts`

- [ ] **Step 1: Renforcer le test du contrat IA**

Ajouter dans `src/lib/__tests__/import-auto.test.ts` :

```ts
test('détecte les métadonnées nécessaires au regroupement', () => {
  expect(AUTO_IMPORT_JSON_SCHEMA.required).toEqual([
    'matiere',
    'nom_methode',
    'type_document',
    'periode_numero',
    'confiance_detection',
    'avertissements',
    'semaines',
    'periodes',
  ])
  expect(AUTO_IMPORT_JSON_SCHEMA.properties.periode_numero.anyOf).toEqual([
    { type: 'integer', minimum: 1, maximum: 5 },
    { type: 'null' },
  ])
})

test('le prompt demande une détection et non une matière imposée', () => {
  const prompt = systemImportAutomatique()
  expect(prompt).toContain('matiere')
  expect(prompt).toContain('nom_methode')
  expect(prompt).toContain('confiance_detection')
  expect(prompt).toContain('periode_numero')
})
```

Modifier l'ancien appel `systemImportAutomatique('francais')` pour appeler
`systemImportAutomatique()`.

- [ ] **Step 2: Vérifier que le test échoue**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/import-auto.test.ts
```

Expected: FAIL car les nouvelles propriétés ne sont pas encore dans le schéma.

- [ ] **Step 3: Étendre le schéma structuré**

Dans `src/lib/ia/schema-import-auto.ts`, utiliser :

```ts
export const AUTO_IMPORT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    matiere: { type: 'string' },
    nom_methode: { type: 'string' },
    type_document: { type: 'string', enum: TYPES_DOCUMENT_IMPORT },
    periode_numero: {
      anyOf: [
        { type: 'integer', minimum: 1, maximum: 5 },
        { type: 'null' },
      ],
    },
    confiance_detection: { type: 'number', minimum: 0, maximum: 1 },
    avertissements: { type: 'array', items: { type: 'string' } },
    semaines: PROGRESSION_JSON_SCHEMA.properties.semaines,
    periodes: PROGRAMMATION_JSON_SCHEMA.properties.periodes,
  },
  required: [
    'matiere',
    'nom_methode',
    'type_document',
    'periode_numero',
    'confiance_detection',
    'avertissements',
    'semaines',
    'periodes',
  ],
} as const
```

Ajouter :

```ts
export function periodeDocumentImport(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5
    ? Number(value)
    : null
}
```

- [ ] **Step 4: Modifier le prompt**

Remplacer la signature par :

```ts
export function systemImportAutomatique(indiceMatiere?: string): string
```

Le début du prompt doit contenir exactement ces règles fonctionnelles :

```ts
const indice = indiceMatiere?.trim()
  ? `L'interface propose « ${indiceMatiere.trim()} » comme indice, mais corrige-le si le document montre une autre matière.`
  : `Détecte la matière à partir du document.`

return `Tu es un expert des méthodes et programmations scolaires françaises du CP au CM2.
${indice}

Avant l'extraction, renseigne :
- "matiere" avec la discipline lisible par l'enseignant ;
- "nom_methode" avec le titre de la méthode ou du manuel, sans inventer ;
- "confiance_detection" entre 0 et 1 ;
- "avertissements" avec les incertitudes ;
- "periode_numero" entre 1 et 5 seulement pour un planning d'une période, sinon null.

Si le nom de la méthode n'est pas visible, renvoie "" et ajoute un avertissement.
Tu dois ensuite reconnaître le type du document et extraire tout le contenu sans rien inventer.

Choisis exactement un type_document :
- "manuel" : sommaire, guide ou progression donnant des notions, sons ou pages dans l'ordre de l'année ;
- "periode" : planning détaillé d'UNE période, découpé semaine par semaine ;
- "programmation" : programmation ANNUELLE organisée par périodes et domaines.

Règles communes :
${REGLE_EXHAUSTIVITE}
- Recopie les libellés du document, sans les reformuler ni compléter les cases vides.
- Pour "manuel" ou "periode", remplis "semaines" et renvoie "periodes": [].
- Pour "programmation", remplis "periodes" et renvoie "semaines": [].

Règles pour "manuel" :
- Une entrée par semaine, dans l'ordre chronologique, avec les notions dans "items".
- Pour le français, conserve les graphèmes et sons exacts.
- "pages" contient les pages présentes, sinon "". "mots_exemple" contient les mots présents, sinon [].

Règles pour "periode" :
- Une entrée par semaine du document, en repartant de 1.
- "items" contient toutes les séances et tous les domaines de la semaine.
- Préfixe chaque contenu par son domaine quand il est indiqué.

Règles pour "programmation" :
- Une entrée par période présente, numérotée de 1 à 5.
- Dans chaque période, une entrée par domaine non vide.
- Ne répartis pas toi-même les contenus par semaine.

Réponds uniquement via le format structuré imposé.`
```

- [ ] **Step 5: Retourner les métadonnées normalisées dans le Route Handler**

Dans `src/app/api/ia-manuel/route.ts` :

```ts
import {
  AUTO_IMPORT_JSON_SCHEMA,
  periodeDocumentImport,
  typeDocumentImport,
} from '@/lib/ia/schema-import-auto'
```

Garder `matiere` comme indice facultatif et appeler :

```ts
system: systemImportAutomatique(matiere || undefined),
```

Après le parsing, construire :

```ts
const meta = {
  matiere: typeof parsed.matiere === 'string' ? parsed.matiere.trim() : '',
  nom_methode: typeof parsed.nom_methode === 'string' ? parsed.nom_methode.trim() : '',
  periode_numero: periodeDocumentImport(parsed.periode_numero),
  confiance_detection: typeof parsed.confiance_detection === 'number'
    ? Math.max(0, Math.min(1, parsed.confiance_detection))
    : 0,
  avertissements: Array.isArray(parsed.avertissements)
    ? parsed.avertissements.filter((x: unknown): x is string => typeof x === 'string')
    : [],
}
```

Les deux réponses de succès deviennent :

```ts
return NextResponse.json({
  ...meta,
  type_document: typeDocument,
  progression: [],
  periodes,
})
```

et :

```ts
return NextResponse.json({
  ...meta,
  type_document: typeDocument,
  progression,
  periodes: [],
})
```

- [ ] **Step 6: Relancer les tests ciblés puis le build de types**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/import-auto.test.ts src/lib/ia/__tests__/prompts.test.ts
npx tsc --noEmit
```

Expected: PASS, puis TypeScript sans erreur.

- [ ] **Step 7: Point de contrôle Git proposé**

```powershell
git add src/lib/ia/schema-import-auto.ts src/lib/ia/prompts.ts src/app/api/ia-manuel/route.ts src/lib/__tests__/import-auto.test.ts
git commit -m "feat: detecter la methode lors des imports"
```

## Task 3: Ajouter la provenance des documents en base

**Files:**
- Create: `supabase/migrations/016_methode_sources.sql`
- Modify: `supabase/migrations/006_schema_complet_idempotent.sql`
- Modify: `src/types/index.ts`
- Modify: `src/lib/__tests__/safe-replacement.test.ts`

- [ ] **Step 1: Écrire le test de structure SQL**

Ajouter dans `src/lib/__tests__/safe-replacement.test.ts` :

```ts
test('les sources de méthode sont protégées et modifiées atomiquement', () => {
  const migration = readFileSync(
    join(process.cwd(), 'supabase', 'migrations', '016_methode_sources.sql'),
    'utf8',
  )
  const schemaComplet = readFileSync(
    join(process.cwd(), 'supabase', 'migrations', '006_schema_complet_idempotent.sql'),
    'utf8',
  )
  expect(migration).toContain('create table if not exists methode_sources')
  expect(migration).toContain('unique (methode_id, empreinte_contenu)')
  expect(migration).toContain('alter table methode_sources enable row level security')
  expect(migration).toContain('create or replace function enregistrer_source_progression')
  expect(migration).toContain('create or replace function retirer_source_progression')
  expect(migration).toContain('security invoker')
  expect(schemaComplet).toContain('create or replace function remplacer_progression')
  expect(schemaComplet).toContain('create table if not exists methode_sources')
})
```

- [ ] **Step 2: Vérifier l'échec**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/safe-replacement.test.ts
```

Expected: FAIL avec fichier `016_methode_sources.sql` absent.

- [ ] **Step 3: Créer la migration**

Créer `supabase/migrations/016_methode_sources.sql` :

```sql
create table if not exists methode_sources (
  id uuid primary key default gen_random_uuid(),
  methode_id uuid references methodes on delete cascade not null,
  nom_source text not null,
  type_document text not null
    check (type_document in ('manuel', 'periode', 'programmation')),
  periode_numero integer
    check (periode_numero is null or periode_numero between 1 and 5),
  niveau_precision smallint not null
    check (niveau_precision between 1 and 3),
  contenu_structure jsonb not null,
  empreinte_contenu text not null,
  created_at timestamptz not null default now(),
  unique (methode_id, empreinte_contenu)
);

alter table methode_sources enable row level security;

do $$ begin
  create policy "Users manage own methode sources" on methode_sources
    using (
      methode_id in (
        select m.id
        from methodes m
        join classes c on c.id = m.class_id
        where c.user_id = auth.uid()
      )
    )
    with check (
      methode_id in (
        select m.id
        from methodes m
        join classes c on c.id = m.class_id
        where c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

create or replace function enregistrer_source_progression(
  p_class_id uuid,
  p_methode_id uuid,
  p_matiere text,
  p_nom_source text,
  p_type_document text,
  p_periode_numero integer,
  p_niveau_precision smallint,
  p_contenu_structure jsonb,
  p_empreinte_contenu text,
  p_lignes jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare nouvelle_source uuid;
begin
  if not exists (
    select 1
    from methodes m
    join classes c on c.id = m.class_id
    where m.id = p_methode_id
      and m.class_id = p_class_id
      and m.matiere = p_matiere
      and c.user_id = auth.uid()
  ) then
    raise exception 'Methode introuvable ou non autorisee';
  end if;

  insert into methode_sources (
    methode_id, nom_source, type_document, periode_numero,
    niveau_precision, contenu_structure, empreinte_contenu
  ) values (
    p_methode_id, p_nom_source, p_type_document, p_periode_numero,
    p_niveau_precision, p_contenu_structure, p_empreinte_contenu
  ) returning id into nouvelle_source;

  perform remplacer_progression(
    p_class_id, p_methode_id, p_matiere, null, p_lignes, false
  );
  return nouvelle_source;
end;
$$;

create or replace function retirer_source_progression(
  p_source_id uuid,
  p_lignes jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare contexte record;
begin
  select ms.methode_id, m.class_id, m.matiere
  into contexte
  from methode_sources ms
  join methodes m on m.id = ms.methode_id
  join classes c on c.id = m.class_id
  where ms.id = p_source_id and c.user_id = auth.uid();

  if contexte is null then
    raise exception 'Source introuvable ou non autorisee';
  end if;

  delete from methode_sources where id = p_source_id;
  perform remplacer_progression(
    contexte.class_id,
    contexte.methode_id,
    contexte.matiere,
    null,
    p_lignes,
    false
  );
end;
$$;

revoke all on function enregistrer_source_progression(
  uuid, uuid, text, text, text, integer, smallint, jsonb, text, jsonb
) from public;
grant execute on function enregistrer_source_progression(
  uuid, uuid, text, text, text, integer, smallint, jsonb, text, jsonb
) to authenticated;

revoke all on function retirer_source_progression(uuid, jsonb) from public;
grant execute on function retirer_source_progression(uuid, jsonb) to authenticated;
```

- [ ] **Step 4: Ajouter la table au schéma idempotent**

Dans `supabase/migrations/006_schema_complet_idempotent.sql`, ajouter d'abord la
définition complète de `remplacer_progression` provenant de
`014_remplacement_progression_atomique.sql`, car ce fichier se présente comme
une reconstruction autonome du schéma. Ajouter ensuite, après `methodes`, la
création de table, l'activation RLS, la policy et les deux fonctions de
`016_methode_sources.sql`.

- [ ] **Step 5: Ajouter le type client**

Dans `src/types/index.ts` :

```ts
export type MethodeSource = {
  id: string
  methode_id: string
  nom_source: string
  type_document: 'manuel' | 'periode' | 'programmation'
  periode_numero: number | null
  niveau_precision: number
  contenu_structure: {
    semaines: import('@/data/manuels').ProgressionSemaine[]
    periodes: import('@/lib/repartition-periode').PeriodeProgrammation[]
  }
  empreinte_contenu: string
  created_at: string
}
```

- [ ] **Step 6: Relancer le test**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/safe-replacement.test.ts
```

Expected: PASS.

- [ ] **Step 7: Point de contrôle Git proposé**

```powershell
git add supabase/migrations/016_methode_sources.sql supabase/migrations/006_schema_complet_idempotent.sql src/types/index.ts src/lib/__tests__/safe-replacement.test.ts
git commit -m "feat: conserver les sources des methodes"
```

## Task 4: Matérialiser les sources sur le vrai calendrier

**Files:**
- Modify: `src/lib/progression-sources.ts`
- Modify: `src/lib/__tests__/progression-sources.test.ts`
- Modify: `src/lib/progression.ts`
- Modify: `src/lib/__tests__/progression.test.ts`

- [ ] **Step 1: Écrire les tests de fusion et de squelette vide**

Ajouter dans `src/lib/__tests__/progression-sources.test.ts` :

```ts
import { materialiserSources } from '../progression-sources'

test('un planning de période remplace seulement les semaines de sa période', () => {
  const manuel = source({
    clientId: 'manuel',
    empreinteContenu: 'manuel',
    semaines: [
      { numero: 1, items: ['sommaire P1'], pages: '', mots_exemple: [] },
      { numero: 9, items: ['sommaire P2'], pages: '', mots_exemple: [] },
    ],
  })
  const p1 = source({
    clientId: 'p1',
    empreinteContenu: 'p1',
    typeDocument: 'periode',
    periodeNumero: 1,
    semaines: [{ numero: 1, items: ['planning détaillé'], pages: '', mots_exemple: [] }],
  })
  const resultat = materialiserSources(
    [manuel, p1],
    new Map([[1, [1, 2]], [2, [9, 10]]]),
  )
  expect(resultat.semaines.find(s => s.numero === 1)?.items).toEqual(['planning détaillé'])
  expect(resultat.semaines.find(s => s.numero === 9)?.items).toEqual(['sommaire P2'])
})

test('une programmation annuelle utilise les vraies semaines', () => {
  const programmation = source({
    typeDocument: 'programmation',
    empreinteContenu: 'prog',
    semaines: [],
    periodes: [{
      numero: 1,
      domaines: [{ nom: 'Calcul', items: ['Ajouter', 'Soustraire'] }],
    }],
  })
  const resultat = materialiserSources([programmation], new Map([[1, [1, 2, 3]]]))
  expect(resultat.semaines.map(s => s.numero)).toEqual([1, 2, 3])
  expect(resultat.semaines.flatMap(s => s.items)).toEqual([
    'Calcul : Ajouter',
    'Calcul : Soustraire',
  ])
})

test('la source la plus récente gagne à précision égale après validation', () => {
  const resultat = materialiserSources([
    source({ clientId: 'ancien', empreinteContenu: 'a', semaines: [{ numero: 1, items: ['ancien'], pages: '', mots_exemple: [] }] }),
    source({ clientId: 'nouveau', empreinteContenu: 'n', semaines: [{ numero: 1, items: ['nouveau'], pages: '', mots_exemple: [] }] }),
  ], new Map())
  expect(resultat.semaines[0].items).toEqual(['nouveau'])
  expect(resultat.remplacements).toHaveLength(1)
})

test('signale un planning plus long que la période sans écrire dans la suivante', () => {
  const resultat = materialiserSources([
    source({
      typeDocument: 'periode',
      periodeNumero: 1,
      empreinteContenu: 'p1',
      semaines: [
        { numero: 1, items: ['a'], pages: '', mots_exemple: [] },
        { numero: 2, items: ['b'], pages: '', mots_exemple: [] },
        { numero: 3, items: ['c'], pages: '', mots_exemple: [] },
      ],
    }),
  ], new Map([[1, [1, 2]], [2, [3]]]))
  expect(resultat.semaines.map(s => s.numero)).toEqual([1, 2])
  expect(resultat.avertissements[0]).toContain('1 semaine')
})
```

Ajouter dans `src/lib/__tests__/progression.test.ts` :

```ts
import { genererSqueletteSemaines } from '../progression'

test('génère 36 semaines même sans méthode', () => {
  const semaines = genererSqueletteSemaines('2026-09-01')
  expect(semaines).toHaveLength(36)
  expect(semaines.every(s => s.graphemes.length === 0)).toBe(true)
  expect(semaines.every(s => s.manuel_pages === null)).toBe(true)
})
```

- [ ] **Step 2: Vérifier les échecs**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/progression-sources.test.ts src/lib/__tests__/progression.test.ts
```

Expected: FAIL car `materialiserSources` et `genererSqueletteSemaines` sont absentes.

- [ ] **Step 3: Implémenter la matérialisation déterministe**

Ajouter à `src/lib/progression-sources.ts` :

```ts
import { repartirProgrammation } from '@/lib/repartition-periode'

export type ResultatMaterialisation = {
  semaines: ProgressionSemaine[]
  remplacements: Array<{
    numero: number
    ancienneSource: string
    nouvelleSource: string
  }>
  avertissements: string[]
}

function semainesSource(
  source: SourceProgression,
  semainesParPeriode: Map<number, number[]>,
): { semaines: ProgressionSemaine[]; avertissements: string[] } {
  if (source.typeDocument === 'manuel') {
    return { semaines: source.semaines, avertissements: [] }
  }
  if (source.typeDocument === 'programmation') {
    const repartition = repartirProgrammation(source.periodes, semainesParPeriode)
    return {
      semaines: repartition.semaines.map(s => ({
        numero: s.numero,
        items: s.items,
        pages: '',
        mots_exemple: [],
      })),
      avertissements: repartition.periodesIgnorees.map(
        numero => `La période ${numero} ne possède aucune semaine de classe.`,
      ),
    }
  }

  const numeros = source.periodeNumero
    ? [...(semainesParPeriode.get(source.periodeNumero) ?? [])].sort((a, b) => a - b)
    : []
  const gardees = source.semaines.slice(0, numeros.length).map((s, index) => ({
    ...s,
    numero: numeros[index],
  }))
  const debordement = Math.max(0, source.semaines.length - numeros.length)
  return {
    semaines: gardees,
    avertissements: debordement
      ? [`Le planning contient ${debordement} semaine supplémentaire, non placée hors de sa période.`]
      : [],
  }
}

export function materialiserSources(
  sources: SourceProgression[],
  semainesParPeriode: Map<number, number[]>,
): ResultatMaterialisation {
  const ordre = sources
    .map((source, index) => ({ source, index }))
    .sort((a, b) =>
      niveauPrecision(a.source.typeDocument) - niveauPrecision(b.source.typeDocument)
      || a.index - b.index,
    )
  const lignes = new Map<number, { ligne: ProgressionSemaine; sourceId: string }>()
  const remplacements: ResultatMaterialisation['remplacements'] = []
  const avertissements: string[] = []

  for (const { source } of ordre) {
    const materialisee = semainesSource(source, semainesParPeriode)
    avertissements.push(...materialisee.avertissements)
    for (const ligne of materialisee.semaines) {
      const precedente = lignes.get(ligne.numero)
      if (precedente && JSON.stringify(precedente.ligne) !== JSON.stringify(ligne)) {
        remplacements.push({
          numero: ligne.numero,
          ancienneSource: precedente.sourceId,
          nouvelleSource: source.clientId,
        })
      }
      lignes.set(ligne.numero, { ligne, sourceId: source.clientId })
    }
  }

  return {
    semaines: [...lignes.values()].map(x => x.ligne).sort((a, b) => a.numero - b.numero),
    remplacements,
    avertissements,
  }
}
```

- [ ] **Step 4: Découpler le squelette de la méthode**

Dans `src/lib/progression.ts`, ajouter :

```ts
export function genererSqueletteSemaines(
  rentreeDate: string,
): Omit<Semaine, 'id' | 'class_id'>[] {
  const debut = new Date(rentreeDate)
  return Array.from({ length: 36 }, (_, i) => {
    const semEdm = EDM_PROGRESSION_CP[i]
    return {
      numero: i + 1,
      date_debut: format(addWeeks(debut, i), 'yyyy-MM-dd'),
      graphemes: [],
      edm_theme: semEdm.theme,
      edm_competences: semEdm.competences,
      manuel_pages: null,
      mots_exemple: null,
      note: null,
    }
  })
}
```

Refactorer `genererProgression()` pour appeler `genererSqueletteSemaines()` puis
y appliquer uniquement la progression de démonstration ou la progression custom.

- [ ] **Step 5: Relancer les tests**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/progression-sources.test.ts src/lib/__tests__/progression.test.ts src/lib/__tests__/repartition-periode.test.ts
```

Expected: PASS.

- [ ] **Step 6: Point de contrôle Git proposé**

```powershell
git add src/lib/progression-sources.ts src/lib/__tests__/progression-sources.test.ts src/lib/progression.ts src/lib/__tests__/progression.test.ts
git commit -m "feat: fusionner les sources sur le calendrier scolaire"
```

## Task 5: Construire l'importeur de source réutilisable

**Files:**
- Create: `src/components/methodes/SourceImporter.tsx`
- Create: `src/components/methodes/SourceContentPreview.tsx`
- Modify: `src/components/setup/IaImport.tsx`
- Test: `src/lib/__tests__/import-auto.test.ts`

- [ ] **Step 1: Ajouter un test de garde sur le nouveau contrat**

Ajouter à `src/lib/__tests__/import-auto.test.ts` :

```ts
test('limporteur renvoie une source et ne prévisualise plus avec une classe inexistante', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/methodes/SourceImporter.tsx'),
    'utf8',
  )
  expect(source).toContain('onSourceReady')
  expect(source).toContain('calculerEmpreinteSource')
  expect(source).not.toContain('previsualiserProgrammation')
  expect(source).not.toContain('getPeriodesDisponibles')
})
```

- [ ] **Step 2: Vérifier l'échec**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/import-auto.test.ts
```

Expected: FAIL car `SourceImporter.tsx` n'existe pas.

- [ ] **Step 3: Créer l'aperçu éditable**

Créer `src/components/methodes/SourceContentPreview.tsx` avec cette API :

```tsx
'use client'
import type { ProgressionSemaine } from '@/data/manuels'
import type { PeriodeProgrammation } from '@/lib/repartition-periode'
import type { TypeDocumentImport } from '@/lib/ia/schema-import-auto'

export default function SourceContentPreview({
  typeDocument,
  semaines,
  periodes,
  onSemainesChange,
  onPeriodesChange,
}: {
  typeDocument: TypeDocumentImport
  semaines: ProgressionSemaine[]
  periodes: PeriodeProgrammation[]
  onSemainesChange: (semaines: ProgressionSemaine[]) => void
  onPeriodesChange: (periodes: PeriodeProgrammation[]) => void
}) {
  if (typeDocument === 'programmation') {
    return (
      <div className="max-h-80 overflow-y-auto space-y-3">
        {periodes.map((periode, pIndex) => (
          <section key={periode.numero} className="border rounded-xl p-3">
            <h4 className="font-semibold text-violet-800">Période {periode.numero}</h4>
            {periode.domaines.map((domaine, dIndex) => (
              <label key={`${periode.numero}-${dIndex}`} className="block mt-2 text-sm">
                <span className="font-medium text-gray-700">{domaine.nom}</span>
                <textarea
                  value={domaine.items.join('\n')}
                  onChange={event => {
                    const next = structuredClone(periodes)
                    next[pIndex].domaines[dIndex].items = event.target.value
                      .split('\n').map(x => x.trim()).filter(Boolean)
                    onPeriodesChange(next)
                  }}
                  className="mt-1 w-full min-h-20 border-2 border-slate-300 rounded-lg p-2"
                />
              </label>
            ))}
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="max-h-80 overflow-y-auto border rounded-xl">
      {semaines.map((semaine, index) => (
        <label key={semaine.numero} className="grid grid-cols-[4rem_1fr] gap-2 border-b p-2 text-sm">
          <span>S{semaine.numero}</span>
          <textarea
            value={semaine.items.join('\n')}
            onChange={event => onSemainesChange(semaines.map((item, i) =>
              i === index
                ? { ...item, items: event.target.value.split('\n').map(x => x.trim()).filter(Boolean) }
                : item,
            ))}
            className="min-h-16 border-2 border-slate-300 rounded-lg p-2"
          />
        </label>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Créer `SourceImporter`**

Créer `src/components/methodes/SourceImporter.tsx`. L'interface publique doit
être :

```tsx
export default function SourceImporter({
  prenom,
  matiereInitiale = '',
  methodeInitiale = '',
  onSourceReady,
  onCancel,
}: {
  prenom?: string
  matiereInitiale?: string
  methodeInitiale?: string
  onSourceReady: (source: SourceProgression) => void
  onCancel?: () => void
})
```

Le type de la réponse doit être :

```ts
type ReponseImport = {
  matiere: string
  nom_methode: string
  type_document: TypeDocumentImport
  periode_numero: number | null
  confiance_detection: number
  avertissements: string[]
  progression: ProgressionSemaine[]
  periodes: PeriodeProgrammation[]
  error?: string
}
```

Déclarer les états nécessaires :

```ts
const [texte, setTexte] = useState('')
const [nomSource, setNomSource] = useState('')
const [matiere, setMatiere] = useState(matiereInitiale)
const [nomMethode, setNomMethode] = useState(methodeInitiale)
const [typeDocument, setTypeDocument] = useState<TypeDocumentImport | null>(null)
const [periodeNumero, setPeriodeNumero] = useState<number | null>(null)
const [semaines, setSemaines] = useState<ProgressionSemaine[]>([])
const [periodes, setPeriodes] = useState<PeriodeProgrammation[]>([])
const [confiance, setConfiance] = useState(0)
const [avertissements, setAvertissements] = useState<string[]>([])
const [loading, setLoading] = useState(false)
const [saving, setSaving] = useState(false)
const [error, setError] = useState<string | null>(null)
```

Utiliser ces trois fonctions pour les deux voies PDF :

```ts
async function lancerImport(form: FormData) {
  if (matiereInitiale.trim()) form.append('matiere', matiereInitiale)
  setError(null)
  setLoading(true)
  try {
    const response = await fetch('/api/ia-manuel', { method: 'POST', body: form })
    const data = await response.json() as ReponseImport
    if (!response.ok) throw new Error(data.error ?? `Erreur ${response.status}`)
    setMatiere(data.matiere || matiereInitiale)
    setNomMethode(data.nom_methode || methodeInitiale)
    setTypeDocument(data.type_document)
    setPeriodeNumero(data.periode_numero)
    setSemaines(data.progression ?? [])
    setPeriodes(data.periodes ?? [])
    setConfiance(data.confiance_detection)
    setAvertissements(data.avertissements)
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : 'Import impossible')
  } finally {
    setLoading(false)
  }
}

async function importPdf(event: React.ChangeEvent<HTMLInputElement>) {
  const fichiers = Array.from(event.target.files ?? [])
  if (!fichiers.length) return
  setNomSource(fichiers.map(f => f.name).join(', '))
  const total = fichiers.reduce((somme, fichier) => somme + fichier.size, 0)
  if (total <= 4 * 1024 * 1024) {
    const form = new FormData()
    fichiers.forEach(fichier => form.append('pdf', fichier))
    await lancerImport(form)
    return
  }

  try {
    const textes = await Promise.all(fichiers.map(extractPdfText))
    const combine = textes.join('\n\n--- fichier suivant ---\n\n')
    if (combine.trim().length < 20) {
      setError('Ce PDF ne contient pas assez de texte lisible.')
      return
    }
    const form = new FormData()
    form.append('texte', combine)
    await lancerImport(form)
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : 'Lecture du PDF impossible')
  }
}

async function importTexte() {
  const propre = texte.trim()
  if (propre.length < 20) {
    setError('Colle un texte un peu plus long.')
    return
  }
  setNomSource('Texte collé')
  const form = new FormData()
  form.append('texte', propre)
  await lancerImport(form)
}
```

Après l'analyse, afficher des champs modifiables `Matière`, `Nom de la méthode`,
`Type de document` et `Période`. Afficher un encart orange si
`confiance_detection < 0.7` ou si `avertissements.length > 0`.

La validation construit la source ainsi :

```ts
const sansEmpreinte = {
  nomSource,
  matiere: matiere.trim(),
  nomMethode: nomMethode.trim(),
  typeDocument,
  periodeNumero: typeDocument === 'periode' ? periodeNumero : null,
  semaines,
  periodes,
}
const empreinteContenu = await calculerEmpreinteSource(sansEmpreinte)
onSourceReady({
  clientId: crypto.randomUUID(),
  ...sansEmpreinte,
  empreinteContenu,
})
```

Le bouton reste désactivé lorsque la matière ou le nom de méthode est vide, ou
lorsqu'un planning de période n'a pas de période 1 à 5.

- [ ] **Step 5: Supprimer les dépendances à une classe existante**

Ne pas appeler `previsualiserProgrammation()` ni `getPeriodesDisponibles()` dans
le nouvel importeur. Une programmation reste affichée par période jusqu'à la
création de la classe. La matérialisation hebdomadaire se fera au Task 7.

Laisser provisoirement `IaImport.tsx` en place pour éviter de casser Paramètres
avant le Task 8.

- [ ] **Step 6: Relancer les tests et TypeScript**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/import-auto.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Point de contrôle Git proposé**

```powershell
git add src/components/methodes/SourceImporter.tsx src/components/methodes/SourceContentPreview.tsx src/lib/__tests__/import-auto.test.ts
git commit -m "feat: ajouter un importeur de source reutilisable"
```

## Task 6: Remplacer la première étape du setup

**Files:**
- Create: `src/components/setup/ProgressionsSetup.tsx`
- Create: `src/components/setup/__tests__/ProgressionsSetup.test.tsx`
- Modify: `src/app/(app)/setup/page.tsx`
- Delete: `src/components/setup/ManualSelector.tsx`

- [ ] **Step 1: Écrire les tests d'interface**

Créer `src/components/setup/__tests__/ProgressionsSetup.test.tsx` :

```tsx
/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import ProgressionsSetup from '../ProgressionsSetup'
import type { SourceProgression } from '@/lib/progression-sources'

jest.mock('@/components/methodes/SourceImporter', () => ({
  __esModule: true,
  default: ({ onSourceReady }: { onSourceReady: (source: SourceProgression) => void }) => (
    <button onClick={() => onSourceReady({
      clientId: 'source-1',
      nomSource: 'poules.pdf',
      matiere: 'Français',
      nomMethode: "Les P'tites Poules",
      typeDocument: 'manuel',
      periodeNumero: null,
      semaines: [{ numero: 1, items: ['a'], pages: '', mots_exemple: [] }],
      periodes: [],
      empreinteContenu: 'hash-1',
    })}>
      Faux import
    </button>
  ),
}))

describe('ProgressionsSetup', () => {
  test('permet de continuer sans méthode', () => {
    const onContinue = jest.fn()
    render(<ProgressionsSetup sources={[]} onChange={jest.fn()} onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: /rien à importer/i }))
    expect(onContinue).toHaveBeenCalledWith([])
  })

  test('reste sur létape après un premier document', () => {
    const onChange = jest.fn()
    const onContinue = jest.fn()
    render(<ProgressionsSetup sources={[]} onChange={onChange} onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un document' }))
    fireEvent.click(screen.getByRole('button', { name: 'Faux import' }))
    expect(onChange).toHaveBeenCalled()
    expect(onContinue).not.toHaveBeenCalled()
  })

  test('affiche une carte regroupée et un bouton de suite', () => {
    const source = {
      clientId: 's1',
      nomSource: 'poules.pdf',
      matiere: 'Français',
      nomMethode: "Les P'tites Poules",
      typeDocument: 'manuel' as const,
      periodeNumero: null,
      semaines: [],
      periodes: [],
      empreinteContenu: 'h1',
    }
    render(<ProgressionsSetup sources={[source]} onChange={jest.fn()} onContinue={jest.fn()} />)
    expect(screen.getByText("Les P'tites Poules")).toBeTruthy()
    expect(screen.getByText(/1 document/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /tout ce que jai/i })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run:

```powershell
npm test -- --runInBand src/components/setup/__tests__/ProgressionsSetup.test.tsx
```

Expected: FAIL car le composant n'existe pas.

- [ ] **Step 3: Créer `ProgressionsSetup`**

Créer le composant avec cette API :

```tsx
'use client'
import { useState } from 'react'
import { Plus, ArrowRight, FileText, Trash2 } from 'lucide-react'
import SourceImporter from '@/components/methodes/SourceImporter'
import Bouton from '@/components/ui/Bouton'
import {
  analyserAjoutSource,
  cleMethode,
  regrouperSources,
  type SourceProgression,
} from '@/lib/progression-sources'

export default function ProgressionsSetup({
  sources,
  onChange,
  onContinue,
}: {
  sources: SourceProgression[]
  onChange: (sources: SourceProgression[]) => void
  onContinue: (sources: SourceProgression[]) => void
}) {
  const [importOuvert, setImportOuvert] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [detailsOuverts, setDetailsOuverts] = useState<string | null>(null)
  const groupes = regrouperSources(sources)

  function ajouter(candidate: SourceProgression) {
    const memesSources = sources.filter(s => cleMethode(s) === cleMethode(candidate))
    const analyse = analyserAjoutSource(memesSources, candidate)
    setMessage(analyse.message)
    if (!analyse.autorisable) return
    if (analyse.periodesRemplacees.length > 0
      && !window.confirm(`${analyse.message} Veux-tu ajouter ce document ?`)) return
    onChange([...sources, candidate])
    setImportOuvert(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-700">
        Ajoute ce que tu as déjà. L&apos;application regroupera les documents de la même méthode.
      </p>
      {message && <p role="status" className="text-sm text-amber-800">{message}</p>}

      {groupes.map(groupe => (
        <section key={groupe.cle} className="border-2 border-violet-200 rounded-2xl p-4">
          <h3 className="font-semibold text-violet-900">{groupe.nomMethode}</h3>
          <p className="text-sm text-gray-600">{groupe.matiere} · {groupe.sources.length} document{groupe.sources.length > 1 ? 's' : ''}</p>
          <button
            type="button"
            className="mt-2 text-sm text-violet-700 underline"
            onClick={() => setDetailsOuverts(detailsOuverts === groupe.cle ? null : groupe.cle)}
          >
            {detailsOuverts === groupe.cle ? 'Masquer la synthèse' : 'Voir la progression fusionnée'}
          </button>
          <ul className="mt-2 space-y-1">
            {groupe.sources.map(source => (
              <li key={source.clientId} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <FileText size={14} className="inline mr-1" />
                  {source.nomSource}
                  {source.periodeNumero ? ` · Période ${source.periodeNumero}` : ''}
                </span>
                <button
                  type="button"
                  aria-label={`Retirer ${source.nomSource}`}
                  onClick={() => onChange(sources.filter(s => s.clientId !== source.clientId))}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          {detailsOuverts === groupe.cle && (
            <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-gray-700">
              <p>Ordre appliqué : planning de période, programmation annuelle, puis sommaire général.</p>
              <p className="mt-1">
                Les semaines exactes seront calculées après le choix de la date de rentrée et de la zone.
              </p>
            </div>
          )}
        </section>
      ))}

      {importOuvert ? (
        <SourceImporter onSourceReady={ajouter} onCancel={() => setImportOuvert(false)} />
      ) : (
        <Bouton type="button" variant="contour" icon={Plus} className="w-full" onClick={() => setImportOuvert(true)}>
          Ajouter un document
        </Bouton>
      )}

      {sources.length > 0 ? (
        <Bouton type="button" variant="principal" iconRight={ArrowRight} className="w-full" onClick={() => onContinue(sources)}>
          J&apos;ai ajouté tout ce que j&apos;ai
        </Bouton>
      ) : (
        <Bouton type="button" variant="neutre" className="w-full" onClick={() => onContinue([])}>
          Je n&apos;ai rien à importer pour le moment
        </Bouton>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Modifier le brouillon du setup**

Dans `src/app/(app)/setup/page.tsx` :

```ts
import ProgressionsSetup from '@/components/setup/ProgressionsSetup'
import type { SourceProgression } from '@/lib/progression-sources'
```

Remplacer les champs `manuelId` et `customProgression` de `WizardData` par :

```ts
sourcesProgression: SourceProgression[]
```

Initialiser :

```ts
const [data, setData] = useState<Partial<WizardData>>({
  sourcesProgression: [],
})
```

Remplacer le premier titre et son aide :

```ts
const stepTitles = ['Tes méthodes et progressions', 'Date de la rentrée', 'Tes élèves', 'Ton emploi du temps']
```

```ts
'Ajoute les sommaires et plannings que tu possèdes déjà. Tu peux aussi passer cette étape et tout ajouter plus tard.'
```

Remplacer `ManualSelector` par :

```tsx
<ProgressionsSetup
  sources={data.sourcesProgression ?? []}
  onChange={sourcesProgression => setData(d => ({ ...d, sourcesProgression }))}
  onContinue={sourcesProgression => {
    setData(d => ({ ...d, sourcesProgression }))
    setStep(2)
  }}
/>
```

- [ ] **Step 5: Supprimer `ManualSelector.tsx`**

Vérifier d'abord :

```powershell
rg -n "ManualSelector" src
```

Expected: uniquement le fichier lui-même. Supprimer ensuite
`src/components/setup/ManualSelector.tsx`.

- [ ] **Step 6: Relancer le test et TypeScript**

Run:

```powershell
npm test -- --runInBand src/components/setup/__tests__/ProgressionsSetup.test.tsx
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Point de contrôle Git proposé**

```powershell
git add src/components/setup/ProgressionsSetup.tsx src/components/setup/__tests__/ProgressionsSetup.test.tsx 'src/app/(app)/setup/page.tsx'
git add -u src/components/setup/ManualSelector.tsx
git commit -m "feat: rendre les methodes facultatives dans le setup"
```

## Task 7: Créer la classe avec zéro ou plusieurs sources

**Files:**
- Modify: `src/lib/actions/setup.ts`
- Modify: `src/lib/__tests__/safe-replacement.test.ts`

- [ ] **Step 1: Ajouter les tests de garde de l'action**

Ajouter dans `src/lib/__tests__/safe-replacement.test.ts` :

```ts
test('le setup construit toujours le squelette et accepte zéro source', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'lib', 'actions', 'setup.ts'),
    'utf8',
  )
  expect(source).toContain('sourcesProgression: SourceProgression[]')
  expect(source).toContain('genererSqueletteSemaines')
  expect(source).not.toContain('genererProgression(formData.manuelId')
  expect(source).toContain("manuel_id: formData.sourcesProgression.length ? 'custom' : 'sans-methode'")
})

test('le setup enregistre les sources avant de supprimer lancienne classe', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'lib', 'actions', 'setup.ts'),
    'utf8',
  )
  const insertionSources = source.indexOf("from('methode_sources').insert")
  const suppressionAncienne = source.indexOf('supprimerClassesParIds(supabase, anciensIds)')
  expect(insertionSources).toBeGreaterThanOrEqual(0)
  expect(suppressionAncienne).toBeGreaterThan(insertionSources)
})
```

- [ ] **Step 2: Vérifier l'échec**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/safe-replacement.test.ts
```

Expected: FAIL sur l'ancien contrat `manuelId`.

- [ ] **Step 3: Modifier le contrat de `creerClasse`**

Dans `src/lib/actions/setup.ts` :

```ts
import { genererSqueletteSemaines } from '@/lib/progression'
import {
  materialiserSources,
  niveauPrecision,
  regrouperSources,
  type SourceProgression,
} from '@/lib/progression-sources'
```

Le formulaire devient :

```ts
export async function creerClasse(formData: {
  rentreeDate: string
  zoneScolaire: ZoneScolaire
  eleves: string[]
  emploiDuTemps: Array<{
    jour: string
    heure_debut: string
    heure_fin: string
    matiere: string
    ordre: number
    couleur?: string | null
    type?: 'cours' | 'routine'
  }>
  sourcesProgression: SourceProgression[]
})
```

La classe utilise :

```ts
manuel_id: formData.sourcesProgression.length ? 'custom' : 'sans-methode',
```

- [ ] **Step 4: Matérialiser avant l'insertion des semaines**

Après le calcul de `periodes` :

```ts
const squelette = genererSqueletteSemaines(formData.rentreeDate)
const calendrier = datesSemainesCalendaires(periodes, squelette.length)
if (calendrier.length !== squelette.length) {
  throw new Error('Le calendrier scolaire ne contient pas assez de semaines de classe.')
}

const semainesParPeriode = new Map<number, number[]>()
for (const semaine of calendrier) {
  const liste = semainesParPeriode.get(semaine.periode_numero) ?? []
  liste.push(semaine.numero)
  semainesParPeriode.set(semaine.periode_numero, liste)
}

const groupes = regrouperSources(formData.sourcesProgression)
const progressions = groupes.map(groupe => ({
  groupe,
  resultat: materialiserSources(groupe.sources, semainesParPeriode),
}))
const francais = progressions.find(
  p => p.groupe.matiere.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'francais',
)
const francaisParNumero = new Map(
  (francais?.resultat.semaines ?? []).map(s => [s.numero, s]),
)
```

Construire `semainesData` :

```ts
const calendrierParNumero = new Map(calendrier.map(s => [s.numero, s]))
const semainesData = squelette.map(s => {
  const lecture = francaisParNumero.get(s.numero)
  return {
    ...s,
    class_id: classe.id,
    date_debut: calendrierParNumero.get(s.numero)?.date_debut ?? s.date_debut,
    periode_numero: calendrierParNumero.get(s.numero)?.periode_numero ?? null,
    graphemes: lecture?.items ?? [],
    manuel_pages: lecture?.pages || null,
    mots_exemple: lecture?.mots_exemple ?? null,
  }
})
```

- [ ] **Step 5: Enregistrer méthodes, sources et progression**

Après l'insertion de `semainesData`, ajouter :

```ts
for (const { groupe, resultat } of progressions) {
  const methodeId = await ensureMethode(
    supabase,
    classe.id,
    groupe.matiere,
    groupe.nomMethode,
  )

  if (groupe.sources.length > 0) {
    const { error: sourceError } = await supabase.from('methode_sources').insert(
      groupe.sources.map(source => ({
        methode_id: methodeId,
        nom_source: source.nomSource,
        type_document: source.typeDocument,
        periode_numero: source.periodeNumero,
        niveau_precision: niveauPrecision(source.typeDocument),
        contenu_structure: {
          semaines: source.semaines,
          periodes: source.periodes,
        },
        empreinte_contenu: source.empreinteContenu,
      })),
    )
    if (sourceError) {
      throw new Error(`Enregistrement des documents impossible : ${sourceError.message}`)
    }
  }

  if (resultat.semaines.length > 0) {
    const { error: progressionError } = await supabase.from('progression').insert(
      resultat.semaines.map(semaine => ({
        class_id: classe.id,
        methode_id: methodeId,
        matiere: groupe.matiere,
        numero: semaine.numero,
        items: semaine.items,
        pages: semaine.pages || null,
        mots_exemple: semaine.mots_exemple,
      })),
    )
    if (progressionError) {
      throw new Error(`Enregistrement de la progression impossible : ${progressionError.message}`)
    }
  }
}
```

Conserver le `catch` existant qui supprime la nouvelle classe incomplète, puis la
suppression des anciennes classes seulement après réussite complète.

- [ ] **Step 6: Relancer les tests et TypeScript**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/safe-replacement.test.ts src/lib/__tests__/progression.test.ts src/lib/__tests__/progression-sources.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Point de contrôle Git proposé**

```powershell
git add src/lib/actions/setup.ts src/lib/__tests__/safe-replacement.test.ts
git commit -m "feat: creer une classe avec ou sans methodes"
```

## Task 8: Réutiliser les sources dans Paramètres

**Files:**
- Create: `src/lib/actions/methode-sources.ts`
- Modify: `src/components/parametres/MethodesEditor.tsx`
- Modify: `src/app/(app)/parametres/page.tsx`
- Delete: `src/components/setup/IaImport.tsx`

- [ ] **Step 1: Créer les actions atomiques**

Créer `src/lib/actions/methode-sources.ts` :

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureMethode } from '@/lib/methodes-db'
import {
  materialiserSources,
  niveauPrecision,
  type SourceProgression,
} from '@/lib/progression-sources'
import type { MethodeSource } from '@/types'

async function contexteClasse() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')
  const { data: classe } = await supabase.from('classes').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false })
    .limit(1).maybeSingle()
  if (!classe) throw new Error('Aucune classe')
  return { supabase, classeId: classe.id as string }
}

async function calendrierClasse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classeId: string,
): Promise<Map<number, number[]>> {
  const { data, error } = await supabase.from('semaines')
    .select('numero, periode_numero').eq('class_id', classeId).order('numero')
  if (error) throw new Error(error.message)
  const map = new Map<number, number[]>()
  for (const semaine of data ?? []) {
    if (semaine.periode_numero === null) continue
    const liste = map.get(semaine.periode_numero) ?? []
    liste.push(semaine.numero)
    map.set(semaine.periode_numero, liste)
  }
  return map
}

function depuisBase(source: MethodeSource, matiere: string, nomMethode: string): SourceProgression {
  return {
    clientId: source.id,
    nomSource: source.nom_source,
    matiere,
    nomMethode,
    typeDocument: source.type_document,
    periodeNumero: source.periode_numero,
    semaines: source.contenu_structure.semaines ?? [],
    periodes: source.contenu_structure.periodes ?? [],
    empreinteContenu: source.empreinte_contenu,
  }
}

function lignesRpc(sources: SourceProgression[], calendrier: Map<number, number[]>) {
  return materialiserSources(sources, calendrier).semaines.map(s => ({
    numero: s.numero,
    items: s.items,
    pages: s.pages || '',
    mots_exemple: s.mots_exemple ?? [],
  }))
}

export async function ajouterSourceProgression(source: SourceProgression) {
  const { supabase, classeId } = await contexteClasse()
  const methodeId = await ensureMethode(
    supabase, classeId, source.matiere, source.nomMethode,
  )
  const { data: existantes, error } = await supabase.from('methode_sources')
    .select('*').eq('methode_id', methodeId).order('created_at')
  if (error) throw new Error(error.message)
  const calendrier = await calendrierClasse(supabase, classeId)
  const toutes = [
    ...(existantes as MethodeSource[]).map(s => depuisBase(s, source.matiere, source.nomMethode)),
    source,
  ]
  const { error: rpcError } = await supabase.rpc('enregistrer_source_progression', {
    p_class_id: classeId,
    p_methode_id: methodeId,
    p_matiere: source.matiere,
    p_nom_source: source.nomSource,
    p_type_document: source.typeDocument,
    p_periode_numero: source.periodeNumero,
    p_niveau_precision: niveauPrecision(source.typeDocument),
    p_contenu_structure: { semaines: source.semaines, periodes: source.periodes },
    p_empreinte_contenu: source.empreinteContenu,
    p_lignes: lignesRpc(toutes, calendrier),
  })
  if (rpcError) throw new Error(rpcError.message)
  revalidatePath('/parametres')
  revalidatePath('/planning')
  revalidatePath('/accueil')
}

export async function retirerSourceProgression(sourceId: string) {
  const { supabase, classeId } = await contexteClasse()
  const { data: cible } = await supabase.from('methode_sources')
    .select('*, methodes!inner(matiere, manuel, class_id)')
    .eq('id', sourceId).maybeSingle()
  if (!cible || cible.methodes.class_id !== classeId) throw new Error('Source introuvable')
  const { data: restantes, error } = await supabase.from('methode_sources')
    .select('*').eq('methode_id', cible.methode_id).neq('id', sourceId).order('created_at')
  if (error) throw new Error(error.message)
  const calendrier = await calendrierClasse(supabase, classeId)
  const sources = (restantes as MethodeSource[]).map(s =>
    depuisBase(s, cible.methodes.matiere, cible.methodes.manuel ?? cible.methodes.matiere),
  )
  const { error: rpcError } = await supabase.rpc('retirer_source_progression', {
    p_source_id: sourceId,
    p_lignes: lignesRpc(sources, calendrier),
  })
  if (rpcError) throw new Error(rpcError.message)
  revalidatePath('/parametres')
  revalidatePath('/planning')
  revalidatePath('/accueil')
}
```

- [ ] **Step 2: Charger les sources dans Paramètres**

Dans `src/app/(app)/parametres/page.tsx` :

```ts
const { data: methodeSources } = await supabase
  .from('methode_sources')
  .select('*')
  .in('methode_id', (methodes ?? []).map(m => m.id))
  .order('created_at')
```

Ne pas exécuter `.in()` avec un tableau vide. Utiliser :

```ts
const methodeIds = (methodes ?? []).map(m => m.id)
const methodeSources = methodeIds.length
  ? (await supabase.from('methode_sources').select('*').in('methode_id', methodeIds).order('created_at')).data ?? []
  : []
```

Passer `sources={methodeSources as MethodeSource[]}` à `MethodesEditor`.

- [ ] **Step 3: Remplacer l'ancien import dans `MethodesEditor`**

Ajouter :

```ts
import SourceImporter from '@/components/methodes/SourceImporter'
import {
  ajouterSourceProgression,
  retirerSourceProgression,
} from '@/lib/actions/methode-sources'
import type { MethodeSource } from '@/types'
```

Ajouter la prop :

```ts
sources: MethodeSource[]
```

Ajouter un état qui permet d'importer une toute première méthode, même lorsque
la classe ne possède encore aucune ligne dans `methodes` :

```ts
const [nouvelleSourceOuverte, setNouvelleSourceOuverte] = useState(false)
```

Avant la liste des méthodes, afficher :

```tsx
{nouvelleSourceOuverte ? (
  <SourceImporter
    prenom={prenom}
    onSourceReady={async source => {
      await ajouterSourceProgression(source)
      setMessage(`${source.nomMethode} ajoutée ✓`)
      setNouvelleSourceOuverte(false)
      router.refresh()
    }}
    onCancel={() => setNouvelleSourceOuverte(false)}
  />
) : (
  <Bouton
    type="button"
    variant="principal"
    icon={Plus}
    onClick={() => setNouvelleSourceOuverte(true)}
  >
    Ajouter un document ou une méthode
  </Bouton>
)}
```

Ainsi, une classe créée sans méthode n'oblige pas le professeur à créer
manuellement une matière avant de déposer son document.

Pour chaque méthode, afficher :

```tsx
const sourcesMethode = sources.filter(source => source.methode_id === m.id)
```

```tsx
<ul className="space-y-1">
  {sourcesMethode.map(source => (
    <li key={source.id} className="flex justify-between gap-2 text-sm text-gray-600">
      <span>
        {source.nom_source}
        {source.periode_numero ? ` · Période ${source.periode_numero}` : ''}
      </span>
      <button
        type="button"
        onClick={async () => {
          if (!window.confirm(`Retirer ${source.nom_source} et recalculer la progression ?`)) return
          await retirerSourceProgression(source.id)
          router.refresh()
        }}
      >
        Retirer
      </button>
    </li>
  ))}
</ul>
```

Remplacer `IaImport` par :

```tsx
<SourceImporter
  prenom={prenom}
  matiereInitiale={m.matiere}
  methodeInitiale={m.manuel ?? ''}
  onSourceReady={async source => {
    await ajouterSourceProgression(source)
    setMessage(`${source.nomSource} ajouté à ${source.nomMethode} ✓`)
    setOuverte(null)
    router.refresh()
  }}
  onCancel={() => setOuverte(null)}
/>
```

Supprimer `saveImport()` et les imports des trois anciennes actions de
progression.

- [ ] **Step 4: Retirer le flux historique à méthode unique**

Dans `src/app/(app)/parametres/page.tsx`, supprimer :

- l'import `ManualEditor` ;
- le calcul `manuelNom` ;
- la section `Tout régénérer (changer de manuel)`.

Le seul chemin normal devient `Mes méthodes et acquis des élèves`.

- [ ] **Step 5: Supprimer l'ancien `IaImport.tsx`**

Vérifier :

```powershell
rg -n "IaImport" src
```

Expected: uniquement `src/components/setup/IaImport.tsx`. Supprimer le fichier.

- [ ] **Step 6: Vérifier TypeScript et les tests ciblés**

Run:

```powershell
npx tsc --noEmit
npm test -- --runInBand src/lib/__tests__/safe-replacement.test.ts src/lib/__tests__/progression-sources.test.ts
```

Expected: PASS.

- [ ] **Step 7: Point de contrôle Git proposé**

```powershell
git add src/lib/actions/methode-sources.ts src/components/parametres/MethodesEditor.tsx 'src/app/(app)/parametres/page.tsx'
git add -u src/components/setup/IaImport.tsx
git commit -m "feat: completer les methodes depuis les parametres"
```

## Task 9: Afficher correctement zéro ou plusieurs méthodes

**Files:**
- Modify: `src/app/(app)/planning/page.tsx`
- Modify: `src/app/(app)/parametres/page.tsx`
- Test: `src/lib/__tests__/safe-replacement.test.ts`

- [ ] **Step 1: Ajouter un test de garde sur le libellé historique**

Ajouter dans `src/lib/__tests__/safe-replacement.test.ts` :

```ts
test('le planning affiche les vraies méthodes et non manuel_id', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'app', '(app)', 'planning', 'page.tsx'),
    'utf8',
  )
  expect(source).toContain("from('methodes')")
  expect(source).toContain('Aucune méthode pour le moment')
  expect(source).not.toContain('MANUELS.find')
})
```

- [ ] **Step 2: Vérifier l'échec**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/safe-replacement.test.ts
```

Expected: FAIL sur `MANUELS.find`.

- [ ] **Step 3: Charger et afficher les méthodes**

Dans `src/app/(app)/planning/page.tsx`, ajouter `methodes` au `Promise.all` :

```ts
supabase.from('methodes')
  .select('matiere, manuel')
  .eq('class_id', classe.id)
  .order('created_at')
```

Remplacer `manuelNom` par :

```ts
const methodesNom = (methodes ?? []).length
  ? (methodes ?? []).map(m => m.manuel || m.matiere).join(' · ')
  : 'Aucune méthode pour le moment'
```

Afficher `methodesNom` dans l'en-tête.

Dans Paramètres, lorsque `methodes.length === 0`, `MethodesEditor` doit afficher :

```tsx
<p className="text-sm text-gray-600">
  Aucune méthode pour le moment. Ta classe fonctionne déjà, tu peux en ajouter une quand tu veux.
</p>
```

- [ ] **Step 4: Relancer le test**

Run:

```powershell
npm test -- --runInBand src/lib/__tests__/safe-replacement.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Point de contrôle Git proposé**

```powershell
git add 'src/app/(app)/planning/page.tsx' 'src/app/(app)/parametres/page.tsx' src/components/parametres/MethodesEditor.tsx src/lib/__tests__/safe-replacement.test.ts
git commit -m "fix: afficher les methodes reelles de la classe"
```

## Task 10: Validation complète, migration et passation

**Files:**
- Modify: `MARCHE-A-SUIVRE-CODEX-CLAUDE.md`
- Verify: all files above

- [ ] **Step 1: Rechercher le tiret cadratin interdit**

Run:

```powershell
$files = git diff --name-only
Select-String -Path $files -Pattern ([char]0x2014)
```

Expected: aucune sortie. Si une occurrence apparaît dans un fichier modifié,
la remplacer par une ponctuation autorisée.

- [ ] **Step 2: Vérifier les diffs**

Run:

```powershell
git diff --check
git status --short
```

Expected:

- aucune erreur d'espace ;
- aucun fichier de `partage/` ajouté ;
- uniquement les fichiers prévus par ce plan.

- [ ] **Step 3: Lancer la suite complète**

Run:

```powershell
npm test -- --runInBand
```

Expected: toutes les suites et tous les tests passent.

- [ ] **Step 4: Lancer le build Next.js**

Run:

```powershell
npm run build
```

Expected: build Next.js 16 terminé sans erreur TypeScript ni erreur de route.

- [ ] **Step 5: Appliquer la migration sur l'environnement prévu**

Avant toute application, vérifier la cible Supabase et sauvegarder la base si
elle contient des données réelles.

Run sur la cible explicitement autorisée :

```powershell
npx supabase db push
```

Expected: migration `016_methode_sources.sql` appliquée avec succès.

- [ ] **Step 6: Vérifier manuellement le parcours sans méthode**

1. Ouvrir `/setup`.
2. Cliquer `Je n'ai rien à importer pour le moment`.
3. Choisir date et zone.
4. Passer les élèves.
5. Créer l'emploi du temps.
6. Vérifier `/planning` avec 36 semaines et `Aucune méthode pour le moment`.
7. Ouvrir Paramètres et ajouter ensuite une première méthode.

Expected: aucun blocage et aucune erreur `Manuel inconnu`.

- [ ] **Step 7: Vérifier manuellement le parcours P'tites Poules**

1. Importer le sommaire général P'tites Poules.
2. Vérifier matière, nom de méthode et type détectés.
3. Valider sans quitter l'étape.
4. Ajouter le planning détaillé de période 1.
5. Vérifier l'avertissement de priorité.
6. Valider puis terminer le setup.
7. Vérifier que la période 1 vient du planning détaillé et que les autres
   semaines du sommaire sont conservées.
8. Ajouter la période 2 depuis Paramètres.

Expected: une seule méthode, trois sources visibles, aucune période perdue.

- [ ] **Step 8: Vérifier le mobile et l'accessibilité**

- largeur 375 px sans débordement horizontal ;
- boutons principaux visibles sans zoom ;
- navigation clavier dans l'importeur ;
- labels associés aux champs ;
- messages d'erreur avec `role="alert"` ;
- messages de confirmation avec `role="status"`.

- [ ] **Step 9: Mettre à jour la passation**

Ajouter en haut du journal de `MARCHE-A-SUIVRE-CODEX-CLAUDE.md` :

```markdown
### 2026-07-23 - Codex - Import progressif multi-sources dans le setup

- Le setup accepte maintenant zéro ou plusieurs documents et matières.
- Les documents d'une même méthode sont regroupés dans `methode_sources`.
- Les plannings détaillés de période sont prioritaires sans effacer les autres périodes.
- Le même import progressif est disponible dans Paramètres.
- Migration ajoutée : `016_methode_sources.sql`.
- Vérifications : suite Jest complète, build Next.js, parcours sans méthode et parcours P'tites Poules.
- Points restant à valider en production : [indiquer uniquement les vrais points restants].
```

Remplacer la dernière ligne par l'état réel. Ne jamais déclarer une validation
de production qui n'a pas été effectuée.

- [ ] **Step 10: Point de contrôle Git final proposé**

```powershell
git add MARCHE-A-SUIVRE-CODEX-CLAUDE.md
git commit -m "docs: transmettre limport progressif des methodes"
```

- [ ] **Step 11: Publication uniquement après autorisation**

Si l'utilisateur demande explicitement de publier :

```powershell
git push origin main
```

Puis vérifier le déploiement Vercel et tester l'URL publique. Ne pas annoncer la
publication avant confirmation réelle de l'URL et de la version déployée.
