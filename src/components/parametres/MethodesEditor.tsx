'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import IaImport from '@/components/setup/IaImport'
import { enregistrerProgressionMatiere } from '@/lib/actions/progression-matiere'
import { MATIERES_METHODE, LABELS_MATIERE, type MatiereMethode } from '@/lib/matieres'
import type { ProgressionSemaine } from '@/data/manuels'

export default function MethodesEditor({ prenom }: { prenom?: string }) {
  const [ouverte, setOuverte] = useState<MatiereMethode | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function save(matiere: MatiereMethode, progression: ProgressionSemaine[]) {
    await enregistrerProgressionMatiere(matiere, progression)
    setMessage(`${LABELS_MATIERE[matiere]} enregistré ✓`)
    setOuverte(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Importe ou corrige chaque méthode séparément. Réimporter une matière ne touche pas l&apos;autre, ni ton suivi des élèves.
      </p>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {MATIERES_METHODE.map(m => (
        <div key={m} className="border rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700">{LABELS_MATIERE[m]}</span>
            <button
              onClick={() => { setMessage(null); setOuverte(ouverte === m ? null : m) }}
              className="text-sm border border-violet-300 text-violet-700 rounded-lg px-3 py-1.5 hover:bg-violet-50">
              {ouverte === m ? 'Fermer' : '🤖 Importer / corriger via l’IA'}
            </button>
          </div>
          {ouverte === m && (
            <div className="mt-3">
              <IaImport prenom={prenom} matiereFixe={m} onSave={save} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
