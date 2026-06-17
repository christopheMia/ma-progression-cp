'use client'
import { useState } from 'react'
import ManualSelector from '@/components/setup/ManualSelector'
import RentreeDatePicker from '@/components/setup/RentreeDatePicker'
import StudentListEditor from '@/components/setup/StudentListEditor'
import TimetableGrid from '@/components/TimetableGrid'
import { TRAME_EDT_CP } from '@/data/trame-edt'
import DemoButton from '@/components/DemoButton'
import { creerClasse } from '@/lib/actions/setup'
import type { ProgressionSemaine } from '@/data/manuels'

type WizardData = {
  manuelId: string
  rentreeDate: string
  eleves: string[]
  emploiDuTemps: Array<{ jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur?: string | null; type?: 'cours' | 'routine' }>
  customProgression?: ProgressionSemaine[]
}

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<WizardData>>({})
  const [loading, setLoading] = useState(false)

  const stepTitles = ['Manuel de lecture', 'Date de rentrée', 'Mes élèves', 'Emploi du temps']

  async function handleFinish(emploiDuTemps: WizardData['emploiDuTemps']) {
    setLoading(true)
    await creerClasse({ ...data, emploiDuTemps } as WizardData)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {step === 1 && !loading && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="text-sm text-violet-900">
            <strong>Juste pour découvrir l&apos;outil ?</strong> Chargez une classe d&apos;exemple, déjà remplie partout.
          </div>
          <div className="sm:ml-auto"><DemoButton /></div>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-violet-800 mb-2">Configuration de ma classe</h1>
        <div className="flex gap-2">
          {stepTitles.map((title, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i + 1 <= step ? 'bg-violet-600' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-gray-500">Étape {step}/4 — {stepTitles[step - 1]}</p>
          {step > 1 && !loading && (
            <button onClick={() => setStep(s => s - 1)}
              className="text-sm text-violet-600 hover:underline">
              ← Étape précédente
            </button>
          )}
        </div>
      </div>

      {step === 1 && (
        <ManualSelector prenom={undefined} onSelect={(manuelId, customProgression) => {
          setData(d => ({ ...d, manuelId, customProgression }))
          setStep(2)
        }} />
      )}
      {step === 2 && (
        <RentreeDatePicker onSelect={rentreeDate => { setData(d => ({ ...d, rentreeDate })); setStep(3) }} />
      )}
      {step === 3 && (
        <StudentListEditor onSelect={eleves => { setData(d => ({ ...d, eleves })); setStep(4) }} />
      )}
      {step === 4 && (
        <TimetableGrid
          initial={TRAME_EDT_CP.map(c => ({ jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin, matiere: c.matiere, couleur: c.couleur, type: c.type }))}
          saving={loading}
          finishLabel="🎉 Générer ma progression annuelle"
          onSave={(creneaux) => handleFinish(creneaux.map((c, i) => ({ ...c, ordre: i })))}
        />
      )}
    </div>
  )
}
