'use client'
import { useState, useTransition } from 'react'
import { updateEmploiDuTemps } from '@/lib/actions/parametres'

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
const MATIERES = ['Lecture', 'Écriture', 'Mathématiques', 'Explorer le monde', 'Arts plastiques', 'Éducation musicale', 'EPS', 'EMC', 'Langue vivante']

type Creneau = { jour: string; heure_debut: string; heure_fin: string; matiere: string }

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.max(0, Math.min(24 * 60 - 1, h * 60 + m + mins))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function diffMinutes(a: string, b: string): number {
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  return (bh * 60 + bm) - (ah * 60 + am)
}

export default function EmploiDuTempsEditor({ initial }: { initial: Creneau[] }) {
  const [creneaux, setCreneaux] = useState<Creneau[]>(initial)
  const [jour, setJour] = useState('lundi')
  const [debut, setDebut] = useState('09:00')
  const [fin, setFin] = useState('09:45')
  const [matiere, setMatiere] = useState('Lecture')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function ajouter() {
    setCreneaux(c => [...c, { jour, heure_debut: debut, heure_fin: fin, matiere }])
    const duree = Math.max(15, diffMinutes(debut, fin))
    setDebut(fin)
    setFin(addMinutes(fin, duree))
  }

  function supprimer(index: number) {
    setCreneaux(c => c.filter((_, i) => i !== index))
  }

  function enregistrer() {
    setSaved(false)
    startTransition(async () => {
      await updateEmploiDuTemps(creneaux)
      setSaved(true)
    })
  }

  const parJour = JOURS.map(j => ({
    jour: j,
    items: creneaux.map((c, i) => ({ ...c, i })).filter(c => c.jour === j),
  }))

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Ajoutez autant de créneaux que nécessaire pour bâtir vos journées. L&apos;heure de début du suivant se positionne automatiquement.</p>
      <div className="grid grid-cols-2 gap-2 bg-rose-50/60 border border-rose-100 rounded-xl p-3">
        <select value={jour} onChange={e => setJour(e.target.value)}
          className="border rounded-lg p-2 col-span-2 text-gray-900 bg-white">
          {JOURS.map(j => <option key={j}>{j}</option>)}
        </select>
        <input type="time" value={debut} onChange={e => setDebut(e.target.value)} className="border rounded-lg p-2 text-gray-900 bg-white" />
        <input type="time" value={fin} onChange={e => setFin(e.target.value)} className="border rounded-lg p-2 text-gray-900 bg-white" />
        <select value={matiere} onChange={e => setMatiere(e.target.value)}
          className="border rounded-lg p-2 col-span-2 text-gray-900 bg-white">
          {MATIERES.map(m => <option key={m}>{m}</option>)}
        </select>
        <button onClick={ajouter} className="col-span-2 bg-rose-600 text-white rounded-lg p-2.5 font-semibold hover:bg-rose-700">
          + Ajouter ce créneau
        </button>
      </div>

      <div className="space-y-2">
        {parJour.filter(j => j.items.length > 0).map(({ jour, items }) => (
          <div key={jour}>
            <div className="text-sm font-semibold text-gray-500 uppercase mb-1">{jour}</div>
            {items.map(c => (
              <div key={c.i} className="flex items-center gap-2 text-sm bg-rose-50 rounded p-2 mb-1">
                <span className="text-gray-500">{c.heure_debut}–{c.heure_fin}</span>
                <span className="font-medium text-gray-700">{c.matiere}</span>
                <button onClick={() => supprimer(c.i)}
                  className="ml-auto text-rose-400 hover:text-red-500">×</button>
              </div>
            ))}
          </div>
        ))}
        {creneaux.length === 0 && <span className="text-sm text-gray-400">Aucun créneau.</span>}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={enregistrer} disabled={isPending}
          className="bg-rose-700 text-white rounded-lg px-4 py-2 font-semibold hover:bg-rose-800 disabled:opacity-50">
          {isPending ? 'Enregistrement...' : "Enregistrer l'emploi du temps"}
        </button>
        {saved && !isPending && <span className="text-sm text-green-600">✓ Enregistré</span>}
      </div>
      <p className="text-xs text-gray-400">
        Les cahiers journaux déjà générés ne changent pas ; les nouveaux utiliseront ce nouvel emploi du temps.
      </p>
    </div>
  )
}
