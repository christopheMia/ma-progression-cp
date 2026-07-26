'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, X } from 'lucide-react'
import SourceImporter from '@/components/methodes/SourceImporter'
import ChatAssistant from '@/components/assistant/ChatAssistant'
import Bouton from '@/components/ui/Bouton'
import { ajouterSourceProgression } from '@/lib/actions/methode-sources'
import type { SourceProgression } from '@/lib/progression-sources'
import type { ZoneScolaire } from '@/lib/calendrier-officiel'
import {
  CLE_POSITION,
  contraindre,
  estGlissement,
  lirePositionMemorisee,
  type Position,
} from '@/lib/position-flottante'

type Onglet = 'discuter' | 'document'

export default function AssistantFlottant({
  hasClass,
  prenom,
  rentreeDate,
  zone,
  matieres,
}: {
  hasClass: boolean
  prenom?: string
  rentreeDate?: string
  zone?: ZoneScolaire
  matieres?: string[]
}) {
  const [ouvert, setOuvert] = useState(false)
  // La conversation d'abord: c'est ce qu'on attend en cliquant « Mon assistant ».
  // L'import reste a un clic, mais il ne monopolise plus le panneau.
  const [onglet, setOnglet] = useState<Onglet>('discuter')
  const [message, setMessage] = useState<{
    type: 'succes' | 'erreur'
    texte: string
  } | null>(null)
  const ajoutRef = useRef(false)
  const router = useRouter()

  // Position libre du bouton. null = position par defaut (sous l'en-tete, a
  // gauche). Elle n'est lue qu'apres le montage pour ne pas casser le rendu
  // serveur, qui n'a pas acces au stockage local.
  const [position, setPosition] = useState<Position | null>(null)
  const boutonRef = useRef<HTMLDivElement | null>(null)
  const glissementRef = useRef<{
    pointerId: number
    depart: Position
    decalage: Position
    aBouge: boolean
  } | null>(null)
  const [enDeplacement, setEnDeplacement] = useState(false)
  // Le pointerup precede le click: sans ce temoin, relacher apres un glissement
  // ouvrirait le panneau, et le bouton serait impossible a deplacer.
  const vientDeGlisserRef = useRef(false)

  useEffect(() => {
    const memorisee = lirePositionMemorisee(window.localStorage.getItem(CLE_POSITION))
    if (!memorisee) return
    const boite = boutonRef.current?.getBoundingClientRect()
    setPosition(contraindre(
      memorisee,
      { largeur: boite?.width ?? 44, hauteur: boite?.height ?? 44 },
      { largeur: window.innerWidth, hauteur: window.innerHeight },
    ))
  }, [])

  // La fenetre peut retrecir apres coup: on ne laisse jamais le bouton dehors.
  useEffect(() => {
    if (!position) return
    function replacer() {
      const boite = boutonRef.current?.getBoundingClientRect()
      setPosition(actuelle => actuelle && contraindre(
        actuelle,
        { largeur: boite?.width ?? 44, hauteur: boite?.height ?? 44 },
        { largeur: window.innerWidth, hauteur: window.innerHeight },
      ))
    }
    window.addEventListener('resize', replacer)
    return () => window.removeEventListener('resize', replacer)
  }, [position])

  function commencerGlissement(event: React.PointerEvent<HTMLDivElement>) {
    // Bouton gauche / doigt / stylet seulement.
    if (event.button !== 0) return
    const boite = boutonRef.current?.getBoundingClientRect()
    if (!boite) return
    glissementRef.current = {
      pointerId: event.pointerId,
      depart: { x: event.clientX, y: event.clientY },
      decalage: { x: event.clientX - boite.left, y: event.clientY - boite.top },
      aBouge: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function suivreGlissement(event: React.PointerEvent<HTMLDivElement>) {
    const glissement = glissementRef.current
    if (!glissement || glissement.pointerId !== event.pointerId) return
    const courant = { x: event.clientX, y: event.clientY }
    if (!glissement.aBouge && !estGlissement(glissement.depart, courant)) return

    glissement.aBouge = true
    setEnDeplacement(true)
    const boite = boutonRef.current?.getBoundingClientRect()
    setPosition(contraindre(
      { x: courant.x - glissement.decalage.x, y: courant.y - glissement.decalage.y },
      { largeur: boite?.width ?? 44, hauteur: boite?.height ?? 44 },
      { largeur: window.innerWidth, hauteur: window.innerHeight },
    ))
  }

  function terminerGlissement(event: React.PointerEvent<HTMLDivElement>) {
    const glissement = glissementRef.current
    if (!glissement || glissement.pointerId !== event.pointerId) return
    glissementRef.current = null
    setEnDeplacement(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!glissement.aBouge) return
    // Un vrai deplacement : on memorise, et on empeche l'ouverture du panneau.
    vientDeGlisserRef.current = true
    setPosition(actuelle => {
      if (actuelle) window.localStorage.setItem(CLE_POSITION, JSON.stringify(actuelle))
      return actuelle
    })
  }

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
        ref={boutonRef}
        onPointerDown={commencerGlissement}
        onPointerMove={suivreGlissement}
        onPointerUp={terminerGlissement}
        onPointerCancel={terminerGlissement}
        style={position
          ? { top: position.y, left: position.x }
          : { top: 'calc(4.5rem + env(safe-area-inset-top, 0px))' }}
        className={`fixed z-50 touch-none print:hidden ${
          position ? '' : 'left-4 sm:left-5'
        } ${enDeplacement ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[3px] overflow-hidden rounded-[15px]"
        >
          <span className="absolute left-1/2 top-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2 animate-[spin_1.2s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_240deg,#fde68a_300deg,#ffffff_335deg,#fef3c7_352deg,transparent_360deg)] motion-reduce:animate-none" />
        </span>
        <Bouton
          type="button"
          variant="principal"
          size="md"
          icon={Sparkles}
          onClick={() => {
            if (vientDeGlisserRef.current) {
              vientDeGlisserRef.current = false
              return
            }
            setOuvert(true)
          }}
          aria-expanded={ouvert}
          aria-label="Mon assistant"
          title="Clique pour ouvrir, glisse pour déplacer"
          className="h-11 w-11 justify-center gap-0 p-0 shadow-lg shadow-violet-500/40 transition-[width] duration-300 ease-out [&_svg]:shrink-0 hover:w-auto hover:gap-2 hover:px-4 focus-visible:w-auto focus-visible:gap-2 focus-visible:px-4 motion-reduce:transition-none"
        >
          {/* Replie sur le seul logo ; le libelle se deroule au survol et a la
              tabulation clavier. Il reste dans le DOM pour les lecteurs d'ecran. */}
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover/btn:max-w-40 group-hover/btn:opacity-100 group-focus-visible/btn:max-w-40 group-focus-visible/btn:opacity-100 motion-reduce:transition-none">
            Mon assistant
          </span>
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

            {hasClass && (
              <div
                role="tablist"
                aria-label="Que veux-tu faire ?"
                className="flex gap-1 border-b border-slate-200 bg-slate-50 p-2"
              >
                {([
                  ['discuter', 'Discuter'],
                  ['document', 'Ajouter un document'],
                ] as const).map(([cle, libelle]) => (
                  <button
                    key={cle}
                    type="button"
                    role="tab"
                    aria-selected={onglet === cle}
                    onClick={() => setOnglet(cle)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none ${
                      onglet === cle
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {libelle}
                  </button>
                ))}
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
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
              ) : onglet === 'discuter' ? (
                <ChatAssistant
                  prenom={prenom}
                  rentreeDate={rentreeDate}
                  matieres={matieres}
                />
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
                    rentreeDate={rentreeDate}
                    zone={zone}
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
