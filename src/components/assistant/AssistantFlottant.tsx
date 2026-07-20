'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import IaImport from '@/components/setup/IaImport'
import { enregistrerProgressionMatiere } from '@/lib/actions/progression-matiere'
import type { ProgressionSemaine } from '@/data/manuels'

/**
 * "Mon assistant" : bouton TOUJOURS visible (monte dans le layout applicatif),
 * qui ouvre un panneau contenant l'import (PDF ou texte colle) ET le chat de
 * correction. Retour du 20/07 : l'outil IA doit etre central et accessible
 * partout, pas cache au fond des parametres.
 */
export default function AssistantFlottant({ hasClass, prenom }: {
  hasClass: boolean
  prenom?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const [enregistre, setEnregistre] = useState<string | null>(null)

  // Fermeture au clavier : un panneau modal doit toujours pouvoir se fermer
  // sans souris, et l'enseignante travaille souvent au clavier.
  useEffect(() => {
    if (!ouvert) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOuvert(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ouvert])

  async function sauvegarder(matiere: string, progression: ProgressionSemaine[]) {
    await enregistrerProgressionMatiere(matiere, progression)
    setEnregistre(`Progression « ${matiere} » enregistrée ✅`)
  }

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} aria-expanded={ouvert}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-violet-600 text-white shadow-lg px-5 py-3 font-semibold hover:bg-violet-700 focus-visible:ring-4 focus-visible:ring-violet-300 transition-colors print:hidden">
        <span aria-hidden="true" className="text-lg">🤖</span>
        Mon assistant
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-40 flex justify-end print:hidden">
          <button type="button" aria-label="Fermer l'assistant" onClick={() => setOuvert(false)}
            className="absolute inset-0 bg-slate-900/40" />

          <aside role="dialog" aria-modal="true" aria-label="Mon assistant"
            className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-pop-in">
            <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-violet-600 text-white">
              <span aria-hidden="true">🤖</span>
              <h2 className="font-semibold">Mon assistant</h2>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer"
                className="ml-auto rounded-lg px-2 py-1 hover:bg-white/20 transition-colors">✕</button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              {!hasClass ? (
                <p className="text-sm text-slate-600">
                  Configure d&apos;abord ta classe pour utiliser l&apos;assistant.{' '}
                  <Link href="/setup" className="text-violet-600 hover:underline">Commencer la configuration</Link>
                </p>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-3">
                    Dépose un PDF (programmation, planning de période) ou colle ton texte.
                    L&apos;IA lit les tableaux en respectant les lignes et les colonnes, puis tu
                    peux lui demander des corrections en langage naturel.
                  </p>
                  {enregistre && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
                      {enregistre}
                    </p>
                  )}
                  <IaImport prenom={prenom} onSave={sauvegarder} />
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
