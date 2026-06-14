'use client'
import { useState } from 'react'

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
const MATIERES = ['Lecture', 'Écriture', 'Mathématiques', 'Explorer le monde', 'Arts plastiques', 'Éducation musicale', 'EPS', 'EMC', 'Langue vivante']

type Creneau = { jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number }

export default function TimetableEditor({ onFinish, loading }: {
  onFinish: (edt: Creneau[]) => void
  loading: boolean
}) {
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [jour, setJour] = useState('lundi')
  const [debut, setDebut] = useState('09:00')
  const [fin, setFin] = useState('09:45')
  const [matiere, setMatiere] = useState('Lecture')

  function ajouter() {
    setCreneaux(c => [...c, { jour, heure_debut: debut, heure_fin: fin, matiere, ordre: c.length }])
  }

  const parJour = JOURS.map(j => ({ jour: j, creneaux: creneaux.filter(c => c.jour === j) }))

  return (
    <div className="space-y-4">
      <p className="text-gray-600">Saisissez votre emploi du temps type. Vous pourrez le modifier plus tard.</p>
      <p className="text-xs text-gray-400">Pour chaque créneau : jour + heure de début + heure de fin + matière, puis « + Ajouter ce créneau ». Ex : lundi · 09:00–09:45 · Lecture.</p>

      <div className="grid grid-cols-2 gap-2">
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
        <button onClick={ajouter} className="col-span-2 bg-gray-100 border-2 border-dashed rounded-lg p-2 hover:bg-gray-200">
          + Ajouter ce créneau
        </button>
      </div>

      <div className="space-y-2">
        {parJour.filter(j => j.creneaux.length > 0).map(({ jour, creneaux }) => (
          <div key={jour}>
            <div className="text-sm font-semibold text-gray-500 uppercase mb-1">{jour}</div>
            {creneaux.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-indigo-50 rounded p-2 mb-1">
                <span className="text-gray-500">{c.heure_debut}–{c.heure_fin}</span>
                <span className="font-medium">{c.matiere}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={() => onFinish(creneaux)} disabled={loading}
        className="w-full bg-green-600 text-white rounded-xl p-4 font-semibold hover:bg-green-700 disabled:opacity-50">
        {loading ? "Génération de l'année..." : '🎉 Générer ma progression annuelle'}
      </button>
    </div>
  )
}
