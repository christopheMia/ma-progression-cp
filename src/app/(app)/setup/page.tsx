'use client'
import { useState } from 'react'
import { ArrowLeft, LayoutGrid, WandSparkles } from 'lucide-react'
import ProgressionsSetup from '@/components/setup/ProgressionsSetup'
import RentreeDatePicker from '@/components/setup/RentreeDatePicker'
import StudentListEditor from '@/components/setup/StudentListEditor'
import TimetableGrid, { type Creneau } from '@/components/TimetableGrid'
import Bouton from '@/components/ui/Bouton'
import { TRAME_EDT_CP } from '@/data/trame-edt'
import { genererEdtCP } from '@/lib/edt-generator'
import DemoButton from '@/components/DemoButton'
import { creerClasse } from '@/lib/actions/setup'
import type { DonneesCreationClasse } from '@/lib/setup-creation'

type WizardData = Omit<DonneesCreationClasse, 'emploiDuTemps'> & {
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
  const [error, setError] = useState<string | null>(null)

  const stepTitles = ['Tes progressions', 'Date de la rentrée', 'Tes élèves', 'Ton emploi du temps']
  const stepHelp = [
    'Ajoute les documents que tu as déjà, pour toutes tes matières. Tu peux aussi continuer sans source et tout compléter plus tard.',
    'Choisis le jour de la rentrée et ta zone : l’appli place les 36 semaines en sautant les vacances.',
    'Ajoute les prénoms de tes élèves. Tu peux aussi le faire plus tard, dans Paramètres.',
    'Indique tes horaires de la semaine : ils servent à pré-remplir ton cahier journal jour par jour.',
  ]

  async function handleFinish(emploiDuTemps: DonneesCreationClasse['emploiDuTemps']) {
    if (!data.rentreeDate || !data.zoneScolaire) {
      setError('La date de rentrée et la zone scolaire sont nécessaires pour continuer.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await creerClasse({
        sourcesProgression: data.sourcesProgression ?? [],
        rentreeDate: data.rentreeDate,
        zoneScolaire: data.zoneScolaire,
        eleves: data.eleves ?? [],
        emploiDuTemps,
      })
    } catch (erreur) {
      setError(
        `La création de ta classe a échoué : ${
          erreur instanceof Error ? erreur.message : String(erreur)
        }`,
      )
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {step === 1 && !loading && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="text-sm text-violet-900">
            <strong>Juste pour découvrir l&apos;outil ?</strong> Charge une classe d&apos;exemple, déjà remplie partout.
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
          <p className="text-sm text-gray-500">Étape {step}/4 - <strong className="text-violet-700">{stepTitles[step - 1]}</strong></p>
          {step > 1 && !loading && (
            <Bouton type="button" variant="fantome" size="sm" icon={ArrowLeft}
              onClick={() => setStep(s => s - 1)}>
              Étape précédente
            </Bouton>
          )}
        </div>
        <p className="text-sm text-gray-600 bg-violet-50 border border-violet-100 rounded-lg p-3 mt-3 leading-relaxed">
          {stepHelp[step - 1]}
        </p>
      </div>

      {step === 1 && (
        <ProgressionsSetup
          initialSources={data.sourcesProgression}
          onContinue={sources => {
            setData(d => ({ ...d, sourcesProgression: sources }))
            setStep(2)
          }}
        />
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
        >
          {error}
        </p>
      )}
      {step === 2 && (
        <RentreeDatePicker initial={data.rentreeDate} initialZone={data.zoneScolaire ?? 'A'}
          onSelect={(rentreeDate, zoneScolaire) => {
            setData(d => ({ ...d, rentreeDate, zoneScolaire })); setStep(3)
          }} />
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
              <span className="flex items-center gap-2 font-semibold text-violet-800">
                <WandSparkles size={18} aria-hidden="true" />
                Générer selon les quotas officiels
              </span>
              <span className="block text-sm text-gray-600 mt-1">
                L&apos;appli pose les blocs (Français 10h, Maths 5h, EPS 3h, Questionner le monde 2h30, Arts 2h, Anglais 1h30) au bon volume. Tu ajustes.
              </span>
            </button>
            <button type="button"
              onClick={() => setData(d => ({ ...d, emploiDuTempsDraft: GRILLE_VIDE }))}
              className="text-left border-2 border-violet-200 rounded-xl p-4 hover:bg-violet-50">
              <span className="flex items-center gap-2 font-semibold text-violet-800">
                <LayoutGrid size={18} aria-hidden="true" />
                Partir d&apos;une grille vide
              </span>
              <span className="block text-sm text-gray-600 mt-1">
                Le cadre de la journée (rituels, récréations, déjeuner) est posé, tu remplis toi-même les matières.
              </span>
            </button>
          </div>
        </div>
      )}
      {step === 4 && data.emploiDuTempsDraft && (
        <div className="space-y-3">
          <Bouton type="button" variant="fantome" size="sm" icon={ArrowLeft}
            onClick={() => setData(d => ({ ...d, emploiDuTempsDraft: undefined }))}>
            Changer de base d&apos;emploi du temps
          </Bouton>
          <TimetableGrid
            initial={data.emploiDuTempsDraft}
            onChange={creneaux => setData(d => ({ ...d, emploiDuTempsDraft: creneaux }))}
            saving={loading}
            finishLabel="Générer ma progression annuelle"
            onSave={(creneaux) => handleFinish(creneaux.map((c, i) => ({ ...c, ordre: i })))}
          />
        </div>
      )}
    </div>
  )
}
