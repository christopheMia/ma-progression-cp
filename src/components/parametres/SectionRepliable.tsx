'use client'
import { useEffect, useId, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/** Événement envoyé par le sommaire : ouvre la section visée (ou toutes). */
export const EVENEMENT_SECTIONS = 'parametres:sections'
export type DetailEvenementSections = { id: string } | { toutes: 'ouvrir' | 'reduire' }

const PREFIXE_STOCKAGE = 'parametres.reduite.'

const TONS = {
  normal: { cadre: 'bg-white border', titre: 'text-gray-700', bouton: 'text-violet-700 hover:bg-violet-50' },
  demo: { cadre: 'bg-white border border-violet-200', titre: 'text-violet-700', bouton: 'text-violet-700 hover:bg-violet-50' },
  danger: { cadre: 'bg-white border-2 border-red-200', titre: 'text-red-700', bouton: 'text-red-700 hover:bg-red-50' },
} as const

/**
 * Une section de la page Paramètres qu'on peut réduire à sa seule ligne de
 * titre, par un VRAI bouton « Réduire / Ouvrir » (demande de Christophe du
 * 17/10/2026 : la page était trop longue à faire défiler).
 *
 * Le contenu reste monté quand la section est réduite (`hidden`) : un éditeur
 * en cours de saisie ne perd rien. Les boutons d'action du titre, eux,
 * disparaissent avec le contenu, pour qu'une section réduite ne tienne qu'en
 * une ligne et qu'aucune remise à zéro ne se clique par mégarde.
 *
 * L'état est mémorisé dans le navigateur, pour retrouver la page comme on l'a
 * laissée. Une section visée par le sommaire, ou par un lien `#id`, s'ouvre.
 */
export default function SectionRepliable({ id, titre, headerRight, ton = 'normal', children }: {
  id: string
  titre: string
  headerRight?: React.ReactNode
  ton?: keyof typeof TONS
  children: React.ReactNode
}) {
  const [ouverte, setOuverte] = useState(true)
  const idContenu = useId()
  const styles = TONS[ton]

  useEffect(() => {
    try {
      if (window.localStorage.getItem(PREFIXE_STOCKAGE + id) === '1') setOuverte(false)
    } catch {
      // Stockage indisponible (navigation privée stricte) : la section reste ouverte.
    }
    if (window.location.hash === `#${id}`) setOuverte(true)

    function surEvenement(event: Event) {
      const detail = (event as CustomEvent<DetailEvenementSections>).detail
      if ('toutes' in detail) changer(detail.toutes === 'ouvrir')
      else if (detail.id === id) changer(true)
    }
    function surAncre() {
      if (window.location.hash === `#${id}`) changer(true)
    }
    window.addEventListener(EVENEMENT_SECTIONS, surEvenement)
    window.addEventListener('hashchange', surAncre)
    return () => {
      window.removeEventListener(EVENEMENT_SECTIONS, surEvenement)
      window.removeEventListener('hashchange', surAncre)
    }
    // `changer` ne dépend que de `id`, déjà dans la liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function changer(ouvrir: boolean) {
    setOuverte(ouvrir)
    try {
      if (ouvrir) window.localStorage.removeItem(PREFIXE_STOCKAGE + id)
      else window.localStorage.setItem(PREFIXE_STOCKAGE + id, '1')
    } catch {
      // Sans stockage, le choix vaut pour cette visite seulement.
    }
  }

  return (
    <section id={id} className={`${styles.cadre} rounded-2xl p-5 scroll-mt-24`}>
      <div className={`flex items-center justify-between gap-3 flex-wrap ${ouverte ? 'mb-4' : ''}`}>
        <h2 className={`font-bold ${styles.titre}`}>{titre}</h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {ouverte && headerRight}
          <button
            type="button"
            onClick={() => changer(!ouverte)}
            aria-expanded={ouverte}
            aria-controls={idContenu}
            aria-label={`${ouverte ? 'Réduire' : 'Ouvrir'} la section ${titre}`}
            className={`flex items-center gap-1 rounded-lg border border-current/20 px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/70 ${styles.bouton}`}
          >
            {ouverte ? 'Réduire' : 'Ouvrir'}
            {ouverte
              ? <ChevronUp size={14} aria-hidden="true" />
              : <ChevronDown size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div id={idContenu} hidden={!ouverte}>
        {children}
      </div>
    </section>
  )
}
