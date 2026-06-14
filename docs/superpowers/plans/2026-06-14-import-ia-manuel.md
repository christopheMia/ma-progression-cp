# Import IA des manuels — Plan d'implémentation (sous-système 1 : import + chat)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'enseignant de fournir son manuel (PDF ou sommaire collé), que l'IA le comprenne et propose une progression structurée éditable, corrigeable au clavier ou via un chat conversationnel.

**Architecture:** 2 routes serveur Next.js appellent l'API Anthropic avec la clé secrète (`claude-opus-4-8` pour l'import, `claude-sonnet-4-6` pour le chat), en sorties structurées (format garanti = type `ProgressionSemaine`). Un composant `IaImport` affiche un tableau éditable + une boîte de dialogue. Branché comme 3ᵉ onglet de `ManualSelector`, il réutilise le flux existant `onSelect('custom', progression)`.

**Tech Stack:** Next.js 16 (route handlers), `@anthropic-ai/sdk` (à installer), `pdf-parse` (déjà là), React 19, Tailwind 4, Jest + ts-jest.

**Design source:** `docs/superpowers/specs/2026-06-14-import-ia-manuel-design.md`

---

## Préalables d'exécution (lire avant de commencer)

1. **Next.js 16 modifié** — avant d'écrire les route handlers, consulter `node_modules/next/dist/docs/` (cf. AGENTS.md). Le projet utilise déjà le pattern `export async function POST(request: Request)` + `NextResponse` (voir `src/app/api/parse-manuel-pdf/route.ts`) — le réutiliser tel quel.
2. **Clé API requise au runtime** — l'app a besoin de `ANTHROPIC_API_KEY` (local : `.env.local` ; prod : Vercel). Les tests unitaires n'en ont PAS besoin (logique pure + client mocké). Les vérifications manuelles end-to-end (Tasks 4-7) nécessitent une vraie clé.
3. **Contrainte connue** — `genererProgression` (`src/lib/progression.ts:23`) génère toujours 36 semaines. Un manuel de 32 semaines laissera les semaines 33-36 vides (acceptable : l'année scolaire fait 36 semaines, la méthode en couvre 32). On ne touche pas à `genererProgression` dans ce plan.

---

## Structure des fichiers

**Créés :**
- `src/lib/ia/anthropic.ts` — fabrique du client Anthropic (lit la clé d'env, throw si absente).
- `src/lib/ia/schema.ts` — schéma JSON de sortie + `normalizeProgression()` (validation/nettoyage, pur, testable).
- `src/lib/ia/prompts.ts` — consignes système (import + chat), builders purs.
- `src/lib/ia/__tests__/schema.test.ts` — tests de `normalizeProgression`.
- `src/lib/ia/__tests__/prompts.test.ts` — tests des builders de prompt.
- `src/app/api/ia-manuel/route.ts` — POST : PDF ou texte → progression (Opus).
- `src/app/api/ia-chat/route.ts` — POST : progression + message + historique → progression modifiée + réponse (Sonnet).
- `src/components/setup/IaImport.tsx` — UI : dépôt/collage + tableau éditable + boîte de dialogue.

**Modifiés :**
- `package.json` — ajout `@anthropic-ai/sdk`.
- `src/components/setup/ManualSelector.tsx` — 3ᵉ onglet « 🤖 Import IA ».
- `.env.local` (local, non commité) — `ANTHROPIC_API_KEY=...`.

---

### Task 1 : Installer le SDK + fabrique du client Anthropic

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/lib/ia/anthropic.ts`
- Test: `src/lib/ia/__tests__/anthropic.test.ts`

- [ ] **Step 1: Installer le SDK**

Run: `npm install @anthropic-ai/sdk`
Expected: `package.json` liste `@anthropic-ai/sdk` dans `dependencies`.

- [ ] **Step 2: Écrire le test (échoue sans clé)**

Create `src/lib/ia/__tests__/anthropic.test.ts` :

```ts
import { getAnthropicClient } from '../anthropic'

describe('getAnthropicClient', () => {
  const old = process.env.ANTHROPIC_API_KEY

  afterEach(() => { process.env.ANTHROPIC_API_KEY = old })

  test('throw un message clair si la clé est absente', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => getAnthropicClient()).toThrow(/ANTHROPIC_API_KEY/)
  })

  test('retourne un client si la clé est présente', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    const client = getAnthropicClient()
    expect(client).toBeDefined()
    expect(client.messages).toBeDefined()
  })
})
```

- [ ] **Step 3: Lancer le test (échoue)**

Run: `npx jest src/lib/ia/__tests__/anthropic.test.ts`
Expected: FAIL — `Cannot find module '../anthropic'`.

- [ ] **Step 4: Implémenter la fabrique**

Create `src/lib/ia/anthropic.ts` :

```ts
import Anthropic from '@anthropic-ai/sdk'

/** Modèles utilisés (un seul compte/clé ; le modèle est un paramètre de requête). */
export const MODELE_IMPORT = 'claude-opus-4-8'
export const MODELE_CHAT = 'claude-sonnet-4-6'

/** Crée un client Anthropic côté serveur. La clé NE doit JAMAIS être exposée au navigateur. */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante : ajoutez-la dans .env.local (local) et sur Vercel (prod)."
    )
  }
  return new Anthropic({ apiKey })
}
```

- [ ] **Step 5: Lancer le test (passe)**

Run: `npx jest src/lib/ia/__tests__/anthropic.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/ia/anthropic.ts src/lib/ia/__tests__/anthropic.test.ts
git commit -m "feat(ia): client Anthropic serveur + modeles import/chat"
```

---

### Task 2 : Schéma de sortie + normalisation de la progression

**Files:**
- Create: `src/lib/ia/schema.ts`
- Test: `src/lib/ia/__tests__/schema.test.ts`

- [ ] **Step 1: Écrire les tests**

Create `src/lib/ia/__tests__/schema.test.ts` :

```ts
import { normalizeProgression, PROGRESSION_JSON_SCHEMA } from '../schema'

describe('normalizeProgression', () => {
  test('renumérote les semaines de 1 à N dans l’ordre', () => {
    const out = normalizeProgression([
      { numero: 5, graphemes: ['a'], pages: 'p.10', mots_exemple: ['ananas'] },
      { numero: 2, graphemes: ['i'], pages: 'p.14', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([1, 2])
  })

  test('coupe à 36 semaines maximum', () => {
    const brut = Array.from({ length: 50 }, (_, i) => ({
      numero: i + 1, graphemes: ['a'], pages: '', mots_exemple: [],
    }))
    expect(normalizeProgression(brut)).toHaveLength(36)
  })

  test('nettoie les champs manquants ou invalides', () => {
    const out = normalizeProgression([
      // @ts-expect-error — entrée volontairement incomplète
      { numero: 1, graphemes: null, pages: undefined },
    ])
    expect(out[0]).toEqual({ numero: 1, graphemes: [], pages: '', mots_exemple: [] })
  })

  test('filtre les graphèmes vides et trim', () => {
    const out = normalizeProgression([
      { numero: 1, graphemes: [' a ', '', 'ou'], pages: ' p.10 ', mots_exemple: [' ami ', ''] },
    ])
    expect(out[0].graphemes).toEqual(['a', 'ou'])
    expect(out[0].pages).toBe('p.10')
    expect(out[0].mots_exemple).toEqual(['ami'])
  })

  test('le schéma JSON cible un objet { semaines: [...] }', () => {
    expect(PROGRESSION_JSON_SCHEMA.type).toBe('object')
    expect(PROGRESSION_JSON_SCHEMA.properties.semaines.type).toBe('array')
  })
})
```

- [ ] **Step 2: Lancer (échoue)**

Run: `npx jest src/lib/ia/__tests__/schema.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter le schéma + la normalisation**

Create `src/lib/ia/schema.ts` :

```ts
import type { ProgressionSemaine } from '@/data/manuels'

/**
 * Schéma JSON imposé à l'IA (sorties structurées Anthropic).
 * Top-level objet obligatoire (un array nu n'est pas accepté).
 */
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
          graphemes: { type: 'array', items: { type: 'string' } },
          pages: { type: 'string' },
          mots_exemple: { type: 'array', items: { type: 'string' } },
        },
        required: ['numero', 'graphemes', 'pages', 'mots_exemple'],
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

/** Nettoie/valide la progression renvoyée par l'IA et renumérote 1..N (max 36). */
export function normalizeProgression(brut: unknown[]): ProgressionSemaine[] {
  const items = Array.isArray(brut) ? brut : []
  const cleaned = items.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    return {
      numero: typeof o.numero === 'number' ? o.numero : 0,
      graphemes: toStringArray(o.graphemes),
      pages: typeof o.pages === 'string' ? o.pages.trim() : '',
      mots_exemple: toStringArray(o.mots_exemple),
    }
  })
  // tri par numéro IA puis renumérotation propre 1..N
  cleaned.sort((a, b) => a.numero - b.numero)
  return cleaned.slice(0, MAX_SEMAINES).map((s, i) => ({ ...s, numero: i + 1 }))
}
```

- [ ] **Step 4: Lancer (passe)**

Run: `npx jest src/lib/ia/__tests__/schema.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ia/schema.ts src/lib/ia/__tests__/schema.test.ts
git commit -m "feat(ia): schema JSON de sortie + normalisation progression"
```

---

### Task 3 : Builders de prompts (import + chat)

**Files:**
- Create: `src/lib/ia/prompts.ts`
- Test: `src/lib/ia/__tests__/prompts.test.ts`

- [ ] **Step 1: Écrire les tests**

Create `src/lib/ia/__tests__/prompts.test.ts` :

```ts
import { SYSTEM_IMPORT, systemChat, userImport } from '../prompts'

describe('prompts', () => {
  test('SYSTEM_IMPORT impose 1 son par graphème et le format', () => {
    expect(SYSTEM_IMPORT).toMatch(/graphème/i)
    expect(SYSTEM_IMPORT).toMatch(/semaine/i)
  })

  test('userImport insère le texte du manuel', () => {
    const u = userImport('Semaine 1 : a — p.10')
    expect(u).toContain('Semaine 1 : a — p.10')
  })

  test('systemChat tutoie l’enseignant par son prénom', () => {
    expect(systemChat('Cécile')).toContain('Cécile')
  })

  test('systemChat sans prénom reste valide', () => {
    expect(systemChat(undefined)).toMatch(/assistant/i)
  })
})
```

- [ ] **Step 2: Lancer (échoue)**

Run: `npx jest src/lib/ia/__tests__/prompts.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter les prompts**

Create `src/lib/ia/prompts.ts` :

```ts
export const SYSTEM_IMPORT = `Tu es un expert des méthodes de lecture CP françaises.
On te donne le texte (sommaire ou guide) d'un manuel de lecture CP.
Ta tâche : reconstruire la progression réelle, semaine par semaine.

Règles :
- Une entrée par semaine, dans l'ordre chronologique de l'année.
- "graphemes" = le(s) son(s)/graphème(s) étudié(s) cette semaine (ex: ["a"], ["on","an"]).
- "pages" = les pages du manuel si présentes (ex: "p. 10-13"), sinon "".
- "mots_exemple" = quelques mots d'exemple si présents, sinon [].
- N'invente pas de sons : si une semaine n'a pas de graphème identifiable, mets [].
- Respecte le nombre réel de semaines du manuel (souvent 30 à 36).
Réponds UNIQUEMENT via le format structuré imposé.`

export function userImport(texteManuel: string): string {
  return `Voici le texte extrait du manuel à analyser :\n\n${texteManuel}`
}

export function systemChat(prenom?: string): string {
  const nom = prenom?.trim() || ''
  const salut = nom
    ? `Tu t'adresses à ${nom}, enseignant(e) de CP, par son prénom, avec chaleur.`
    : `Tu t'adresses à un(e) enseignant(e) de CP avec chaleur.`
  return `Tu es l'assistant progression de l'application "Ma Progression CP".
${salut}
Tu aides à corriger une progression de lecture CP (sons, semaines, pages, mots).

Règles :
- Ton chaleureux, pédagogue, encourageant. Aucun jargon technique (ne dis jamais "JSON", "tableau de données", "tokens").
- Parle en "sons", "semaines", "pages".
- Applique la correction demandée à la progression fournie, puis renvoie la progression COMPLÈTE modifiée + une phrase d'explication courte et amicale.
- Si la demande est ambiguë, fais l'interprétation la plus probable et explique ce que tu as compris.
Réponds UNIQUEMENT via le format structuré imposé (champs: progression, reponse).`
}
```

- [ ] **Step 4: Lancer (passe)**

Run: `npx jest src/lib/ia/__tests__/prompts.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ia/prompts.ts src/lib/ia/__tests__/prompts.test.ts
git commit -m "feat(ia): prompts import (Opus) + chat personnalise (Sonnet)"
```

---

### Task 4 : Route serveur `api/ia-manuel` (import)

**Files:**
- Create: `src/app/api/ia-manuel/route.ts`

> Pas de test unitaire automatisé (appel API externe) — vérification manuelle end-to-end après la Task 6. La logique pure est déjà couverte (Tasks 2-3).

- [ ] **Step 1: Implémenter la route**

Create `src/app/api/ia-manuel/route.ts` :

```ts
import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_IMPORT } from '@/lib/ia/anthropic'
import { PROGRESSION_JSON_SCHEMA, normalizeProgression } from '@/lib/ia/schema'
import { SYSTEM_IMPORT, userImport } from '@/lib/ia/prompts'
// pdf-parse est CJS — import statique pour l'interop ESM (même pattern que parse-manuel-pdf)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    let texte = ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('pdf') as File | null
      const texteColle = (form.get('texte') as string | null) ?? ''
      if (file) {
        if (file.size > 30 * 1024 * 1024) {
          return NextResponse.json({ error: 'Fichier trop volumineux (max 30 Mo)' }, { status: 400 })
        }
        const data = await pdfParse(Buffer.from(await file.arrayBuffer()))
        texte = data.text ?? ''
      } else {
        texte = texteColle
      }
    } else {
      const body = await request.json()
      texte = typeof body.texte === 'string' ? body.texte : ''
    }

    texte = texte.trim()
    if (texte.length < 20) {
      return NextResponse.json({ error: 'Texte du manuel vide ou trop court.' }, { status: 400 })
    }

    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: MODELE_IMPORT,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_IMPORT,
      output_config: {
        format: {
          type: 'json_schema',
          schema: PROGRESSION_JSON_SCHEMA,
        },
      },
      messages: [{ role: 'user', content: userImport(texte) }],
    })

    // Récupère le bloc texte (JSON garanti par le schéma)
    const jsonBlock = message.content.find(b => b.type === 'text')
    const parsed = jsonBlock && 'text' in jsonBlock ? JSON.parse(jsonBlock.text) : { semaines: [] }
    const progression = normalizeProgression(parsed.semaines ?? [])

    if (progression.length === 0) {
      return NextResponse.json(
        { error: "L'IA n'a pas reconnu de progression. Essayez le sommaire en texte ou l'import CSV." },
        { status: 422 }
      )
    }
    return NextResponse.json({ progression })
  } catch (err) {
    console.error('ia-manuel error:', err)
    const msg = err instanceof Error && /ANTHROPIC_API_KEY/.test(err.message)
      ? 'Service IA non configuré (clé API manquante).'
      : "Erreur lors de l'analyse par l'IA. Réessayez ou utilisez l'import CSV."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur `src/app/api/ia-manuel/route.ts`. (Si `output_config`/`thinking` typent mal selon la version du SDK, consulter `typescript/claude-api/README.md` du skill claude-api et ajuster.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ia-manuel/route.ts
git commit -m "feat(ia): route api/ia-manuel (PDF/texte -> progression via Opus)"
```

---

### Task 5 : Route serveur `api/ia-chat` (corrections)

**Files:**
- Create: `src/app/api/ia-chat/route.ts`

- [ ] **Step 1: Implémenter la route**

Create `src/app/api/ia-chat/route.ts` :

```ts
import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_CHAT } from '@/lib/ia/anthropic'
import { normalizeProgression } from '@/lib/ia/schema'
import { systemChat } from '@/lib/ia/prompts'
import type { ProgressionSemaine } from '@/data/manuels'

export const maxDuration = 60

const CHAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    progression: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          numero: { type: 'integer' },
          graphemes: { type: 'array', items: { type: 'string' } },
          pages: { type: 'string' },
          mots_exemple: { type: 'array', items: { type: 'string' } },
        },
        required: ['numero', 'graphemes', 'pages', 'mots_exemple'],
      },
    },
    reponse: { type: 'string' },
  },
  required: ['progression', 'reponse'],
} as const

type ChatTurn = { role: 'user' | 'assistant'; content: string }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const progression = (body.progression ?? []) as ProgressionSemaine[]
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const prenom = typeof body.prenom === 'string' ? body.prenom : undefined
    const historique = (Array.isArray(body.historique) ? body.historique : []) as ChatTurn[]

    if (!message) {
      return NextResponse.json({ error: 'Message vide.' }, { status: 400 })
    }

    const client = getAnthropicClient()
    // On borne l'historique aux 10 derniers échanges (cf. design).
    const hist = historique.slice(-10).map(t => ({ role: t.role, content: t.content }))

    const result = await client.messages.create({
      model: MODELE_CHAT,
      max_tokens: 16000,
      system: [
        { type: 'text', text: systemChat(prenom), cache_control: { type: 'ephemeral' } },
        {
          type: 'text',
          text: `Progression actuelle :\n${JSON.stringify(progression)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      output_config: { format: { type: 'json_schema', schema: CHAT_SCHEMA } },
      messages: [...hist, { role: 'user', content: message }],
    })

    const block = result.content.find(b => b.type === 'text')
    const parsed = block && 'text' in block ? JSON.parse(block.text) : { progression, reponse: '' }
    return NextResponse.json({
      progression: normalizeProgression(parsed.progression ?? progression),
      reponse: typeof parsed.reponse === 'string' ? parsed.reponse : 'C’est fait !',
    })
  } catch (err) {
    console.error('ia-chat error:', err)
    const msg = err instanceof Error && /ANTHROPIC_API_KEY/.test(err.message)
      ? 'Service IA non configuré (clé API manquante).'
      : "Désolé, je n'ai pas réussi cette correction. Réessayez en reformulant."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur la route.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ia-chat/route.ts
git commit -m "feat(ia): route api/ia-chat (corrections conversationnelles via Sonnet)"
```

---

### Task 6 : Composant `IaImport` (tableau éditable + boîte de dialogue)

**Files:**
- Create: `src/components/setup/IaImport.tsx`

- [ ] **Step 1: Implémenter le composant**

Create `src/components/setup/IaImport.tsx` :

```tsx
'use client'
import { useState } from 'react'
import type { ProgressionSemaine } from '@/data/manuels'

type ChatTurn = { role: 'user' | 'assistant'; content: string }

export default function IaImport({
  prenom,
  onSelect,
}: {
  prenom?: string
  onSelect: (id: string, progression: ProgressionSemaine[]) => void
}) {
  const [texte, setTexte] = useState('')
  const [progression, setProgression] = useState<ProgressionSemaine[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatTurn[]>([])
  const [message, setMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  async function lancerImport(form: FormData) {
    setError(null); setLoading(true); setProgression(null)
    try {
      const res = await fetch('/api/ia-manuel', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Erreur')
      else {
        setProgression(data.progression)
        setChat([{ role: 'assistant', content: prenom
          ? `Bonjour ${prenom} ! J'ai préparé votre progression : ${data.progression.length} semaines. Dites-moi si quelque chose ne va pas 😊`
          : `J'ai préparé votre progression : ${data.progression.length} semaines.` }])
      }
    } catch { setError('Erreur réseau.') } finally { setLoading(false) }
  }

  function importPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const form = new FormData(); form.append('pdf', file); lancerImport(form)
  }

  function importTexte() {
    if (texte.trim().length < 20) { setError('Collez le sommaire (texte un peu plus long).'); return }
    const form = new FormData(); form.append('texte', texte); lancerImport(form)
  }

  async function envoyerCorrection() {
    const msg = message.trim(); if (!msg || !progression) return
    setMessage(''); setChatLoading(true)
    setChat(c => [...c, { role: 'user', content: msg }])
    try {
      const res = await fetch('/api/ia-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progression, message: msg, prenom, historique: chat }),
      })
      const data = await res.json()
      if (!res.ok) setChat(c => [...c, { role: 'assistant', content: data.error ?? 'Erreur' }])
      else { setProgression(data.progression); setChat(c => [...c, { role: 'assistant', content: data.reponse }]) }
    } catch { setChat(c => [...c, { role: 'assistant', content: 'Erreur réseau.' }]) }
    finally { setChatLoading(false) }
  }

  return (
    <div className="space-y-4">
      {!progression && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Déposez le PDF de votre manuel <strong>ou</strong> collez son sommaire. L&apos;IA reconstruit la progression — vous pourrez tout corriger ensuite.
          </p>
          <input type="file" accept=".pdf" onChange={importPdf} disabled={loading}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-violet-700 hover:file:bg-violet-100 file:cursor-pointer disabled:opacity-50" />
          <textarea value={texte} onChange={e => setTexte(e.target.value)} disabled={loading}
            placeholder="…ou collez ici le sommaire du manuel"
            className="w-full h-28 border border-gray-200 rounded-lg p-2 text-sm text-gray-900 bg-white" />
          <button onClick={importTexte} disabled={loading}
            className="w-full py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-semibold disabled:opacity-50">
            {loading ? 'Analyse en cours…' : '🤖 Analyser avec l’IA'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {progression && (
        <div className="space-y-4">
          {/* Tableau éditable */}
          <div className="max-h-72 overflow-y-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 sticky top-0">
                <tr className="text-left text-violet-800">
                  <th className="px-2 py-1 w-12">Sem.</th><th className="px-2 py-1">Sons</th>
                  <th className="px-2 py-1">Pages</th><th className="px-2 py-1">Mots</th>
                </tr>
              </thead>
              <tbody>
                {progression.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1 text-gray-500">{s.numero}</td>
                    <td className="px-2 py-1">
                      <input value={s.graphemes.join(' ')} onChange={e => {
                        const v = e.target.value.split(/\s+/).filter(Boolean)
                        setProgression(p => p!.map((x, j) => j === i ? { ...x, graphemes: v } : x))
                      }} className="w-full bg-white text-gray-900 rounded px-1 py-0.5 border border-gray-200" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={s.pages} onChange={e =>
                        setProgression(p => p!.map((x, j) => j === i ? { ...x, pages: e.target.value } : x))
                      } className="w-full bg-white text-gray-900 rounded px-1 py-0.5 border border-gray-200" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={s.mots_exemple.join(' ')} onChange={e => {
                        const v = e.target.value.split(/\s+/).filter(Boolean)
                        setProgression(p => p!.map((x, j) => j === i ? { ...x, mots_exemple: v } : x))
                      }} className="w-full bg-white text-gray-900 rounded px-1 py-0.5 border border-gray-200" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Boîte de dialogue */}
          <div className="border-2 border-violet-200 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 py-2 text-sm font-semibold">
              💜 Votre assistant progression
            </div>
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto bg-violet-50/40">
              {chat.map((t, i) => (
                <div key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
                  <span className={`inline-block rounded-2xl px-3 py-1.5 text-sm ${
                    t.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white border text-gray-800'}`}>
                    {t.role === 'assistant' && '🤖 '}{t.content}
                  </span>
                </div>
              ))}
              {chatLoading && <p className="text-xs text-violet-700">✍️ l’assistant réfléchit…</p>}
            </div>
            <div className="flex gap-2 p-2 border-t bg-white">
              <input value={message} onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && envoyerCorrection()}
                placeholder="Écrivez votre correction ici…"
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white" />
              <button onClick={envoyerCorrection} disabled={chatLoading}
                className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">→</button>
            </div>
          </div>

          <button onClick={() => onSelect('custom', progression)}
            className="w-full py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-semibold">
            ✅ Utiliser cette progression
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/IaImport.tsx
git commit -m "feat(ia): composant IaImport (tableau editable + boite de dialogue)"
```

---

### Task 7 : Brancher l'onglet « 🤖 Import IA » dans ManualSelector

**Files:**
- Modify: `src/components/setup/ManualSelector.tsx`

- [ ] **Step 1: Importer le composant**

Dans `src/components/setup/ManualSelector.tsx`, ajouter en haut (après les imports existants) :

```tsx
import IaImport from './IaImport'
```

- [ ] **Step 2: Étendre le type de mode et accepter le prénom**

Remplacer la ligne `const [importMode, setImportMode] = useState<'pdf' | 'csv'>('pdf')` par :

```tsx
const [importMode, setImportMode] = useState<'ia' | 'pdf' | 'csv'>('ia')
```

Et remplacer la signature du composant :

```tsx
export default function ManualSelector({
  onSelect,
  prenom,
}: {
  onSelect: (id: string, customProgression?: ProgressionSemaine[]) => void
  prenom?: string
}) {
```

Adapter aussi `switchMode` :

```tsx
function switchMode(mode: 'ia' | 'pdf' | 'csv') {
```

- [ ] **Step 3: Ajouter l'onglet IA dans le sélecteur de mode**

Remplacer `{(['pdf', 'csv'] as const).map(mode => (` par :

```tsx
{(['ia', 'pdf', 'csv'] as const).map(mode => (
```

Et le libellé interne `{mode === 'pdf' ? 'PDF (manuel numérique)' : 'CSV (tableur)'}` par :

```tsx
{mode === 'ia' ? '🤖 Import IA' : mode === 'pdf' ? 'PDF (regex)' : 'CSV (tableur)'}
```

- [ ] **Step 4: Rendre le bloc IA**

Juste avant `{/* Mode PDF */}`, insérer :

```tsx
{importMode === 'ia' && (
  <IaImport prenom={prenom} onSelect={(id, prog) => onSelect(id, prog)} />
)}
```

- [ ] **Step 5: Vérifier la compilation + build**

Run: `npx tsc --noEmit && npx next build`
Expected: `Compiled successfully`.

- [ ] **Step 6: Commit**

```bash
git add src/components/setup/ManualSelector.tsx
git commit -m "feat(ia): onglet Import IA dans ManualSelector"
```

---

### Task 8 : Câbler le prénom + vérification manuelle end-to-end + docs

**Files:**
- Modify: `src/app/(app)/setup/page.tsx` (passer `prenom` à `ManualSelector`)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Passer le prénom à ManualSelector**

Dans `src/app/(app)/setup/page.tsx`, le `ManualSelector` (ligne ~60) — si un prénom enseignant est disponible dans le contexte, le passer ; sinon, laisser `prenom` optionnel (le composant gère l'absence). Minimal acceptable :

```tsx
<ManualSelector prenom={undefined} onSelect={(manuelId, customProgression) => {
  setData(d => ({ ...d, manuelId, customProgression }))
  setStep(2)
}} />
```

(Amélioration ultérieure : récupérer le prénom réel de l'enseignant si stocké.)

- [ ] **Step 2: Configurer la clé en local**

Créer `.env.local` (NON commité — vérifier qu'il est dans `.gitignore`) :

```
ANTHROPIC_API_KEY=sk-ant-...
```

Run: `npm run dev`

- [ ] **Step 3: Vérification manuelle (import)**

Dans le navigateur (`/setup`), onglet « 🤖 Import IA » : coller un vrai sommaire CP (ou déposer un PDF).
Expected: un tableau éditable s'affiche avec des semaines/sons cohérents ; la boîte de dialogue salue l'utilisateur.

- [ ] **Step 4: Vérification manuelle (chat)**

Taper « décale tout d'une semaine ».
Expected: le tableau se met à jour (sons décalés) + une réponse amicale de l'assistant.

- [ ] **Step 5: Vérification manuelle (validation)**

Cliquer « ✅ Utiliser cette progression », terminer le wizard.
Expected: la classe se crée, le planning affiche la progression importée.

- [ ] **Step 6: Mettre à jour CLAUDE.md**

Dans la section « Import IA des manuels », remplacer « (PLANIFIÉ — design validé… » par « (IMPLÉMENTÉ — sous-système 1) » et lister les fichiers réels créés (`src/lib/ia/*`, `api/ia-manuel`, `api/ia-chat`, `IaImport.tsx`). Rappeler : variable `ANTHROPIC_API_KEY` à ajouter sur Vercel + redéployer.

- [ ] **Step 7: Lancer toute la suite de tests + commit final**

Run: `npm test`
Expected: tous les tests passent (anciens + nouveaux IA).

```bash
git add src/app/\(app\)/setup/page.tsx CLAUDE.md
git commit -m "feat(ia): cablage prenom + docs import IA (sous-systeme 1)"
```

---

## Étapes post-implémentation (hors code, par l'utilisateur)
1. Sur Vercel : ajouter la variable d'env **`ANTHROPIC_API_KEY`** (secrète) → redéployer (les vars serveur sont lues au runtime).
2. Sur console.anthropic.com : charger des crédits (ex. 5 $) + fixer un **plafond mensuel** (ex. 10 $) + alertes.
3. Tester en prod l'onglet « 🤖 Import IA ».

## Sous-système 2 (plan séparé à venir)
Génération de tableaux/bilans élèves avec **anonymisation des prénoms** (substitution `Élève N` côté serveur + réinjection). Indépendant de ce plan ; à brancher dans le suivi des élèves.
