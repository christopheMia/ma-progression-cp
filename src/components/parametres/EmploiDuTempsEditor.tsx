'use client'
import { useState, useTransition } from 'react'
import { updateEmploiDuTemps } from '@/lib/actions/parametres'

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
const MATIERES = ['Lecture', 'Écriture', 'Mathématiques', 'Explorer le monde', 'Arts plastiques', 'Éducation musicale', 'EPS', 'EMC', 'Langue vivante']

type Creneau = { jour: string; heure_debut: string; heure_fin: string; matiere: string }

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
      <p className="text-xs text-gray-400">Choisissez jour + horaires + matière, puis « + Ajouter ce créneau ». Ex : lundi · 09:00–09:45 · Lecture.</p>
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
        {parJour.filter(j => j.items.length > 0).map(({ jour, items }) => (
          <div key={jour}>
            <div className="text-sm font-semibold text-gray-500 uppercase mb-1">{jour}</div>
            {items.map(c => (
              <div key={c.i} className="flex items-center gap-2 text-sm bg-indigo-50 rounded p-2 mb-1">
                <span className="text-gray-500">{c.heure_debut}–{c.heure_fin}</span>
                <span className="font-medium text-gray-700">{c.matiere}</span>
                <button onClick={() => supprimer(c.i)}
                  className="ml-auto text-indigo-400 hover:text-red-500">×</button>
              </div>
            ))}
          </div>
        ))}
        {creneaux.length === 0 && <span className="text-sm text-gray-400">Aucun créneau.</span>}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={enregistrer} disabled={isPending}
          className="bg-indigo-700 text-white rounded-lg px-4 py-2 font-semibold hover:bg-indigo-800 disabled:opacity-50">
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
