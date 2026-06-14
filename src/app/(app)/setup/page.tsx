'use client'
import { useState } from 'react'
import ManualSelector from '@/components/setup/ManualSelector'
import RentreeDatePicker from '@/components/setup/RentreeDatePicker'
import StudentListEditor from '@/components/setup/StudentListEditor'
import TimetableEditor from '@/components/setup/TimetableEditor'
import { creerClasse } from '@/lib/actions/setup'
import type { ProgressionSemaine } from '@/data/manuels'

type WizardData = {
  manuelId: string
  rentreeDate: string
  eleves: string[]
  emploiDuTemps: Array<{ jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number }>
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
        <ManualSelector onSelect={(manuelId, customProgression) => {
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
        <TimetableEditor onFinish={handleFinish} loading={loading} />
      )}
    </div>
  )
}
