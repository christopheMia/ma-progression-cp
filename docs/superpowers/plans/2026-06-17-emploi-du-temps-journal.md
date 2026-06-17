# Emploi du temps (grille pré-remplie) + Cahier journal IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pré-remplir l'emploi du temps de Cécile depuis sa vraie trame (modifiable en grille) et générer un cahier journal 3 colonnes par journée que l'IA amorce matière par matière, avec un garde-fou de crédit IA.

**Architecture :** L'`emploi_du_temps` (table existante) gagne `couleur` + `type` ; une constante `TRAME_EDT_CP` fournit l'EDT par défaut, pré-rempli au setup et rechargeable. Un éditeur en grille remplace les deux éditeurs liste actuels. Le `cahier_journal` (jsonb existant) passe à un format 3 colonnes alimenté depuis `emploi_du_temps` + la table `progression` (multi-méthodes), avec une route `api/ia-journal` (Sonnet) qui amorce chaque créneau. Toutes les routes IA détectent l'épuisement de crédit et accumulent l'usage pour une jauge de budget estimée.

**Tech Stack :** Next.js 16, React 19, Supabase (Postgres + RLS), Anthropic SDK (`claude-sonnet-4-6`), Jest + ts-jest, Tailwind v4, date-fns.

**Spec :** `docs/superpowers/specs/2026-06-17-emploi-du-temps-journal-design.md`

---

## ⚠️ Prérequis

**La Phase B (cahier journal) lit la table `progression(class_id, matiere, numero, items[], pages, mots_exemple)` créée par le chantier multi-méthodes** (`docs/superpowers/plans/2026-06-16-multi-methodes.md`). Exécuter ce plan **après** le plan multi-méthodes. Les Phases A (emploi du temps) et C (crédit) n'ont aucune dépendance et peuvent être exécutées avant.

**Convention de test :** `npm test` (Jest). Test ciblé : `npx jest <chemin> -t "<nom>"`. Build : `npx next build`.

**Migrations Supabase** appliquées en prod via MCP Supabase / dashboard (le projet n'a pas de CLI Supabase locale).

---

## Phase A — Emploi du temps : grille pré-remplie et modifiable

### Task 1: Migration SQL `005` (colonnes `couleur` + `type`) + types

**Files:**
- Create: `supabase/migrations/005_emploi_du_temps_grille.sql`
- Modify: `src/types/index.ts:39-47` (type `CreneauHoraire`)

- [ ] **Step 1: Écrire la migration**

```sql
-- supabase/migrations/005_emploi_du_temps_grille.sql
-- Grille d'emploi du temps : couleur par case + distinction cours / routine.
alter table emploi_du_temps add column couleur text;
alter table emploi_du_temps add column type text not null default 'cours';
-- Les créneaux existants restent 'cours' (valeur par défaut), couleur nulle.
```

- [ ] **Step 2: Relire la migration (lint visuel)**

`emploi_du_temps` existe (créée en `001_schema.sql`). Les deux colonnes sont ajoutées sans contrainte cassante ; `type` a un défaut pour ne pas bloquer les lignes existantes.

- [ ] **Step 3: Ajouter `couleur` et `type` au type `CreneauHoraire`**

Dans `src/types/index.ts`, remplacer le type `CreneauHoraire` (lignes 39-47) par :

```typescript
export type CreneauHoraire = {
  id: string
  class_id: string
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi'
  heure_debut: string
  heure_fin: string
  matiere: string
  ordre: number
  couleur: string | null
  type: 'cours' | 'routine'
}
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: pas de nouvelle erreur (les usages actuels de `CreneauHoraire` n'utilisent pas encore `couleur`/`type`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_emploi_du_temps_grille.sql src/types/index.ts
git commit -m "feat(db): emploi_du_temps gagne couleur + type (cours/routine)"
```

---

### Task 2: Palette de couleurs + constante `TRAME_EDT_CP`

**Files:**
- Create: `src/data/trame-edt.ts`
- Create: `src/data/__tests__/trame-edt.test.ts`

- [ ] **Step 1: Écrire le test**

```typescript
// src/data/__tests__/trame-edt.test.ts
import { TRAME_EDT_CP, couleurMatiere } from '../trame-edt'

describe('TRAME_EDT_CP', () => {
  test('contient des créneaux pour les 4 jours (pas de mercredi)', () => {
    const jours = new Set(TRAME_EDT_CP.map(c => c.jour))
    expect([...jours].sort()).toEqual(['jeudi', 'lundi', 'mardi', 'vendredi'])
  })

  test('chaque créneau a un type cours ou routine', () => {
    expect(TRAME_EDT_CP.every(c => c.type === 'cours' || c.type === 'routine')).toBe(true)
  })

  test('les lignes Accueil / Récréation / Pause sont des routines', () => {
    const accueil = TRAME_EDT_CP.find(c => c.matiere.startsWith('Accueil'))
    expect(accueil?.type).toBe('routine')
  })

  test('couleurMatiere range les maths en rose et l’EPS en jaune', () => {
    expect(couleurMatiere('Mathématiques')).toBe('#fbcfe8')
    expect(couleurMatiere('EPS')).toBe('#fef08a')
    expect(couleurMatiere('Histoire géographie')).toBeNull()
  })

  test('le créneau Mathématiques 10h30-11h30 existe pour lundi', () => {
    const m = TRAME_EDT_CP.find(c =>
      c.jour === 'lundi' && c.heure_debut === '10:30' && c.matiere === 'Mathématiques')
    expect(m).toBeTruthy()
    expect(m?.couleur).toBe('#fbcfe8')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/__tests__/trame-edt.test.ts`
Expected: FAIL (`Cannot find module '../trame-edt'`).

- [ ] **Step 3: Implémenter la palette + la trame**

```typescript
// src/data/trame-edt.ts

/** Code couleur par défaut d'une matière (repère visuel pour l'enseignant). */
export function couleurMatiere(matiere: string): string | null {
  const m = matiere.toLowerCase()
  if (m.includes('graphème') || m.includes('graphe') || m.includes('écriture') ||
      m.includes('ecriture') || m.includes('phono') || m.includes('vocabulaire') ||
      m.includes('lecture-écriture') || m.includes('lecture-ecriture')) return '#dbeafe' // bleu
  if (m.includes('math') || m.includes('calcul')) return '#fbcfe8' // rose
  if (m.includes('arts')) return '#ddd6fe' // violet
  if (m.includes('anglais')) return '#fed7aa' // orange
  if (m.includes('eps')) return '#fef08a' // jaune
  return null
}

type LigneTrame = {
  debut: string
  fin: string
  type: 'cours' | 'routine'
  /** Même contenu sur les 4 jours. */
  commun?: string
  /** Contenu différent par jour (ordre : lundi, mardi, jeudi, vendredi). */
  parJour?: [string, string, string, string]
}

const JOURS_TRAME = ['lundi', 'mardi', 'jeudi', 'vendredi'] as const
const M = 'Mathématiques : numération, grandeurs et mesures, géométrie, organisation et gestion des données'

const LIGNES: LigneTrame[] = [
  { debut: '08:20', fin: '08:30', type: 'routine', commun: 'Accueil dans la cour' },
  { debut: '08:30', fin: '08:45', type: 'routine', commun: 'Rituels du jour, appel…' },
  { debut: '08:45', fin: '09:15', type: 'cours', commun: 'Appropriation des graphèmes' },
  { debut: '09:15', fin: '09:45', type: 'cours', parJour: ['Écriture', 'Phonologie', 'Écriture', 'Phonologie'] },
  { debut: '09:45', fin: '10:00', type: 'cours', parJour: ['Vocabulaire', 'Lecture-écriture', 'Vocabulaire', 'Lecture-écriture'] },
  { debut: '10:00', fin: '10:15', type: 'routine', commun: 'Récréation' },
  { debut: '10:15', fin: '10:30', type: 'cours', commun: 'Calcul mental' },
  { debut: '10:30', fin: '11:30', type: 'cours', commun: 'Mathématiques' },
  { debut: '11:30', fin: '13:20', type: 'routine', commun: 'Pause déjeuner / APC' },
  { debut: '13:20', fin: '13:30', type: 'routine', commun: 'Accueil dans la cour' },
  { debut: '13:30', fin: '13:45', type: 'cours', commun: 'Chut je lis' },
  { debut: '13:45', fin: '14:15', type: 'cours', parJour: ['Lecture compréhension', "Production d'écrits", 'Lecture compréhension', "Production d'écrits"] },
  { debut: '14:15', fin: '14:45', type: 'cours', parJour: ['Histoire géographie', 'Arts visuels', 'Sciences et technologie', 'Anglais'] },
  { debut: '14:45', fin: '15:00', type: 'cours', parJour: ['Écriture', 'Vocabulaire', 'Écriture', 'Vocabulaire'] },
  { debut: '15:00', fin: '15:15', type: 'routine', commun: 'Récréation' },
  { debut: '15:15', fin: '15:45', type: 'cours', parJour: ['EPS', 'Anglais', 'EPS', 'Arts visuels'] },
  { debut: '15:45', fin: '16:15', type: 'cours', parJour: ['EPS', 'EMC', 'EPS', 'EMC'] },
  { debut: '16:15', fin: '16:30', type: 'routine', parJour: ['Bilan de la journée, devoirs, cartable', 'Bilan de la journée, cartable', 'Bilan de la journée, cartable', 'Bilan de la journée, cartable'] },
]

export type CreneauTrame = {
  jour: string
  heure_debut: string
  heure_fin: string
  matiere: string
  type: 'cours' | 'routine'
  couleur: string | null
  ordre: number
}

/** EDT CP par défaut (vraie trame de Cécile), aplati en une ligne par (jour × créneau). */
export const TRAME_EDT_CP: CreneauTrame[] = (() => {
  const out: CreneauTrame[] = []
  let ordre = 0
  for (const ligne of LIGNES) {
    JOURS_TRAME.forEach((jour, idx) => {
      const matiere = ligne.commun ?? ligne.parJour![idx]
      const reel = matiere === 'Mathématiques' ? M : matiere
      out.push({
        jour,
        heure_debut: ligne.debut,
        heure_fin: ligne.fin,
        matiere: matiere === 'Mathématiques' ? 'Mathématiques' : reel,
        type: ligne.type,
        couleur: ligne.type === 'routine' ? '#f3f4f6' : couleurMatiere(matiere),
        ordre: ordre++,
      })
    })
  }
  return out
})()
```

> Note : le libellé long des maths est volontairement raccourci à « Mathématiques » dans la grille (lisibilité) ; la constante `M` reste disponible si on veut l'afficher en entier plus tard.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/data/__tests__/trame-edt.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/trame-edt.ts src/data/__tests__/trame-edt.test.ts
git commit -m "feat: constante TRAME_EDT_CP (vraie trame CP) + palette couleurs"
```

---

### Task 3: Pré-remplir l'EDT au setup + action « Recharger l'EDT type »

**Files:**
- Modify: `src/lib/actions/setup.ts:38-39`
- Modify: `src/lib/actions/parametres.ts:66-75` (action `updateEmploiDuTemps`) + ajout `rechargerEmploiDuTempsType`

- [ ] **Step 1: Au setup, pré-remplir si l'EDT fourni est vide**

Dans `src/lib/actions/setup.ts`, remplacer le bloc EDT (lignes 38-39) par :

```typescript
  const { TRAME_EDT_CP } = await import('@/data/trame-edt')
  const source = formData.emploiDuTemps.length > 0
    ? formData.emploiDuTemps.map((c, i) => ({
        jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
        matiere: c.matiere, ordre: c.ordre, couleur: null, type: 'cours' as const,
      }))
    : TRAME_EDT_CP
  await supabase.from('emploi_du_temps').insert(source.map(c => ({ ...c, class_id: classe.id })))
```

> Comportement : si l'utilisateur a saisi un EDT dans l'assistant, on le garde ; sinon on pré-remplit avec la trame CP.

- [ ] **Step 2: Étendre `updateEmploiDuTemps` pour `couleur` + `type`**

Dans `src/lib/actions/parametres.ts`, remplacer le type local `Creneau` (ligne 10) et `updateEmploiDuTemps` (lignes 66-75) par :

```typescript
type Creneau = { jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur: string | null; type: 'cours' | 'routine' }
```

```typescript
/** Remplace l'emploi du temps (sans impact sur la progression ni les journaux déjà enregistrés). */
export async function updateEmploiDuTemps(creneaux: Omit<Creneau, 'ordre'>[]) {
  const { supabase, classe } = await getClasse()
  await supabase.from('emploi_du_temps').delete().eq('class_id', classe.id)
  if (creneaux.length) {
    await supabase.from('emploi_du_temps').insert(
      creneaux.map((c, i) => ({ ...c, class_id: classe.id, ordre: i }))
    )
  }
  revalidatePath('/parametres')
}

/** Repart de la trame CP par défaut (efface l'EDT courant). */
export async function rechargerEmploiDuTempsType() {
  const { TRAME_EDT_CP } = await import('@/data/trame-edt')
  const { supabase, classe } = await getClasse()
  await supabase.from('emploi_du_temps').delete().eq('class_id', classe.id)
  await supabase.from('emploi_du_temps').insert(TRAME_EDT_CP.map(c => ({ ...c, class_id: classe.id })))
  revalidatePath('/parametres')
}
```

- [ ] **Step 3: Vérifier le build**

Run: `npx next build`
Expected: `Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/setup.ts src/lib/actions/parametres.ts
git commit -m "feat: pre-remplissage EDT depuis la trame + rechargerEmploiDuTempsType"
```

---

### Task 4: Éditeur en grille `TimetableGrid` (remplace les deux éditeurs liste)

**Files:**
- Create: `src/components/TimetableGrid.tsx`
- Modify: le composant setup qui monte `TimetableEditor` (le localiser)
- Modify: `src/app/(app)/parametres/page.tsx` (remplacer `EmploiDuTempsEditor`)

- [ ] **Step 1: Localiser les usages des éditeurs actuels**

Run (Grep) : chercher `TimetableEditor` et `EmploiDuTempsEditor` dans `src`. Noter le composant setup (probablement `src/components/setup/...` ou la page `/setup`) qui rend `TimetableEditor` et lui passe `onFinish`, et la page paramètres qui rend `EmploiDuTempsEditor initial={...}`.

- [ ] **Step 2: Écrire `TimetableGrid`**

```tsx
// src/components/TimetableGrid.tsx
'use client'
import { useState } from 'react'
import { couleurMatiere } from '@/data/trame-edt'

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const
const LABELS: Record<string, string> = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi' }
const MATIERES = ['Appropriation des graphèmes', 'Écriture', 'Phonologie', 'Vocabulaire', 'Lecture-écriture', 'Lecture compréhension', "Production d'écrits", 'Chut je lis', 'Calcul mental', 'Mathématiques', 'Histoire géographie', 'Sciences et technologie', 'Arts visuels', 'EPS', 'Anglais', 'EMC']

export type Creneau = {
  jour: string; heure_debut: string; heure_fin: string
  matiere: string; couleur: string | null; type: 'cours' | 'routine'
}

/** Tranches horaires distinctes, triées par heure de début. */
function tranches(creneaux: Creneau[]): Array<{ debut: string; fin: string }> {
  const seen = new Map<string, { debut: string; fin: string }>()
  for (const c of creneaux) seen.set(`${c.heure_debut}-${c.heure_fin}`, { debut: c.heure_debut, fin: c.heure_fin })
  return [...seen.values()].sort((a, b) => a.debut.localeCompare(b.debut))
}

export default function TimetableGrid({ initial, onSave, saving, finishLabel }: {
  initial: Creneau[]
  onSave: (creneaux: Creneau[]) => void
  saving: boolean
  finishLabel: string
}) {
  const [creneaux, setCreneaux] = useState<Creneau[]>(initial)

  // Colonnes = jours présents (sinon les 4 jours de la trame)
  const joursPresents = JOURS.filter(j => creneaux.some(c => c.jour === j))
  const cols = joursPresents.length ? joursPresents : ['lundi', 'mardi', 'jeudi', 'vendredi']
  const lignes = tranches(creneaux)

  function cellule(jour: string, debut: string, fin: string) {
    return creneaux.find(c => c.jour === jour && c.heure_debut === debut && c.heure_fin === fin)
  }

  function setMatiere(jour: string, debut: string, fin: string, matiere: string) {
    setCreneaux(prev => {
      const idx = prev.findIndex(c => c.jour === jour && c.heure_debut === debut && c.heure_fin === fin)
      if (matiere === '') return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev
      const couleur = couleurMatiere(matiere)
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, matiere, couleur } : c)
      return [...prev, { jour, heure_debut: debut, heure_fin: fin, matiere, couleur, type: 'cours' }]
    })
  }

  function toggleRoutine(debut: string, fin: string) {
    setCreneaux(prev => {
      const isRoutine = prev.some(c => c.heure_debut === debut && c.heure_fin === fin && c.type === 'routine')
      return prev.map(c => c.heure_debut === debut && c.heure_fin === fin
        ? { ...c, type: isRoutine ? 'cours' : 'routine', couleur: isRoutine ? couleurMatiere(c.matiere) : '#f3f4f6' }
        : c)
    })
  }

  function supprimerLigne(debut: string, fin: string) {
    setCreneaux(prev => prev.filter(c => !(c.heure_debut === debut && c.heure_fin === fin)))
  }

  function ajouterLigne() {
    const debut = '12:00', fin = '12:30'
    setCreneaux(prev => prev.some(c => c.heure_debut === debut)
      ? prev
      : [...prev, ...cols.map(jour => ({ jour, heure_debut: debut, heure_fin: fin, matiere: '', couleur: null, type: 'cours' as const }))])
  }

  function setHoraire(debutOld: string, finOld: string, field: 'heure_debut' | 'heure_fin', value: string) {
    setCreneaux(prev => prev.map(c =>
      c.heure_debut === debutOld && c.heure_fin === finOld ? { ...c, [field]: value } : c))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        Clique sur une case pour changer la matière. Les lignes grises (accueil, récréation…) ne reçoivent pas de déroulement dans le cahier journal.
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr>
              <th className="border border-violet-100 bg-violet-100 p-2 text-gray-700">Horaires</th>
              {cols.map(j => <th key={j} className="border border-violet-100 bg-violet-100 p-2 text-gray-700">{LABELS[j]}</th>)}
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ debut, fin }) => {
              const isRoutine = creneaux.some(c => c.heure_debut === debut && c.heure_fin === fin && c.type === 'routine')
              return (
                <tr key={`${debut}-${fin}`}>
                  <td className="border border-violet-100 bg-violet-50 p-1 whitespace-nowrap text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <input type="time" value={debut} onChange={e => setHoraire(debut, fin, 'heure_debut', e.target.value)} className="w-20 border rounded p-0.5 text-gray-900 bg-white" />
                      <input type="time" value={fin} onChange={e => setHoraire(debut, fin, 'heure_fin', e.target.value)} className="w-20 border rounded p-0.5 text-gray-900 bg-white" />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => toggleRoutine(debut, fin)} className="text-[10px] text-violet-500 hover:underline">{isRoutine ? '↩ cours' : 'routine'}</button>
                      <button onClick={() => supprimerLigne(debut, fin)} className="text-[10px] text-red-400 hover:underline">supprimer</button>
                    </div>
                  </td>
                  {cols.map(jour => {
                    const c = cellule(jour, debut, fin)
                    return (
                      <td key={jour} className="border border-violet-100 p-1" style={{ backgroundColor: c?.couleur ?? undefined }}>
                        <select
                          value={c?.matiere ?? ''}
                          onChange={e => setMatiere(jour, debut, fin, e.target.value)}
                          className="w-full bg-transparent text-gray-900 text-xs p-1 outline-none">
                          <option value="">—</option>
                          {Array.from(new Set([...MATIERES, c?.matiere].filter(Boolean) as string[])).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <button onClick={ajouterLigne} className="text-sm text-violet-600 hover:underline">+ Ajouter une tranche horaire</button>

      <button onClick={() => onSave(creneaux)} disabled={saving}
        className="w-full bg-green-600 text-white rounded-xl p-4 font-semibold hover:bg-green-700 disabled:opacity-50">
        {saving ? 'Enregistrement…' : finishLabel}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Brancher `TimetableGrid` au setup**

Dans le composant setup qui montait `TimetableEditor` (repéré au Step 1), remplacer son rendu par `TimetableGrid` pré-rempli depuis la trame :

```tsx
import TimetableGrid from '@/components/TimetableGrid'
import { TRAME_EDT_CP } from '@/data/trame-edt'

// dans le rendu de l'étape EDT (remplace <TimetableEditor onFinish={...} loading={...} />) :
<TimetableGrid
  initial={TRAME_EDT_CP.map(c => ({ jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin, matiere: c.matiere, couleur: c.couleur, type: c.type }))}
  saving={loading}
  finishLabel="🎉 Générer ma progression annuelle"
  onSave={(creneaux) => onFinish(creneaux.map((c, i) => ({ ...c, ordre: i })))}
/>
```

> `onFinish` attend des créneaux avec `ordre` ; on ajoute l'index. `creerClasse` (Task 3) accepte désormais `couleur`/`type` via l'objet inséré — vérifier que la signature `creerClasse` accepte ces champs ; sinon élargir le type `emploiDuTemps` dans `setup.ts` pour inclure `couleur?: string | null; type?: 'cours' | 'routine'` et les passer à l'insert.

Concrètement, élargir la signature dans `src/lib/actions/setup.ts` :

```typescript
  emploiDuTemps: Array<{ jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur?: string | null; type?: 'cours' | 'routine' }>
```

et adapter la branche « EDT fourni » du Step 1 de Task 3 pour reprendre `couleur: c.couleur ?? null, type: c.type ?? 'cours'`.

- [ ] **Step 4: Brancher `TimetableGrid` aux paramètres**

Créer un wrapper client `src/components/parametres/EmploiDuTempsGrille.tsx` :

```tsx
// src/components/parametres/EmploiDuTempsGrille.tsx
'use client'
import { useState, useTransition } from 'react'
import TimetableGrid, { Creneau } from '@/components/TimetableGrid'
import { updateEmploiDuTemps, rechargerEmploiDuTempsType } from '@/lib/actions/parametres'

export default function EmploiDuTempsGrille({ initial }: { initial: Creneau[] }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [key, setKey] = useState(0) // force le remount après rechargement de la trame

  return (
    <div className="space-y-3">
      <TimetableGrid
        key={key}
        initial={initial}
        saving={isPending}
        finishLabel="Enregistrer l'emploi du temps"
        onSave={(creneaux) => {
          setSaved(false)
          startTransition(async () => { await updateEmploiDuTemps(creneaux); setSaved(true) })
        }}
      />
      {saved && !isPending && <span className="text-sm text-green-600">✓ Enregistré</span>}
      <button
        onClick={() => startTransition(async () => { await rechargerEmploiDuTempsType(); setKey(k => k + 1); location.reload() })}
        className="text-xs text-violet-500 hover:underline">
        ↻ Recharger l'emploi du temps type (efface le mien)
      </button>
    </div>
  )
}
```

Dans `src/app/(app)/parametres/page.tsx`, remplacer le rendu de `EmploiDuTempsEditor` par `EmploiDuTempsGrille`, en passant les créneaux chargés (mapper chaque ligne BD vers `{ jour, heure_debut, heure_fin, matiere, couleur, type }`).

- [ ] **Step 5: Supprimer les anciens éditeurs**

Supprimer `src/components/setup/TimetableEditor.tsx` et `src/components/parametres/EmploiDuTempsEditor.tsx` (plus référencés). Vérifier qu'aucun import ne subsiste (Grep `TimetableEditor`, `EmploiDuTempsEditor`).

- [ ] **Step 6: Build + run manuel**

Run: `npx next build` puis `npm run dev` → /setup : la grille est pré-remplie ; /parametres : édition d'une case change sa couleur, « routine » grise la ligne, « Recharger » repart de la trame.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(edt): editeur en grille pre-rempli (remplace les editeurs liste)"
```

---

## Phase B — Cahier journal 3 colonnes (prérequis : table `progression`)

### Task 5: Nouveau format journal + génération depuis EDT + `progression`

**Files:**
- Modify: `src/types/index.ts` (types `SeanceJournal`, `JourJournal`)
- Modify: `src/lib/cahier-journal.ts`
- Modify: `src/lib/__tests__/cahier-journal.test.ts`
- Modify: `src/lib/actions/journal.ts:7-21` (`genererOuChargerJournal`)

- [ ] **Step 1: Mettre à jour les tests de génération**

Remplacer le contenu de `src/lib/__tests__/cahier-journal.test.ts` par :

```typescript
import { genererCahierJournal } from '../cahier-journal'
import type { CreneauHoraire } from '@/types'

const creneau = (over: Partial<CreneauHoraire>): CreneauHoraire => ({
  id: 'x', class_id: 'c', jour: 'lundi', heure_debut: '08:45', heure_fin: '09:15',
  matiere: 'Appropriation des graphèmes', ordre: 0, couleur: null, type: 'cours', ...over,
})

describe('genererCahierJournal (3 colonnes)', () => {
  const progression = [
    { matiere: 'francais', items: ['a'], pages: 'p.10-13', mots_exemple: ['ami', 'papa'] },
    { matiere: 'maths', items: ['Nombres jusqu’à 10'], pages: 'p.8', mots_exemple: [] },
  ]

  test('une fiche par jour, dans l’ordre', () => {
    const edt = [creneau({ jour: 'lundi' }), creneau({ jour: 'jeudi' })]
    const jours = genererCahierJournal(edt, progression)
    expect(jours.map(j => j.jour)).toEqual(['lundi', 'jeudi'])
  })

  test('les lignes routine ne sont pas remplissables (deroulement vide, flag routine)', () => {
    const edt = [creneau({ matiere: 'Récréation', type: 'routine' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.type).toBe('routine')
    expect(s.deroulement).toBe('')
  })

  test('le creneau graphemes est pre-rempli depuis la progression francais', () => {
    const edt = [creneau({ matiere: 'Appropriation des graphèmes' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('a')
    expect(s.deroulement).toContain('p.10-13')
  })

  test('le creneau maths est pre-rempli depuis la progression maths', () => {
    const edt = [creneau({ matiere: 'Mathématiques', heure_debut: '10:30', heure_fin: '11:30' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('Nombres jusqu’à 10')
  })

  test('les autres matieres ont un deroulement vide a remplir', () => {
    const edt = [creneau({ matiere: 'Arts visuels' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/cahier-journal.test.ts`
Expected: FAIL (signature/format changés).

- [ ] **Step 3: Mettre à jour les types journal**

Dans `src/types/index.ts`, remplacer `SeanceJournal` et `JourJournal` (lignes 49-62) par :

```typescript
export type SeanceJournal = {
  matiere: string
  heure_debut: string
  heure_fin: string
  type: 'cours' | 'routine'
  deroulement: string
}

export type JourJournal = {
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi'
  seances: SeanceJournal[]
}

/** Ligne de progression d'une matière pour une semaine (issue de la table progression). */
export type ProgressionMatiere = {
  matiere: string
  items: string[]
  pages: string | null
  mots_exemple: string[] | null
}
```

- [ ] **Step 4: Réécrire `genererCahierJournal`**

Remplacer le contenu de `src/lib/cahier-journal.ts` par :

```typescript
import { CreneauHoraire, JourJournal, SeanceJournal, ProgressionMatiere } from '@/types'

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const

/** Mappe un libellé de créneau vers la matière-méthode correspondante (ou null). */
export function matiereMethode(matiere: string): 'francais' | 'maths' | null {
  const m = matiere.toLowerCase()
  if (m.includes('graphème') || m.includes('graphe')) return 'francais'
  if (m.includes('math') || m.includes('calcul')) return 'maths'
  return null
}

function deroulementInitial(creneau: CreneauHoraire, progression: ProgressionMatiere[]): string {
  if (creneau.type === 'routine') return ''
  const matiere = matiereMethode(creneau.matiere)
  if (!matiere) return ''
  const p = progression.find(x => x.matiere === matiere)
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

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/cahier-journal.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Adapter `genererOuChargerJournal` (lit `progression`)**

Dans `src/lib/actions/journal.ts`, remplacer `genererOuChargerJournal` (lignes 7-21) par :

```typescript
export async function genererOuChargerJournal(semaineId: string) {
  const supabase = await createClient()

  const { data: semaine } = await supabase.from('semaines').select('*').eq('id', semaineId).single()
  if (!semaine) throw new Error('Semaine introuvable')

  const { data: existing } = await supabase.from('cahier_journal').select('*').eq('semaine_id', semaineId).single()
  if (existing) return existing.contenu as JourJournal[]

  const { data: edt } = await supabase.from('emploi_du_temps').select('*').eq('class_id', semaine.class_id)
  const { data: progression } = await supabase
    .from('progression').select('matiere, items, pages, mots_exemple')
    .eq('class_id', semaine.class_id).eq('numero', semaine.numero)

  const contenu = genererCahierJournal(edt ?? [], progression ?? [])
  await supabase.from('cahier_journal').insert({ semaine_id: semaineId, contenu })
  return contenu
}
```

> `sauvegarderJournal` (déjà présent) reste inchangé : il upsert `contenu` jsonb.

- [ ] **Step 7: Build**

Run: `npx next build`
Expected: `Compiled successfully` (des erreurs sur `CahierJournalEditor` / `export-word` peuvent apparaître — corrigées en Task 6).

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/lib/cahier-journal.ts src/lib/__tests__/cahier-journal.test.ts src/lib/actions/journal.ts
git commit -m "feat(journal): format 3 colonnes genere depuis EDT + progression"
```

---

### Task 6: Rendu `CahierJournalEditor` 3 colonnes + export Word

**Files:**
- Modify: `src/components/semaine/CahierJournalEditor.tsx`
- Modify: `src/lib/export-word.ts`

- [ ] **Step 1: Lire l'export Word existant**

Run: lire `src/lib/export-word.ts` pour repérer `genererBlobWord` / `exporterJournalWord` et leur usage de `seance.objectif`/`activite`/`materiel`.

- [ ] **Step 2: Réécrire le rendu en tableau 3 colonnes**

Dans `src/components/semaine/CahierJournalEditor.tsx`, remplacer le bloc `updateSeance` + le `{journal.map(...)}` (lignes 47-61 et 111-139) par un rendu 3 colonnes. Remplacer `updateSeance` par :

```tsx
  function updateDeroulement(jourIdx: number, seanceIdx: number, value: string) {
    setJournal(prev => {
      if (!prev) return prev
      const next = prev.map((j, ji) =>
        ji !== jourIdx ? j : { ...j, seances: j.seances.map((s, si) => si !== seanceIdx ? s : { ...s, deroulement: value }) }
      )
      startTransition(() => sauvegarderJournal(semaineId, next))
      return next
    })
  }
```

et le rendu des jours par :

```tsx
      {journal.map((jour, ji) => (
        <div key={jour.jour} className="border rounded-xl overflow-hidden print-section">
          <div className="bg-violet-50 px-4 py-2 font-semibold text-violet-800 capitalize">{jour.jour}</div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-violet-50/50 text-violet-700">
                <th className="border-b p-2 text-left w-24">Horaires</th>
                <th className="border-b p-2 text-left w-40">Matière</th>
                <th className="border-b p-2 text-left">Déroulement</th>
              </tr>
            </thead>
            <tbody>
              {jour.seances.map((s, si) => (
                <tr key={si} className={s.type === 'routine' ? 'bg-gray-50 text-gray-500 italic' : ''}>
                  <td className="border-b p-2 align-top whitespace-nowrap text-xs text-gray-500">{s.heure_debut}–{s.heure_fin}</td>
                  <td className="border-b p-2 align-top font-medium text-gray-700">{s.matiere}</td>
                  <td className="border-b p-1 align-top">
                    {s.type === 'routine'
                      ? <span className="text-xs">—</span>
                      : <textarea value={s.deroulement} placeholder="(à compléter)"
                          onChange={e => updateDeroulement(ji, si, e.target.value)}
                          rows={Math.max(2, s.deroulement.split('\n').length)}
                          className="w-full border rounded-lg p-2 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-violet-400 outline-none resize-y" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
```

Mettre à jour la ligne d'aide (≈ ligne 100) en : `💡 Complète le déroulement de chaque matière. Tout se sauvegarde automatiquement.`

- [ ] **Step 3: Adapter l'export Word au format 3 colonnes**

Dans `src/lib/export-word.ts`, là où chaque `seance` était rendue avec objectif/activité/matériel, produire une ligne « {heure_debut}–{heure_fin} · {matiere} : {deroulement} » (ignorer le déroulement vide), en sautant ou grisant les `type === 'routine'`. Conserver la signature `exporterJournalWord(journal, numeroSemaine)` et `genererBlobWord`.

- [ ] **Step 4: Build + run manuel**

Run: `npx next build` puis `npm run dev` → ouvrir une semaine, « Générer le cahier journal » : tableau 3 colonnes, lignes routine grisées, déroulement éditable et auto-sauvegardé ; export Word OK.

- [ ] **Step 5: Commit**

```bash
git add src/components/semaine/CahierJournalEditor.tsx src/lib/export-word.ts
git commit -m "feat(journal): rendu 3 colonnes + export Word adapte"
```

---

### Task 7: Route `api/ia-journal` (Sonnet) + prompts

**Files:**
- Modify: `src/lib/ia/prompts.ts` (ajout `SYSTEM_JOURNAL`, `userJournal`)
- Create: `src/app/api/ia-journal/route.ts`
- Create: `src/lib/ia/__tests__/journal-prompt.test.ts`

- [ ] **Step 1: Écrire le test du prompt**

```typescript
// src/lib/ia/__tests__/journal-prompt.test.ts
import { userJournal } from '../prompts'

describe('userJournal', () => {
  test('liste les créneaux cours et le contenu de la semaine', () => {
    const txt = userJournal({
      numeroSemaine: 3,
      creneaux: [{ heure_debut: '08:45', heure_fin: '09:15', matiere: 'Appropriation des graphèmes' }],
      francais: ['a'], maths: ['Nombres jusqu’à 10'],
    })
    expect(txt).toContain('Appropriation des graphèmes')
    expect(txt).toContain('a')
    expect(txt).toContain('Nombres jusqu’à 10')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/ia/__tests__/journal-prompt.test.ts`
Expected: FAIL (`userJournal` n'existe pas).

- [ ] **Step 3: Ajouter les prompts**

Ajouter à la fin de `src/lib/ia/prompts.ts` :

```typescript
export const SYSTEM_JOURNAL = `Tu es un enseignant de CP expérimenté qui prépare son cahier journal.
On te donne, pour une journée, la liste des créneaux (matière + horaires) et le contenu de la semaine (sons de lecture, notions de maths).
Pour CHAQUE créneau, rédige une amorce de déroulement courte (1 à 2 phrases), concrète et adaptée à des élèves de CP.
- Pour la lecture/les graphèmes, appuie-toi sur le(s) son(s) de la semaine.
- Pour les maths, appuie-toi sur la notion de la semaine.
- Pour les autres matières (arts, EPS, anglais, EMC, sciences, histoire-géo…), propose une activité plausible et simple.
N'invente pas de contenu spécifique à l'école. Reste général et réaliste.
Réponds UNIQUEMENT via le format structuré imposé (un déroulement par créneau, dans le même ordre).`

export function userJournal(d: {
  numeroSemaine: number
  creneaux: Array<{ heure_debut: string; heure_fin: string; matiere: string }>
  francais: string[]
  maths: string[]
}): string {
  const lignes = d.creneaux.map((c, i) => `${i + 1}. ${c.heure_debut}-${c.heure_fin} — ${c.matiere}`).join('\n')
  return `Semaine ${d.numeroSemaine}.
Sons de lecture (français) de la semaine : ${d.francais.join(', ') || '—'}.
Notions de maths de la semaine : ${d.maths.join(', ') || '—'}.

Créneaux de la journée (rédige un déroulement pour chacun, dans cet ordre) :
${lignes}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/ia/__tests__/journal-prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Écrire la route (sorties structurées + Sonnet)**

```typescript
// src/app/api/ia-journal/route.ts
import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_CHAT } from '@/lib/ia/anthropic'
import { SYSTEM_JOURNAL, userJournal } from '@/lib/ia/prompts'
import { messageErreurIA } from '@/lib/ia/erreurs'

export const maxDuration = 60

const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    deroulements: { type: 'array', items: { type: 'string' } },
  },
  required: ['deroulements'],
} as const

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const numeroSemaine = typeof body.numeroSemaine === 'number' ? body.numeroSemaine : 0
    const creneaux = Array.isArray(body.creneaux) ? body.creneaux : []
    const francais = Array.isArray(body.francais) ? body.francais.filter((s: unknown) => typeof s === 'string') : []
    const maths = Array.isArray(body.maths) ? body.maths.filter((s: unknown) => typeof s === 'string') : []
    if (creneaux.length === 0) return NextResponse.json({ deroulements: [] })

    const client = getAnthropicClient()
    const result = await client.messages.create({
      model: MODELE_CHAT,
      max_tokens: 1500,
      system: SYSTEM_JOURNAL,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: userJournal({ numeroSemaine, creneaux, francais, maths }) }],
    })

    const block = result.content.find(b => b.type === 'text')
    const raw = block && 'text' in block ? block.text : '{}'
    let deroulements: string[] = []
    try { deroulements = JSON.parse(raw).deroulements ?? [] } catch { deroulements = [] }
    return NextResponse.json({ deroulements, usage: result.usage })
  } catch (err) {
    console.error('ia-journal error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
```

> `messageErreurIA` est créé en Task 9 (Phase C). Si la Phase C n'est pas encore faite, remplacer temporairement par le bloc `catch` de `ia-bilan/route.ts` (clé manquante / message générique), puis revenir le brancher en Task 9.

- [ ] **Step 6: Build**

Run: `npx next build`
Expected: `Compiled successfully`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ia/prompts.ts src/app/api/ia-journal/route.ts src/lib/ia/__tests__/journal-prompt.test.ts
git commit -m "feat(api): route ia-journal (amorce le deroulement par creneau)"
```

---

### Task 8: Bouton « ✨ Générer la journée » dans l'éditeur

**Files:**
- Modify: `src/components/semaine/CahierJournalEditor.tsx`
- Modify: `src/app/(app)/semaine/[id]/page.tsx` (passer `francais`/`maths` de la semaine à l'éditeur)

- [ ] **Step 1: Charger français/maths de la semaine dans la page**

Dans `src/app/(app)/semaine/[id]/page.tsx`, là où la semaine et l'EDT sont chargés, charger aussi la `progression` de la semaine et dériver deux tableaux `francais` / `maths` (les `items` des lignes `matiere='francais'` / `'maths'`), puis les passer en props à `CahierJournalEditor`.

```typescript
const { data: prog } = await supabase
  .from('progression').select('matiere, items')
  .eq('class_id', classe.id).eq('numero', semaine.numero)
const francais = (prog ?? []).filter(p => p.matiere === 'francais').flatMap(p => p.items as string[])
const maths = (prog ?? []).filter(p => p.matiere === 'maths').flatMap(p => p.items as string[])
// <CahierJournalEditor semaineId={...} numeroSemaine={semaine.numero} francais={francais} maths={maths} />
```

- [ ] **Step 2: Ajouter le bouton + l'appel dans l'éditeur**

Dans `src/components/semaine/CahierJournalEditor.tsx`, étendre les props et ajouter un bouton « ✨ Générer la journée » par fiche-jour, qui appelle la route et remplit les déroulements `cours` de ce jour :

```tsx
export default function CahierJournalEditor({ semaineId, numeroSemaine, francais = [], maths = [] }: {
  semaineId: string; numeroSemaine: number; francais?: string[]; maths?: string[]
}) {
  // ... états existants
  const [generatingJour, setGeneratingJour] = useState<number | null>(null)

  async function genererJournee(jourIdx: number) {
    if (!journal) return
    const seances = journal[jourIdx].seances
    const creneaux = seances.filter(s => s.type === 'cours').map(s => ({ heure_debut: s.heure_debut, heure_fin: s.heure_fin, matiere: s.matiere }))
    setGeneratingJour(jourIdx)
    try {
      const res = await fetch('/api/ia-journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroSemaine, creneaux, francais, maths }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? 'Erreur IA'); return }
      const deroulements: string[] = data.deroulements ?? []
      let k = 0
      setJournal(prev => {
        if (!prev) return prev
        const next = prev.map((j, ji) => ji !== jourIdx ? j : {
          ...j,
          seances: j.seances.map(s => s.type === 'cours' ? { ...s, deroulement: deroulements[k++] ?? s.deroulement } : s),
        })
        startTransition(() => sauvegarderJournal(semaineId, next))
        return next
      })
    } finally { setGeneratingJour(null) }
  }
```

Dans l'en-tête de chaque fiche-jour (le `<div className="bg-violet-50 …">{jour.jour}</div>`), ajouter à droite un bouton :

```tsx
          <div className="bg-violet-50 px-4 py-2 font-semibold text-violet-800 capitalize flex justify-between items-center">
            <span>{jour.jour}</span>
            <button onClick={() => genererJournee(ji)} disabled={generatingJour === ji}
              className="no-print text-xs bg-violet-600 text-white rounded-lg px-3 py-1 hover:bg-violet-700 disabled:opacity-50">
              {generatingJour === ji ? 'Génération…' : '✨ Générer la journée'}
            </button>
          </div>
```

- [ ] **Step 3: Build + run manuel**

Run: `npx next build` puis `npm run dev` → générer le journal, cliquer « ✨ Générer la journée » : les déroulements `cours` se remplissent, restent éditables et se sauvegardent.

- [ ] **Step 4: Commit**

```bash
git add "src/components/semaine/CahierJournalEditor.tsx" "src/app/(app)/semaine/[id]/page.tsx"
git commit -m "feat(journal): bouton Generer la journee (IA amorce chaque matiere)"
```

---

## Phase C — Garde-fou crédit IA

### Task 9: Message d'épuisement de crédit (helper partagé)

**Files:**
- Create: `src/lib/ia/erreurs.ts`
- Create: `src/lib/ia/__tests__/erreurs.test.ts`
- Modify: `src/app/api/ia-journal/route.ts`, `src/app/api/ia-bilan/route.ts`, `src/app/api/ia-manuel/route.ts`, `src/app/api/ia-chat/route.ts` (utiliser le helper)

- [ ] **Step 1: Écrire le test**

```typescript
// src/lib/ia/__tests__/erreurs.test.ts
import { messageErreurIA } from '../erreurs'

describe('messageErreurIA', () => {
  test('clé manquante → message de config', () => {
    const r = messageErreurIA(new Error('ANTHROPIC_API_KEY manquante : ...'))
    expect(r.message).toMatch(/configuré|configure/i)
  })

  test('crédit épuisé → message dédié (facturation)', () => {
    const r = messageErreurIA(new Error('Your credit balance is too low to access the Anthropic API'))
    expect(r.message).toMatch(/crédit IA est épuisé/i)
  })

  test('erreur générique → message neutre', () => {
    const r = messageErreurIA(new Error('socket hang up'))
    expect(r.message).toMatch(/réessaie|réessayez/i)
    expect(r.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/ia/__tests__/erreurs.test.ts`
Expected: FAIL (`Cannot find module '../erreurs'`).

- [ ] **Step 3: Implémenter le helper**

```typescript
// src/lib/ia/erreurs.ts

/** Traduit une erreur d'appel IA en message clair pour l'enseignant + statut HTTP. */
export function messageErreurIA(err: unknown): { message: string; status: number } {
  const text = err instanceof Error ? err.message : String(err)
  const low = text.toLowerCase()

  if (/anthropic_api_key/i.test(text)) {
    return { message: 'Service IA non configuré (clé API manquante).', status: 500 }
  }
  // Anthropic renvoie une erreur de facturation quand le crédit est épuisé.
  if (low.includes('credit balance') || low.includes('billing') || low.includes('insufficient')) {
    return { message: '⚠️ Le crédit IA est épuisé. Préviens l’administrateur pour le recharger.', status: 402 }
  }
  return { message: 'Erreur IA. Réessaie dans un instant.', status: 500 }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/ia/__tests__/erreurs.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Brancher le helper dans toutes les routes IA**

Dans chaque route (`ia-journal`, `ia-bilan`, `ia-manuel`, `ia-chat`), remplacer le bloc `catch` par :

```typescript
  } catch (err) {
    console.error('<route> error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
```

et ajouter en haut `import { messageErreurIA } from '@/lib/ia/erreurs'`. (Vérifier les noms de routes réels via Grep `api/ia-` ; adapter si `ia-chat`/`ia-manuel` ont une structure différente.)

- [ ] **Step 6: Build**

Run: `npx next build`
Expected: `Compiled successfully`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ia/erreurs.ts src/lib/ia/__tests__/erreurs.test.ts src/app/api/ia-journal/route.ts src/app/api/ia-bilan/route.ts src/app/api/ia-manuel/route.ts src/app/api/ia-chat/route.ts
git commit -m "feat(ia): message clair quand le credit IA est epuise"
```

---

### Task 10: Jauge de budget IA estimée

**Files:**
- Create: `supabase/migrations/006_ia_usage.sql`
- Create: `src/lib/ia/cout.ts`
- Create: `src/lib/ia/__tests__/cout.test.ts`
- Create: `src/lib/actions/ia-usage.ts`
- Modify: les 4 routes IA (enregistrer l'usage)
- Create: `src/components/BudgetIaIndicator.tsx`
- Modify: `src/app/(app)/accueil/page.tsx` (afficher l'indicateur)

- [ ] **Step 1: Migration de la table d'usage**

```sql
-- supabase/migrations/006_ia_usage.sql
create table ia_usage (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  mois text not null,            -- 'YYYY-MM'
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz default now()
);
alter table ia_usage enable row level security;
create policy "Users manage own ia_usage" on ia_usage
  using (class_id in (select id from classes where user_id = auth.uid()))
  with check (class_id in (select id from classes where user_id = auth.uid()));
```

- [ ] **Step 2: Écrire le test du coût**

```typescript
// src/lib/ia/__tests__/cout.test.ts
import { estimerCoutEuros, PLAFOND_EUROS } from '../cout'

describe('estimerCoutEuros (tarif Sonnet)', () => {
  test('1M input + 1M output ≈ (3$+15$) convertis en euros', () => {
    const eur = estimerCoutEuros(1_000_000, 1_000_000)
    expect(eur).toBeGreaterThan(14)
    expect(eur).toBeLessThan(18)
  })
  test('0 token = 0 €', () => {
    expect(estimerCoutEuros(0, 0)).toBe(0)
  })
  test('le plafond est défini', () => {
    expect(PLAFOND_EUROS).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/lib/ia/__tests__/cout.test.ts`
Expected: FAIL (`Cannot find module '../cout'`).

- [ ] **Step 4: Implémenter l'estimation**

```typescript
// src/lib/ia/cout.ts
// Tarif Sonnet 4.6 : 3 $/1M tokens d'entrée, 15 $/1M de sortie.
const USD_PAR_INPUT = 3 / 1_000_000
const USD_PAR_OUTPUT = 15 / 1_000_000
const USD_VERS_EUR = 0.92 // approximation ; estimation d'ordre de grandeur

/** Plafond mensuel estimé (aligné sur la carte plafonnée ~8 €). */
export const PLAFOND_EUROS = 8

export function estimerCoutEuros(inputTokens: number, outputTokens: number): number {
  const usd = inputTokens * USD_PAR_INPUT + outputTokens * USD_PAR_OUTPUT
  return usd * USD_VERS_EUR
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/lib/ia/__tests__/cout.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Action d'enregistrement + lecture du mois**

```typescript
// src/lib/actions/ia-usage.ts
'use server'
import { createClient } from '@/lib/supabase/server'

function moisCourant(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Ajoute l'usage d'un appel IA (best-effort ; n'interrompt jamais la réponse). */
export async function enregistrerUsageIA(inputTokens: number, outputTokens: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: classe } = await supabase.from('classes').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!classe) return
    await supabase.from('ia_usage').insert({
      class_id: classe.id, mois: moisCourant(),
      input_tokens: inputTokens || 0, output_tokens: outputTokens || 0,
    })
  } catch { /* best-effort */ }
}

/** Somme des tokens du mois courant pour la classe de l'utilisateur. */
export async function usageMoisCourant(): Promise<{ input: number; output: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { input: 0, output: 0 }
  const { data: classe } = await supabase.from('classes').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) return { input: 0, output: 0 }
  const { data } = await supabase.from('ia_usage').select('input_tokens, output_tokens')
    .eq('class_id', classe.id).eq('mois', moisCourant())
  return {
    input: (data ?? []).reduce((s, r) => s + (r.input_tokens ?? 0), 0),
    output: (data ?? []).reduce((s, r) => s + (r.output_tokens ?? 0), 0),
  }
}
```

- [ ] **Step 7: Enregistrer l'usage dans les routes IA**

Dans chaque route IA, après réception de `result`, appeler (sans bloquer la réponse) :

```typescript
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'
// après result :
await enregistrerUsageIA(result.usage?.input_tokens ?? 0, result.usage?.output_tokens ?? 0)
```

(Pour `ia-manuel`/`ia-chat`, récupérer `result.usage` de la réponse Anthropic correspondante.)

- [ ] **Step 8: Composant indicateur**

```tsx
// src/components/BudgetIaIndicator.tsx
import { usageMoisCourant } from '@/lib/actions/ia-usage'
import { estimerCoutEuros, PLAFOND_EUROS } from '@/lib/ia/cout'

export default async function BudgetIaIndicator() {
  const { input, output } = await usageMoisCourant()
  const euros = estimerCoutEuros(input, output)
  const pct = Math.min(100, Math.round((euros / PLAFOND_EUROS) * 100))
  const proche = euros >= PLAFOND_EUROS * 0.8
  return (
    <div className="text-xs text-gray-500">
      <div className="flex justify-between mb-1">
        <span>Budget IA estimé ce mois</span>
        <span className={proche ? 'text-orange-600 font-semibold' : ''}>~{euros.toFixed(2)} € / {PLAFOND_EUROS} €</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${proche ? 'bg-orange-500' : 'bg-violet-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Estimation indicative (pas le solde réel Anthropic).</p>
    </div>
  )
}
```

- [ ] **Step 9: Afficher l'indicateur sur l'accueil**

Dans `src/app/(app)/accueil/page.tsx`, dans le panneau « Mes outils » (ou à côté), insérer `<BudgetIaIndicator />` (import du composant serveur).

- [ ] **Step 10: Build + run manuel**

Run: `npx next build` puis `npm run dev` → générer un bilan/journal IA, recharger l'accueil : la jauge augmente.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/006_ia_usage.sql src/lib/ia/cout.ts src/lib/ia/__tests__/cout.test.ts src/lib/actions/ia-usage.ts src/components/BudgetIaIndicator.tsx "src/app/(app)/accueil/page.tsx" src/app/api/ia-journal/route.ts src/app/api/ia-bilan/route.ts src/app/api/ia-manuel/route.ts src/app/api/ia-chat/route.ts
git commit -m "feat(ia): jauge de budget IA estimee (usage mensuel)"
```

---

## Vérification finale (avant déploiement)

- [ ] `npm test` → tous verts (anciens + nouveaux).
- [ ] `npx next build` → `Compiled successfully`.
- [ ] Appliquer `005_emploi_du_temps_grille.sql` et `006_ia_usage.sql` en prod (MCP Supabase / dashboard).
- [ ] Test prod : setup → EDT pré-rempli + modifiable (couleurs, routine, recharger) ; cahier journal 3 colonnes ; « ✨ Générer la journée » remplit chaque matière ; message clair si crédit épuisé ; jauge de budget visible.
- [ ] Vérifier le rendu couleur à l'impression (`@media print`) ; ajuster si les fonds de cellule sont ignorés.

## Notes de séquencement

- **Phase B exige la table `progression`** (chantier multi-méthodes). Si multi-méthodes n'est pas encore en prod, exécuter d'abord les Phases A et C (indépendantes), puis B après le déploiement multi-méthodes.
- Modèle IA = `claude-sonnet-4-6` partout (jamais Opus : timeout Vercel). Génération du journal **par journée** pour rester sous le timeout.
