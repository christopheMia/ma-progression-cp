# Méthodes par matière — UI dynamique (Plan 2/2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ouvrir les méthodes à n'importe quelle matière : supprimer les listes en dur (`MATIERES_METHODE`), permettre à l'enseignante d'ajouter une méthode pour toute matière via l'IA, de choisir les créneaux qu'elle alimente, et de voir le suivi/journal dynamiquement pour toutes les méthodes.

**Architecture:** Nouvelles server actions CRUD pour `methodes`. `TimetableGrid` reçoit `visible_journal` par créneau. `MethodesEditor` charge ses données depuis la DB (passées en props depuis la page). `semaine/[id]/page` charge toutes les méthodes dynamiquement. `StudentTracking` itère sur les méthodes dynamiques. `matieres.ts` (liste en dur) est supprimé.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase, TypeScript, React, Jest.

**Périmètre de CE plan :** UI dynamique et suppression des hardcodes. **Hors de ce plan (→ Vague 1) :** séances détaillées, LSU, multi-classes.

**Spec :** `docs/superpowers/specs/2026-06-25-methodes-par-matiere-design.md`
**Socle :** Plan 1 (`docs/superpowers/plans/2026-06-25-methodes-par-matiere-fondation.md`) — déjà exécuté sur la branche `feat/methodes-par-matiere`.

---

## Carte des fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `src/lib/actions/methodes.ts` | **Créer** | CRUD server actions : `getMethodes`, `createMethode`, `updateSuiviActif`, `lierCreneaux` |
| `src/components/TimetableGrid.tsx` | **Modifier** | Ajouter `visible_journal: boolean` au type `Creneau` + toggle par tranche |
| `src/lib/actions/parametres.ts` | **Modifier** | `updateEmploiDuTemps` : type local inclut `visible_journal` |
| `src/app/(app)/parametres/page.tsx` | **Modifier** | Charge methodes + edt complet, les passe à MethodesEditor et EmploiDuTempsGrille |
| `src/app/(app)/setup/page.tsx` | **Modifier** | Mapping TRAME_EDT_CP → ajouter `visible_journal: true` |
| `src/components/semaine/MatiereBlock.tsx` | **Modifier** | Accepter `matiere: string` (pas MatiereMethode), label/emoji dynamiques |
| `src/components/setup/IaImport.tsx` | **Modifier** | `matiereFixe?: string`, supprimer sélecteur `MATIERES_METHODE` |
| `src/components/parametres/MethodesEditor.tsx` | **Réécrire** | Dynamique : liste DB, ajouter méthode, IaImport par méthode, créneaux liés, suivi toggle |
| `src/app/(app)/semaine/[id]/page.tsx` | **Modifier** | Charge toutes les méthodes + progressions dynamiquement |
| `src/components/semaine/StudentTracking.tsx` | **Modifier** | `methodes` prop dynamique, supprimer MatiereMethode/LABELS/EMOJI |
| `src/lib/actions/progression-matiere.ts` | **Modifier** | Supprimer le check `isMatiereMethode` |
| `src/lib/matieres.ts` | **Supprimer** | Remplacé par actions dynamiques |
| `src/lib/__tests__/matieres.test.ts` | **Supprimer** | Tests devenus caducs |

---

### Task 1 : Server actions `methodes.ts`

**Files:**
- Create: `src/lib/actions/methodes.ts`

- [ ] **Step 1 : Créer le fichier**

Créer `src/lib/actions/methodes.ts` :

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Methode } from '@/types'

async function getClasse() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: classe } = await supabase
    .from('classes').select('id').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return classe ? { supabase, classeId: classe.id } : null
}

/** Retourne toutes les méthodes de la classe de l'utilisateur. */
export async function getMethodes(): Promise<Methode[]> {
  const ctx = await getClasse()
  if (!ctx) return []
  const { data } = await ctx.supabase
    .from('methodes').select('*').eq('class_id', ctx.classeId).order('created_at')
  return (data ?? []) as Methode[]
}

/**
 * Crée une méthode pour la matière donnée (ou renvoie l'existante si déjà créée).
 * Retourne l'id de la méthode.
 */
export async function createMethode(matiere: string): Promise<string> {
  const ctx = await getClasse()
  if (!ctx) throw new Error('Non connecté')
  const trimmed = matiere.trim()
  if (!trimmed) throw new Error('Matière vide')

  const { data: existing } = await ctx.supabase
    .from('methodes').select('id').eq('class_id', ctx.classeId).eq('matiere', trimmed)
    .limit(1).maybeSingle()
  if (existing) return existing.id

  const { data, error } = await ctx.supabase
    .from('methodes').insert({ class_id: ctx.classeId, matiere: trimmed })
    .select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'Erreur création méthode')
  revalidatePath('/parametres')
  return data.id
}

/** Bascule le suivi étoiles pour une méthode. */
export async function updateSuiviActif(methodeId: string, suivi_actif: boolean) {
  const ctx = await getClasse()
  if (!ctx) throw new Error('Non connecté')
  await ctx.supabase.from('methodes').update({ suivi_actif }).eq('id', methodeId)
  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/**
 * Relie les créneaux sélectionnés à une méthode et déliera les précédents.
 * creneauIds : ids des emploi_du_temps à relier à cette méthode.
 */
export async function lierCreneaux(methodeId: string, creneauIds: string[]) {
  const ctx = await getClasse()
  if (!ctx) throw new Error('Non connecté')
  // Délier les anciens créneaux de cette méthode
  await ctx.supabase.from('emploi_du_temps')
    .update({ methode_id: null }).eq('methode_id', methodeId)
  // Relier les nouveaux
  if (creneauIds.length > 0) {
    await ctx.supabase.from('emploi_du_temps')
      .update({ methode_id: methodeId }).in('id', creneauIds)
  }
  revalidatePath('/parametres')
  revalidatePath('/planning')
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/actions/methodes.ts
git commit -m "feat(methodes): server actions getMethodes / createMethode / updateSuiviActif / lierCreneaux"
```

---

### Task 2 : `TimetableGrid` + `visible_journal` + consumers

**Files:**
- Modify: `src/components/TimetableGrid.tsx`
- Modify: `src/lib/actions/parametres.ts` (type local Creneau)
- Modify: `src/app/(app)/parametres/page.tsx` (mapping EDT)
- Modify: `src/app/(app)/setup/page.tsx` (mapping TRAME_EDT_CP)

- [ ] **Step 1 : Mettre à jour le type `Creneau` dans TimetableGrid**

Dans `src/components/TimetableGrid.tsx`, remplacer :

```ts
export type Creneau = {
  jour: string; heure_debut: string; heure_fin: string
  matiere: string; couleur: string | null; type: 'cours' | 'routine'
}
```

par :

```ts
export type Creneau = {
  jour: string; heure_debut: string; heure_fin: string
  matiere: string; couleur: string | null; type: 'cours' | 'routine'
  visible_journal: boolean
}
```

- [ ] **Step 2 : Ajouter le toggle `visible_journal` par tranche dans TimetableGrid**

Dans `useState<Creneau[]>(initial)`, les créneaux portent désormais `visible_journal`. On doit initialiser le state correctement (les anciens callers sans `visible_journal` → défaut `true`).

Dans `TimetableGrid`, remplacer :

```ts
const [creneaux, setCreneaux] = useState<Creneau[]>(initial)
```

par :

```ts
const [creneaux, setCreneaux] = useState<Creneau[]>(
  initial.map(c => ({ visible_journal: true, ...c }))
)
```

Ajouter la fonction `toggleVisible` après `supprimerLigne` :

```ts
function toggleVisible(debut: string, fin: string) {
  setCreneaux(prev => {
    const isVisible = prev.some(
      c => c.heure_debut === debut && c.heure_fin === fin && c.visible_journal !== false
    )
    return prev.map(c =>
      c.heure_debut === debut && c.heure_fin === fin
        ? { ...c, visible_journal: !isVisible }
        : c
    )
  })
}
```

Ajouter le bouton de bascule dans la colonne Horaires, après le bouton `supprimer` :

```tsx
<button onClick={() => toggleVisible(debut, fin)}
  className={`text-[10px] hover:underline ${
    creneaux.some(c => c.heure_debut === debut && c.heure_fin === fin && c.visible_journal === false)
      ? 'text-gray-400' : 'text-violet-500'
  }`}>
  {creneaux.some(c => c.heure_debut === debut && c.heure_fin === fin && c.visible_journal === false)
    ? '👁️ masqué' : '👁️ visible'}
</button>
```

(L'ajouter dans le `<div className="flex gap-2 mt-1">` qui contient déjà le bouton `routine` et `supprimer`.)

- [ ] **Step 3 : Ajouter `visible_journal` dans `ajouterLigne`**

Remplacer dans `ajouterLigne` :

```ts
return [...prev, ...cols.map(jour => ({ jour, heure_debut: debut, heure_fin: fin, matiere: '', couleur: null, type: 'cours' as const }))]
```

par :

```ts
return [...prev, ...cols.map(jour => ({ jour, heure_debut: debut, heure_fin: fin, matiere: '', couleur: null, type: 'cours' as const, visible_journal: true }))]
```

- [ ] **Step 4 : Mettre à jour `setMatiere` pour préserver `visible_journal`**

Dans `setMatiere`, remplacer la ligne qui crée un nouveau créneau :

```ts
return [...prev, { jour, heure_debut: debut, heure_fin: fin, matiere, couleur, type: 'cours' }]
```

par :

```ts
return [...prev, { jour, heure_debut: debut, heure_fin: fin, matiere, couleur, type: 'cours', visible_journal: true }]
```

- [ ] **Step 5 : Mettre à jour le type local `Creneau` dans `parametres.ts`**

Dans `src/lib/actions/parametres.ts`, remplacer :

```ts
type Creneau = { jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur: string | null; type: 'cours' | 'routine' }
```

par :

```ts
type Creneau = { jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur: string | null; type: 'cours' | 'routine'; visible_journal: boolean }
```

(Le `...c` dans `updateEmploiDuTemps` propagera automatiquement `visible_journal` à Supabase.)

- [ ] **Step 6 : Passer `visible_journal` depuis `parametres/page.tsx`**

Dans `src/app/(app)/parametres/page.tsx`, remplacer le mapping EDT :

```tsx
<EmploiDuTempsGrille initial={(edt ?? []).map(c => ({
  jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
  matiere: c.matiere, couleur: c.couleur ?? null, type: (c.type ?? 'cours') as 'cours' | 'routine',
}))} />
```

par :

```tsx
<EmploiDuTempsGrille initial={(edt ?? []).map(c => ({
  jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
  matiere: c.matiere, couleur: c.couleur ?? null, type: (c.type ?? 'cours') as 'cours' | 'routine',
  visible_journal: (c.visible_journal ?? true) as boolean,
}))} />
```

- [ ] **Step 7 : Passer `visible_journal` depuis `setup/page.tsx`**

Dans `src/app/(app)/setup/page.tsx`, remplacer :

```tsx
initial={TRAME_EDT_CP.map(c => ({ jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin, matiere: c.matiere, couleur: c.couleur, type: c.type }))}
```

par :

```tsx
initial={TRAME_EDT_CP.map(c => ({ jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin, matiere: c.matiere, couleur: c.couleur, type: c.type, visible_journal: true }))}
```

- [ ] **Step 8 : Vérifier la compilation + tests**

Run: `npx tsc --noEmit && npm test`
Attendu : compilation OK, 47 tests au vert.

- [ ] **Step 9 : Commit**

```bash
git add src/components/TimetableGrid.tsx src/lib/actions/parametres.ts src/app/\(app\)/parametres/page.tsx src/app/\(app\)/setup/page.tsx
git commit -m "feat(edt): visible_journal par créneau dans TimetableGrid (toggle + persistence)"
```

---

### Task 3 : `MatiereBlock` — généraliser pour n'importe quelle matière

**Files:**
- Modify: `src/components/semaine/MatiereBlock.tsx`

- [ ] **Step 1 : Réécrire MatiereBlock**

Remplacer **tout** le contenu de `src/components/semaine/MatiereBlock.tsx` par :

```tsx
function labelMatiere(matiere: string): string {
  if (matiere === 'francais') return '📖 Français'
  if (matiere === 'maths') return '🔢 Maths'
  return '📋 ' + matiere.charAt(0).toUpperCase() + matiere.slice(1)
}

function accentMatiere(matiere: string): string {
  if (matiere === 'francais') return 'border-l-sky-400'
  if (matiere === 'maths') return 'border-l-emerald-400'
  return 'border-l-violet-400'
}

function itemLabel(matiere: string): string {
  if (matiere === 'francais') return 'Graphème'
  if (matiere === 'maths') return 'Notion'
  return 'Élément'
}

export default function MatiereBlock({
  matiere, items, pages, motsExemple,
}: {
  matiere: string
  items: string[]
  pages?: string | null
  motsExemple?: string[] | null
}) {
  const isMaths = matiere === 'maths'
  return (
    <div className={`bg-white border rounded-2xl p-5 space-y-2 shadow-sm border-l-4 ${accentMatiere(matiere)}`}>
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-700">{labelMatiere(matiere)}</h2>
        {pages && <span className="text-xs text-gray-400">{pages}</span>}
      </div>
      {items.length > 0 ? (
        <p className="text-lg font-semibold text-violet-700">
          {itemLabel(matiere)}{items.length > 1 ? 's' : ''} : {items.map(g => `"${g}"`).join(isMaths ? ', ' : ' et ')}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">Révisions / pas de nouveauté cette semaine.</p>
      )}
      {motsExemple && motsExemple.length > 0 && (
        <p className="text-sm text-gray-500">{isMaths ? 'Exemples' : 'Mots exemples'} : {motsExemple.join(', ')}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Attendu : aucune erreur. (La page qui appelle MatiereBlock passe encore `matiere="francais"` pour l'instant — c'est OK, `string` accepte `"francais"`.)

- [ ] **Step 3 : Commit**

```bash
git add src/components/semaine/MatiereBlock.tsx
git commit -m "feat(semaine): MatiereBlock générique (n'importe quelle matière, emoji/label dynamiques)"
```

---

### Task 4 : `IaImport` — matière libre (supprimer `MatiereMethode`)

**Files:**
- Modify: `src/components/setup/IaImport.tsx`

- [ ] **Step 1 : Mettre à jour les imports et signatures**

Dans `src/components/setup/IaImport.tsx`, remplacer :

```ts
import { MATIERES_METHODE, LABELS_MATIERE, type MatiereMethode } from '@/lib/matieres'
```

par :

```ts
// (pas d'import matieres)
```

Remplacer les props :

```ts
export default function IaImport({
  prenom,
  matiereFixe,
  onSelect,
  onSave,
}: {
  prenom?: string
  matiereFixe?: MatiereMethode
  onSelect?: (id: string, progression: ProgressionSemaine[]) => void
  onSave?: (matiere: MatiereMethode, progression: ProgressionSemaine[]) => Promise<void> | void
})
```

par :

```ts
export default function IaImport({
  prenom,
  matiereFixe,
  onSelect,
  onSave,
}: {
  prenom?: string
  matiereFixe?: string
  onSelect?: (id: string, progression: ProgressionSemaine[]) => void
  onSave?: (matiere: string, progression: ProgressionSemaine[]) => Promise<void> | void
})
```

- [ ] **Step 2 : Mettre à jour le state matière**

Remplacer :

```ts
const [matiere, setMatiere] = useState<MatiereMethode>(matiereFixe ?? 'francais')
```

par :

```ts
const [matiere, setMatiere] = useState<string>(matiereFixe ?? '')
```

- [ ] **Step 3 : Remplacer le sélecteur par un champ texte (quand pas de matiereFixe)**

Remplacer le bloc `{!matiereFixe && (...)}` :

```tsx
{!matiereFixe && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Quelle méthode importes-tu ?</label>
    <select value={matiere} onChange={e => setMatiere(e.target.value as MatiereMethode)} disabled={loading}
      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white">
      {MATIERES_METHODE.map(m => (
        <option key={m} value={m}>{LABELS_MATIERE[m]}</option>
      ))}
    </select>
  </div>
)}
```

par :

```tsx
{!matiereFixe && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Quelle matière importes-tu ?</label>
    <input
      value={matiere}
      onChange={e => setMatiere(e.target.value)}
      disabled={loading}
      placeholder="Ex : Anglais, EMC, Sciences…"
      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white"
    />
  </div>
)}
```

- [ ] **Step 4 : Corriger la description du récap**

Remplacer :

```tsx
<p className="text-sm text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
  {progression.length} semaines · {totalNotions} {matiere === 'maths' ? 'notions' : 'sons'} répartis
</p>
```

par :

```tsx
<p className="text-sm text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
  {progression.length} semaines · {totalNotions} éléments répartis{matiere ? ` (${matiere})` : ''}
</p>
```

- [ ] **Step 5 : Corriger les libellés du tableau**

Remplacer dans les `<th>` du tableau :

```tsx
<th className="px-2 py-1">{matiere === 'maths' ? 'Notions' : 'Sons'}</th>
```

par :

```tsx
<th className="px-2 py-1">Éléments</th>
```

Et dans `<td>` (colonne sons/notions) :

```tsx
<th className="px-2 py-1">{matiere === 'maths' ? 'Notions' : 'Sons'}</th>
```

par :

```tsx
<th className="px-2 py-1">Éléments</th>
```

(Il n'y en a qu'un — c'est dans le `<thead>`.)

- [ ] **Step 6 : Vérifier la compilation + tests**

Run: `npx tsc --noEmit && npm test`
Attendu : compilation OK, 47 tests au vert.

- [ ] **Step 7 : Commit**

```bash
git add src/components/setup/IaImport.tsx
git commit -m "feat(import): IaImport accepte n'importe quelle matière (free text)"
```

---

### Task 5 : `MethodesEditor` — dynamique

**Files:**
- Modify: `src/app/(app)/parametres/page.tsx` (charger methodes + edt avec methode_id)
- Rewrite: `src/components/parametres/MethodesEditor.tsx`

- [ ] **Step 1 : Charger les méthodes et l'EDT dans `parametres/page.tsx`**

Ajouter les imports en haut de `src/app/(app)/parametres/page.tsx` :

```ts
import type { Methode } from '@/types'
```

Après le chargement de `edt`, ajouter :

```ts
const { data: methodes } = await supabase
  .from('methodes').select('*').eq('class_id', classe.id).order('created_at')
```

Et adapter l'appel à `MethodesEditor` :

```tsx
<Section titre="📚 Mes méthodes">
  <MethodesEditor
    prenom={(classe.prenom_enseignant ?? '').trim() || undefined}
    methodes={(methodes ?? []) as Methode[]}
    creneaux={(edt ?? []).map(c => ({ id: c.id, matiere: c.matiere, jour: c.jour, methode_id: c.methode_id ?? null }))}
  />
</Section>
```

Adapter aussi le titre de la section (supprimer la mention « Français + Maths ») — remplacer `"📚 Mes méthodes (Français + Maths)"` par `"📚 Mes méthodes"`.

- [ ] **Step 2 : Réécrire `MethodesEditor.tsx`**

Remplacer **tout** le contenu de `src/components/parametres/MethodesEditor.tsx` par :

```tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import IaImport from '@/components/setup/IaImport'
import { enregistrerProgressionMatiere } from '@/lib/actions/progression-matiere'
import { createMethode, updateSuiviActif, lierCreneaux } from '@/lib/actions/methodes'
import type { Methode } from '@/types'
import type { ProgressionSemaine } from '@/data/manuels'

type CreneauInfo = { id: string; matiere: string; jour: string; methode_id: string | null }

export default function MethodesEditor({
  prenom,
  methodes,
  creneaux,
}: {
  prenom?: string
  methodes: Methode[]
  creneaux: CreneauInfo[]
}) {
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [lienOuvert, setLienOuvert] = useState<string | null>(null)
  const [nouveauNom, setNouveauNom] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Sélection des créneaux (state local avant sauvegarde)
  const [creneauxSelectionnes, setCreneauxSelectionnes] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {}
    for (const m of methodes) {
      init[m.id] = new Set(creneaux.filter(c => c.methode_id === m.id).map(c => c.id))
    }
    return init
  })

  function getSelectionMethode(methodeId: string): Set<string> {
    return creneauxSelectionnes[methodeId] ?? new Set(creneaux.filter(c => c.methode_id === methodeId).map(c => c.id))
  }

  function toggleCreneau(methodeId: string, creneauId: string) {
    setCreneauxSelectionnes(prev => {
      const current = new Set(prev[methodeId] ?? creneaux.filter(c => c.methode_id === methodeId).map(c => c.id))
      if (current.has(creneauId)) current.delete(creneauId)
      else current.add(creneauId)
      return { ...prev, [methodeId]: current }
    })
  }

  async function saveImport(methodeId: string, matiere: string, progression: ProgressionSemaine[]) {
    await enregistrerProgressionMatiere(matiere, progression)
    setMessage(`${matiere} enregistré ✓`)
    setOuverte(null)
    router.refresh()
  }

  function saveLien(methodeId: string) {
    startTransition(async () => {
      await lierCreneaux(methodeId, Array.from(getSelectionMethode(methodeId)))
      setMessage('Créneaux liés ✓')
      setLienOuvert(null)
      router.refresh()
    })
  }

  function toggleSuivi(methodeId: string, current: boolean) {
    startTransition(async () => {
      await updateSuiviActif(methodeId, !current)
      router.refresh()
    })
  }

  async function ajouterMethode() {
    const nom = nouveauNom.trim()
    if (!nom) return
    await createMethode(nom)
    setNouveauNom('')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Importe ou corrige chaque méthode séparément. Réimporter une matière ne touche pas les autres, ni le suivi des élèves.
      </p>
      {message && <p className="text-sm text-green-600">{message}</p>}

      {methodes.map(m => {
        const selection = getSelectionMethode(m.id)
        const creneauxLies = creneaux.filter(c => selection.has(c.id))
        const labelMethode = m.matiere === 'francais' ? 'Français' : m.matiere === 'maths' ? 'Maths' : m.matiere.charAt(0).toUpperCase() + m.matiere.slice(1)

        return (
          <div key={m.id} className="border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-gray-700">{labelMethode}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={m.suivi_actif}
                    onChange={() => toggleSuivi(m.id, m.suivi_actif)}
                    className="accent-violet-600"
                  />
                  📊 Suivre les acquis
                </label>
                <button
                  onClick={() => setLienOuvert(lienOuvert === m.id ? null : m.id)}
                  className="text-xs border border-gray-300 text-gray-600 rounded-lg px-2 py-1 hover:bg-gray-50">
                  {creneauxLies.length > 0 ? `🔗 ${creneauxLies.length} créneau${creneauxLies.length > 1 ? 'x' : ''}` : '🔗 Lier des créneaux'}
                </button>
                <button
                  onClick={() => { setMessage(null); setOuverte(ouverte === m.id ? null : m.id) }}
                  className="text-sm border border-violet-300 text-violet-700 rounded-lg px-3 py-1.5 hover:bg-violet-50">
                  {ouverte === m.id ? 'Fermer' : '🤖 Importer / corriger via l'IA'}
                </button>
              </div>
            </div>

            {lienOuvert === m.id && (
              <div className="border-t pt-2 space-y-2">
                <p className="text-xs text-gray-500">Coche les créneaux de ton EDT alimentés par cette méthode :</p>
                <div className="grid grid-cols-2 gap-1">
                  {creneaux.map(c => (
                    <label key={c.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selection.has(c.id)}
                        onChange={() => toggleCreneau(m.id, c.id)}
                        className="accent-violet-600"
                      />
                      <span className="text-gray-700">{c.jour} — {c.matiere}</span>
                    </label>
                  ))}
                  {creneaux.length === 0 && (
                    <p className="text-xs text-gray-400 col-span-2">Aucun créneau dans l'emploi du temps.</p>
                  )}
                </div>
                <button
                  onClick={() => saveLien(m.id)}
                  disabled={isPending}
                  className="text-sm bg-violet-600 text-white rounded-lg px-3 py-1.5 hover:bg-violet-700 disabled:opacity-50">
                  {isPending ? 'Enregistrement…' : '✅ Enregistrer les créneaux liés'}
                </button>
              </div>
            )}

            {ouverte === m.id && (
              <div className="mt-2">
                <IaImport prenom={prenom} matiereFixe={m.matiere} onSave={(matiere, prog) => saveImport(m.id, matiere, prog)} />
              </div>
            )}
          </div>
        )
      })}

      <div className="border border-dashed border-violet-300 rounded-xl p-3 space-y-2">
        <p className="text-sm font-medium text-gray-700">+ Ajouter une méthode</p>
        <div className="flex gap-2">
          <input
            value={nouveauNom}
            onChange={e => setNouveauNom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ajouterMethode()}
            placeholder="Ex : Anglais, EMC, Sciences…"
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white"
          />
          <button
            onClick={ajouterMethode}
            disabled={!nouveauNom.trim()}
            className="text-sm border border-violet-300 text-violet-700 rounded-lg px-3 py-1.5 hover:bg-violet-50 disabled:opacity-40">
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Vérifier la compilation + tests**

Run: `npx tsc --noEmit && npm test`
Attendu : compilation OK, 47 tests au vert.

- [ ] **Step 4 : Commit**

```bash
git add src/components/parametres/MethodesEditor.tsx src/app/\(app\)/parametres/page.tsx
git commit -m "feat(parametres): MethodesEditor dynamique (DB) + ajout méthode + liaisons créneaux + suivi toggle"
```

---

### Task 6 : `semaine/[id]/page.tsx` + `StudentTracking` — méthodes dynamiques

**Files:**
- Modify: `src/app/(app)/semaine/[id]/page.tsx`
- Modify: `src/components/semaine/StudentTracking.tsx`

- [ ] **Step 1 : Réécrire `semaine/[id]/page.tsx` pour charger toutes les méthodes**

Remplacer **tout** le contenu de `src/app/(app)/semaine/[id]/page.tsx` par :

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import MatiereBlock from '@/components/semaine/MatiereBlock'
import EdmBlock from '@/components/semaine/EdmBlock'
import StudentTracking from '@/components/semaine/StudentTracking'
import CahierJournalEditor from '@/components/semaine/CahierJournalEditor'
import PrintButton from '@/components/PrintButton'

export default async function SemainePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: semaine } = await supabase.from('semaines').select('*').eq('id', id).single()
  if (!semaine) redirect('/planning')

  const [{ data: eleves }, { data: acquisitions }, { data: appreciations }, { data: progression }, { data: methodesList }] = await Promise.all([
    supabase.from('eleves').select('*').eq('class_id', semaine.class_id).order('ordre'),
    supabase.from('acquisitions').select('*').eq('semaine_id', id),
    supabase.from('appreciations').select('*').eq('semaine_id', id),
    supabase.from('progression').select('*').eq('class_id', semaine.class_id).eq('numero', semaine.numero),
    supabase.from('methodes').select('id, matiere, suivi_actif').eq('class_id', semaine.class_id).order('created_at'),
  ])

  // Construit la liste des méthodes pour StudentTracking (uniquement suivi_actif)
  const methodesPourSuivi = (methodesList ?? []).map(m => {
    const prog = progression?.find(p => p.methode_id === m.id)
    return {
      methode_id: m.id,
      matiere: m.matiere,
      suivi_actif: m.suivi_actif as boolean,
      items: (prog?.items as string[]) ?? (m.matiere === 'francais' ? (semaine.graphemes as string[]) : []),
    }
  })

  const dateFormatee = format(new Date(semaine.date_debut), 'd MMMM yyyy', { locale: fr })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-violet-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Semaine {semaine.numero} — {dateFormatee}</h1>
        <div className="ml-auto">
          <PrintButton label="🖨️ Imprimer la fiche" />
        </div>
      </div>

      {(methodesList ?? []).map(m => {
        const prog = progression?.find(p => p.methode_id === m.id)
        const items = (prog?.items as string[]) ?? (m.matiere === 'francais' ? (semaine.graphemes as string[]) : [])
        const pages = (prog?.pages as string | null) ?? (m.matiere === 'francais' ? semaine.manuel_pages : null)
        const motsExemple = (prog?.mots_exemple as string[] | null) ?? (m.matiere === 'francais' ? semaine.mots_exemple : null)
        if (items.length === 0 && !prog) return null
        return (
          <MatiereBlock key={m.id} matiere={m.matiere} items={items} pages={pages} motsExemple={motsExemple} />
        )
      })}

      <EdmBlock semaine={semaine} />
      <StudentTracking
        semaine={semaine}
        eleves={eleves ?? []}
        acquisitions={acquisitions ?? []}
        appreciations={appreciations ?? []}
        methodes={methodesPourSuivi}
      />
      <CahierJournalEditor
        semaineId={semaine.id}
        numeroSemaine={semaine.numero}
        francais={(progression?.find(p => p.matiere === 'francais')?.items as string[]) ?? []}
        maths={(progression?.find(p => p.matiere === 'maths')?.items as string[]) ?? []}
      />
    </div>
  )
}
```

- [ ] **Step 2 : Mettre à jour `StudentTracking.tsx` — méthodes dynamiques**

Dans `src/components/semaine/StudentTracking.tsx`, remplacer :

```ts
import { LABELS_MATIERE, type MatiereMethode } from '@/lib/matieres'

type ApprState = { statut: string | null; commentaire: string }
type Methode = { matiere: MatiereMethode; items: string[] }

const EMOJI_MATIERE: Record<MatiereMethode, string> = { francais: '📖', maths: '🔢' }
```

par :

```ts
type ApprState = { statut: string | null; commentaire: string }
type Methode = { methode_id: string; matiere: string; items: string[]; suivi_actif: boolean }

function emojiMatiere(m: string) { return m === 'francais' ? '📖' : m === 'maths' ? '🔢' : '📋' }
function labelMatiere(m: string) { return m === 'francais' ? 'Français' : m === 'maths' ? 'Maths' : m.charAt(0).toUpperCase() + m.slice(1) }
```

Mettre à jour la signature du composant :

```ts
export default function StudentTracking({ semaine, eleves, acquisitions, appreciations, methodes }: {
  semaine: Semaine
  eleves: Eleve[]
  acquisitions: Acquisition[]
  appreciations: Appreciation[]
  methodes: Methode[]
})
```

(Pas de changement dans la signature elle-même, juste le type local `Methode` qui change.)

Mettre à jour `generateBilan` :

```ts
async function generateBilan(eleve: Eleve, matiere: string, items: string[]) {
```

Mettre à jour `exportWord` :

```ts
function exportWord(matiere: string, items: string[]) {
```

Mettre à jour le rendu : remplacer `{methodes.map(({ matiere, items }) => (` par `{methodes.filter(m => m.suivi_actif).map(({ matiere, items }) => (`.

Remplacer dans le titre de section :

```tsx
<h3 className="font-bold text-violet-700">{EMOJI_MATIERE[matiere]} {LABELS_MATIERE[matiere]}</h3>
```

par :

```tsx
<h3 className="font-bold text-violet-700">{emojiMatiere(matiere)} {labelMatiere(matiere)}</h3>
```

- [ ] **Step 3 : Vérifier la compilation + tests**

Run: `npx tsc --noEmit && npm test`
Attendu : compilation OK, 47 tests au vert.

- [ ] **Step 4 : Commit**

```bash
git add src/app/\(app\)/semaine/\[id\]/page.tsx src/components/semaine/StudentTracking.tsx
git commit -m "feat(semaine): méthodes dynamiques dans la fiche semaine et le suivi élèves"
```

---

### Task 7 : Supprimer `matieres.ts` + nettoyer les imports restants

**Files:**
- Delete: `src/lib/matieres.ts`
- Delete: `src/lib/__tests__/matieres.test.ts`
- Modify: `src/lib/actions/progression-matiere.ts`

- [ ] **Step 1 : Supprimer `matieres.ts` et ses tests**

```bash
rm src/lib/matieres.ts
rm src/lib/__tests__/matieres.test.ts
```

- [ ] **Step 2 : Supprimer le check `isMatiereMethode` dans `progression-matiere.ts`**

Dans `src/lib/actions/progression-matiere.ts`, supprimer la ligne :

```ts
import { isMatiereMethode } from '@/lib/matieres'
```

Et supprimer la ligne :

```ts
if (!isMatiereMethode(matiere)) throw new Error('Matière inconnue')
```

- [ ] **Step 3 : Vérifier qu'aucun fichier n'importe encore `matieres`**

Run: `grep -r "from '@/lib/matieres'" src/`
Attendu : aucun résultat.

- [ ] **Step 4 : Vérifier la compilation + tests**

Run: `npx tsc --noEmit && npm test`
Attendu : compilation OK, **46 tests** au vert (le fichier `matieres.test.ts` est supprimé, donc 1 suite de moins).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "refactor: supprimer matieres.ts (liste en dur remplacée par la table methodes)"
```

---

### Task 8 : Build final + smoke test

- [ ] **Step 1 : Build de production**

Run: `npm run build`
Attendu : `Compiled successfully`, aucune erreur de type ou de lint bloquant.

- [ ] **Step 2 : Smoke test**

`npm run dev` → se connecter avec le compte de Cécile en local (`.env.local` pointant vers la prod ou un projet de test avec données).

1. **Paramètres → Mes méthodes** : les méthodes Français + Maths s'affichent. Toggle « 📊 Suivre les acquis » fonctionne. Clic « 🔗 Lier des créneaux » affiche les créneaux de l'EDT. Cochage + Enregistrer fonctionne.
2. **Paramètres → Mes méthodes → Ajouter** : saisir « Anglais » → bouton « Ajouter » → la méthode Anglais apparaît.
3. **Paramètres → EDT** : toggle 👁️ visible/masqué sur un créneau → Enregistrer → vérifier en DB via Supabase que `visible_journal` a changé.
4. **Fiche semaine** : ouvrir une semaine → les blocs MatiereBlock s'affichent pour chaque méthode ayant une progression. Le suivi étoiles n'affiche que les méthodes `suivi_actif = true`.
5. **Cahier journal d'une fiche semaine** : les créneaux reliés à une méthode ont leur déroulement pré-rempli ; les créneaux masqués (`visible_journal = false`) n'apparaissent pas.

- [ ] **Step 3 : Push de la branche**

```bash
git push -u origin feat/methodes-par-matiere
```

---

## Ce que ce plan NE fait PAS (→ Vague 1)

- **Séances détaillées** (bouton « ✨ Créer / développer » = fiche de prép complète par créneau) — nécessite une nouvelle route IA.
- **Multi-classes** (un compte, plusieurs classes) — architecture RLS déjà prête, manque l'UI de sélection.
- **LSU / compétences** — bloc complet à concevoir.
- **Maternelle** — modèle différent (domaines de compétences, pas 36 semaines).
- **Partage de progressions vérifiées** — réseau entre enseignantes.

## Auto-revue

**Spec coverage :**
- ✅ Lien méthode↔créneau par sélection (Task 5 MethodesEditor, `lierCreneaux`)
- ✅ Modèle souple : une méthode → plusieurs créneaux cochés (checkbox dans MethodesEditor)
- ✅ Suivi élèves opt-in par méthode (Task 5 toggle + Task 6 `filter(m => m.suivi_actif)`)
- ✅ Cahier journal = toutes les matières + masquables (Task 2 `visible_journal`, Plan 1 avait déjà le filtre)
- ✅ Périmètre CP→CM2 : aucune restriction de niveau dans le code
- ✅ `MATIERES_METHODE` et `matiereMethode()` supprimés (Task 7)
- ✅ Build propre + tests verts vérifié à chaque task

**Type consistency :**
- `Methode` dans `@/types` = `{ id, class_id, matiere, manuel, niveau, suivi_actif }` (Plan 1)
- `Methode` local dans `StudentTracking` = `{ methode_id, matiere, items, suivi_actif }` (Task 6)
- `CreneauInfo` dans `MethodesEditor` = `{ id, matiere, jour, methode_id }` (Task 5)
- `lierCreneaux(methodeId, creneauIds[])` → consistant partout
