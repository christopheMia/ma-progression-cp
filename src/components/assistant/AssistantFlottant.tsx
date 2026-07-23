'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import IaImport from '@/components/setup/IaImport'
import { enregistrerProgressionMatiere } from '@/lib/actions/progression-matiere'
import { enregistrerProgressionPeriode } from '@/lib/actions/progression-periode'
import type { ProgressionSemaine } from '@/data/manuels'
import { Sparkles, X, Check } from 'lucide-react'
import Bouton from '@/components/ui/Bouton'

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

  async function sauvegarder(
    matiere: string,
    progression: ProgressionSemaine[],
    periode?: number,
    nomManuel?: string,
  ) {
    // Import d'une periode : on ne remplace que ses semaines, les autres periodes
    // deja saisies restent intactes.
    if (periode) {
      const { premiereSemaine, derniereSemaine, debordement } =
        await enregistrerProgressionPeriode(matiere, periode, progression, nomManuel)
      setEnregistre(
        `Période ${periode} « ${matiere} » enregistrée sur les semaines ${premiereSemaine} à ${derniereSemaine}` +
        (debordement > 0
          ? ` (${debordement} semaine${debordement > 1 ? 's' : ''} de plus que la période, placée${debordement > 1 ? 's' : ''} juste après)`
          : '')
      )
      return
    }
    await enregistrerProgressionMatiere(matiere, progression, nomManuel)
    setEnregistre(
      `Progression « ${matiere} »${nomManuel ? ` (${nomManuel})` : ''} enregistrée`)
  }

  return (
    <>
      {/* Sur iPhone, la barre du navigateur et l'indicateur d'accueil mangent le
          bas de l'ecran : `env(safe-area-inset-bottom)` remonte le bouton
          au-dessus de cette zone. Sans ca, il peut etre partiellement ou
          totalement masque sur mobile. z-40 pour passer devant tout le contenu. */}
      <Bouton type="button" variant="principal" size="lg" icon={Sparkles}
        onClick={() => setOuvert(true)} aria-expanded={ouvert}
        style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        className="fixed right-4 sm:right-5 z-40 shadow-lg print:hidden">
        Mon assistant
      </Bouton>

      {ouvert && (
        <div className="fixed inset-0 z-40 flex justify-end print:hidden">
          <button type="button" aria-label="Fermer l'assistant" onClick={() => setOuvert(false)}
            className="absolute inset-0 bg-slate-900/40" />

          <aside role="dialog" aria-modal="true" aria-label="Mon assistant"
            className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-pop-in">
            <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-violet-600 text-white">
              <Sparkles aria-hidden="true" className="w-5 h-5" />
              <h2 className="font-semibold">Mon assistant</h2>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer"
                className="ml-auto rounded-lg p-1 hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
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
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-1.5">
                      <Check size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{enregistre}</span>
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
