'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, X } from 'lucide-react'
import SourceImporter from '@/components/methodes/SourceImporter'
import Bouton from '@/components/ui/Bouton'
import { ajouterSourceProgression } from '@/lib/actions/methode-sources'
import type { SourceProgression } from '@/lib/progression-sources'

export default function AssistantFlottant({
  hasClass,
  prenom,
}: {
  hasClass: boolean
  prenom?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const [message, setMessage] = useState<{
    type: 'succes' | 'erreur'
    texte: string
  } | null>(null)
  const ajoutRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (!ouvert) return
    function fermerAuClavier(event: KeyboardEvent) {
      if (event.key === 'Escape') setOuvert(false)
    }
    window.addEventListener('keydown', fermerAuClavier)
    return () => window.removeEventListener('keydown', fermerAuClavier)
  }, [ouvert])

  async function ajouter(source: SourceProgression) {
    if (ajoutRef.current) return
    ajoutRef.current = true
    setMessage(null)
    try {
      await ajouterSourceProgression(source)
      setMessage({
        type: 'succes',
        texte: `Document ajouté : ${source.nomSource}`,
      })
      router.refresh()
    } catch (error) {
      const texte = error instanceof Error ? error.message : String(error)
      setMessage({ type: 'erreur', texte })
      throw error
    } finally {
      ajoutRef.current = false
    }
  }

  return (
    <>
      {/* Un trait lumineux court le long de la bordure : un degrade conique
          tourne derriere le bouton, et seul le liseré de 2px deborde. Plus
          elegant qu'un clignotement, et coupe si le systeme demande moins
          d'animations. */}
      <div
        style={{ top: 'calc(5.5rem + env(safe-area-inset-top, 0px))' }}
        className="fixed right-4 z-50 print:hidden sm:right-5"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[3px] overflow-hidden rounded-[15px]"
        >
          <span className="absolute left-1/2 top-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2 animate-[spin_2.5s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_240deg,#fde68a_300deg,#ffffff_335deg,#fef3c7_352deg,transparent_360deg)] motion-reduce:animate-none" />
        </span>
        <Bouton
          type="button"
          variant="principal"
          size="lg"
          icon={Sparkles}
          onClick={() => setOuvert(true)}
          aria-expanded={ouvert}
          className="shadow-lg shadow-violet-500/40"
        >
          Mon assistant
        </Bouton>
      </div>

      {ouvert && (
        <div className="fixed inset-0 z-40 flex justify-end print:hidden">
          <button
            type="button"
            aria-label="Fermer l’assistant"
            onClick={() => setOuvert(false)}
            className="absolute inset-0 bg-slate-900/40"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Mon assistant"
            className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-pop-in"
          >
            <header className="flex items-center gap-2 border-b border-slate-200 bg-violet-600 px-4 py-3 text-white">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
              <h2 className="font-semibold">Mon assistant</h2>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer"
                className="ml-auto rounded-lg p-1 transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              {!hasClass ? (
                <p className="text-sm text-slate-600">
                  Configure d&apos;abord ta classe pour utiliser l&apos;assistant.{' '}
                  <Link
                    href="/setup"
                    className="text-violet-600 hover:underline"
                  >
                    Commencer la configuration
                  </Link>
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-slate-600">
                    Dépose un document de progression. Tu pourras vérifier la matière,
                    la méthode et les notions avant de l’ajouter à ta classe.
                  </p>
                  {message && (
                    <p
                      role={message.type === 'erreur' ? 'alert' : 'status'}
                      className={`mb-3 flex items-start gap-1.5 rounded-lg border px-3 py-2 text-sm ${
                        message.type === 'erreur'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {message.type === 'succes' && (
                        <Check
                          size={16}
                          className="mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span>{message.texte}</span>
                    </p>
                  )}
                  <SourceImporter
                    prenom={prenom}
                    onSourceReady={ajouter}
                  />
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
