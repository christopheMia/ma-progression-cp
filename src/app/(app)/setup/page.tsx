'use client'
import { useState } from 'react'
import ManualSelector from '@/components/setup/ManualSelector'
import RentreeDatePicker from '@/components/setup/RentreeDatePicker'
import StudentListEditor from '@/components/setup/StudentListEditor'
import TimetableGrid, { type Creneau } from '@/components/TimetableGrid'
import { TRAME_EDT_CP } from '@/data/trame-edt'
import { genererEdtCP } from '@/lib/edt-generator'
import DemoButton from '@/components/DemoButton'
import { creerClasse } from '@/lib/actions/setup'
import type { ProgressionSemaine } from '@/data/manuels'

type WizardData = {
  manuelId: string
  rentreeDate: string
  eleves: string[]
  emploiDuTemps: Array<{ jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur?: string | null; type?: 'cours' | 'routine' }>
  customProgression?: ProgressionSemaine[]
  /** Brouillon complet de l'EDT, conserve entre allers-retours d'etapes. */
  emploiDuTempsDraft?: Creneau[]
}

// Convertit une trame (generateur ou defaut) au format d'edition de la grille.
function versCreneaux(trame: typeof TRAME_EDT_CP): Creneau[] {
  return trame.map(c => ({
    jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
    matiere: c.matiere, couleur: c.couleur, couleur_texte: null,
    texte_gras: false, texte_italique: false, texte_souligne: false,
    type: c.type, visible_journal: true,
  }))
}

// Deux bases possibles pour l'EDT du setup :
//  - "quotas" : genere depuis le volume horaire officiel (blocs larges au bon
//    volume), l'enseignant ajuste ensuite ;
//  - "vide" : on garde le cadre de journee (rituels, recreations, dejeuner) mais
//    on efface les matieres de cours, l'enseignant remplit lui-meme.
const TRAME_INITIALE: Creneau[] = versCreneaux(TRAME_EDT_CP)
const GRILLE_VIDE: Creneau[] = TRAME_INITIALE.map(c =>
  c.type === 'routine' ? c : { ...c, matiere: '', couleur: null })
function edtDepuisQuotas(): Creneau[] {
  return versCreneaux(genererEdtCP())
}

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<WizardData>>({})
  const [loading, setLoading] = useState(false)

  const stepTitles = ['Ta méthode de lecture', 'Date de la rentrée', 'Tes élèves', 'Ton emploi du temps']
  const stepHelp = [
    'Dépose le PDF de ton manuel de lecture (ou colle son sommaire) : l’IA construit ta progression de l’année, tu pourras tout corriger ensuite.',
    'Choisis le jour de la rentrée : l’appli place automatiquement les 36 semaines de l’année.',
    'Ajoute les prénoms de tes élèves. Tu peux aussi le faire plus tard, dans Paramètres.',
    'Indique tes horaires de la semaine : ils servent à pré-remplir ton cahier journal jour par jour.',
  ]

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
          <p className="text-sm text-gray-500">Étape {step}/4 — <strong className="text-violet-700">{stepTitles[step - 1]}</strong></p>
          {step > 1 && !loading && (
            <button onClick={() => setStep(s => s - 1)}
              className="text-sm text-violet-600 hover:underline">
              ← Étape précédente
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 bg-violet-50 border border-violet-100 rounded-lg p-3 mt-3 leading-relaxed">
          {stepHelp[step - 1]}
        </p>
      </div>

      {step === 1 && (
        <ManualSelector prenom={undefined}
          initial={data.manuelId ? { manuelId: data.manuelId, progression: data.customProgression } : undefined}
          onSelect={(manuelId, customProgression) => {
            setData(d => ({ ...d, manuelId, customProgression }))
            setStep(2)
          }} />
      )}
      {step === 2 && (
        <RentreeDatePicker initial={data.rentreeDate}
          onSelect={rentreeDate => { setData(d => ({ ...d, rentreeDate })); setStep(3) }} />
      )}
      {step === 3 && (
        <StudentListEditor initial={data.eleves}
          onSelect={eleves => { setData(d => ({ ...d, eleves })); setStep(4) }} />
      )}
      {step === 4 && !data.emploiDuTempsDraft && (
        <div className="space-y-4">
          <p className="text-gray-700">
            Comment veux-tu partir ? Tu pourras tout modifier ensuite.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <button type="button"
              onClick={() => setData(d => ({ ...d, emploiDuTempsDraft: edtDepuisQuotas() }))}
              className="text-left border-2 border-violet-300 rounded-xl p-4 hover:bg-violet-50">
              <span className="block font-semibold text-violet-800">✨ Générer selon les quotas officiels</span>
              <span className="block text-sm text-gray-600 mt-1">
                L&apos;appli pose les blocs (Français 10h, Maths 5h, EPS 3h, Questionner le monde 2h30, Arts 2h, Anglais 1h30) au bon volume. Tu ajustes.
              </span>
            </button>
            <button type="button"
              onClick={() => setData(d => ({ ...d, emploiDuTempsDraft: GRILLE_VIDE }))}
              className="text-left border-2 border-violet-200 rounded-xl p-4 hover:bg-violet-50">
              <span className="block font-semibold text-violet-800">📝 Partir d&apos;une grille vide</span>
              <span className="block text-sm text-gray-600 mt-1">
                Le cadre de la journée (rituels, récréations, déjeuner) est posé, tu remplis toi-même les matières.
              </span>
            </button>
          </div>
        </div>
      )}
      {step === 4 && data.emploiDuTempsDraft && (
        <div className="space-y-3">
          <button type="button"
            onClick={() => setData(d => ({ ...d, emploiDuTempsDraft: undefined }))}
            className="text-sm text-violet-600 hover:underline">
            ‹ Changer de base d&apos;emploi du temps
          </button>
          <TimetableGrid
            initial={data.emploiDuTempsDraft}
            onChange={creneaux => setData(d => ({ ...d, emploiDuTempsDraft: creneaux }))}
            saving={loading}
            finishLabel="🎉 Générer ma progression annuelle"
            onSave={(creneaux) => handleFinish(creneaux.map((c, i) => ({ ...c, ordre: i })))}
          />
        </div>
      )}
    </div>
  )
}
