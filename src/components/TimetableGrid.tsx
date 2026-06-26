'use client'
import { useState } from 'react'
import { couleurMatiere } from '@/data/trame-edt'

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number)
  const tot = h * 60 + m + mins
  return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const
const LABELS: Record<string, string> = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi' }
const MATIERES = ['Appropriation des graphèmes', 'Écriture', 'Phonologie', 'Vocabulaire', 'Lecture-écriture', 'Lecture compréhension', "Production d'écrits", 'Chut je lis', 'Calcul mental', 'Mathématiques', 'Histoire géographie', 'Sciences et technologie', 'Arts visuels', 'EPS', 'Anglais', 'EMC']

export type Creneau = {
  jour: string; heure_debut: string; heure_fin: string
  matiere: string; couleur: string | null; type: 'cours' | 'routine'
  visible_journal: boolean
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
      return [...prev, { jour, heure_debut: debut, heure_fin: fin, matiere, couleur, type: 'cours', visible_journal: true }]
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

  function ajouterLigne() {
    setCreneaux(prev => {
      const lastFin = prev.reduce((max, c) => (c.heure_fin > max ? c.heure_fin : max), '08:00')
      const debut = lastFin, fin = addMinutes(lastFin, 30)
      if (prev.some(c => c.heure_debut === debut && c.heure_fin === fin)) return prev
      return [...prev, ...cols.map(jour => ({ jour, heure_debut: debut, heure_fin: fin, matiere: '', couleur: null, type: 'cours' as const, visible_journal: true }))]
    })
  }

  function setHoraire(debutOld: string, finOld: string, field: 'heure_debut' | 'heure_fin', value: string) {
    setCreneaux(prev => {
      const newDebut = field === 'heure_debut' ? value : debutOld
      const newFin = field === 'heure_fin' ? value : finOld
      // Rejette une édition qui ferait coïncider cette tranche avec une AUTRE tranche existante
      // (sinon deux jeux de créneaux partagent la même clé horaire → corruption silencieuse).
      const collision = prev.some(c =>
        !(c.heure_debut === debutOld && c.heure_fin === finOld) &&
        c.heure_debut === newDebut && c.heure_fin === newFin)
      if (collision) return prev
      return prev.map(c =>
        c.heure_debut === debutOld && c.heure_fin === finOld ? { ...c, [field]: value } : c)
    })
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
                      <button onClick={() => toggleVisible(debut, fin)}
                        className={`text-[10px] hover:underline ${
                          creneaux.some(c => c.heure_debut === debut && c.heure_fin === fin && c.visible_journal === false)
                            ? 'text-gray-400' : 'text-violet-500'
                        }`}>
                        {creneaux.some(c => c.heure_debut === debut && c.heure_fin === fin && c.visible_journal === false)
                          ? '👁️ masqué' : '👁️ visible'}
                      </button>
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
                          aria-label={`${LABELS[jour]} ${debut}-${fin}`}
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
