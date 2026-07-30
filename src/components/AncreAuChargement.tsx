'use client'
import { useEffect } from 'react'

/**
 * Fait atterrir les liens a ancre (#section) sur la bonne section, meme sur
 * les pages qui ont un `loading.tsx`.
 *
 * Pourquoi ce duo existe (deux bugs reels, 30/07/2026) :
 * 1. Le squelette de chargement avale l'ancre : quand le routeur veut honorer
 *    `#eleves`, la section n'existe pas encore, et personne ne rejoue l'ancre
 *    quand le vrai contenu arrive.
 * 2. `window.location.hash` n'est PAS fiable au montage d'une page : selon le
 *    moment ou le routeur synchronise l'URL, on peut y lire l'ancre de la
 *    visite PRECEDENTE. Christophe l'a vu deux fois : la carte « Prochaine
 *    semaine » (lien sans ancre) atterrissait sur le suivi des eleves.
 *
 * La solution ne fait donc plus confiance a l'URL pour les navigations
 * internes : le CLIC memorise sa destination (chemin + ancre) dans le
 * stockage de session, et la page d'arrivee consomme cette note. L'URL n'est
 * lue qu'au premier montage apres un vrai chargement (F5, lien externe), le
 * seul cas ou elle est sure.
 *
 * - `MemoireAncre` : monte UNE fois dans le layout, ecoute les clics sur tout
 *   lien interne porteur d'ancre.
 * - `AncreAuChargement` : monte dans chaque page cible (qui a un loading.tsx
 *   et des sections a ancre), rejoue l'ancre une fois le contenu la.
 */

const CLE = 'aios.ancre'
/** Une note plus vieille que ca ne correspond plus a une navigation en cours. */
const FRAICHEUR_MS = 15_000

let chargementInitial = true

/** Uniquement pour les tests : rejoue « premiere page apres un vrai chargement ». */
export function reinitialiserPourTests() {
  chargementInitial = true
}

type AncreMemorisee = { chemin: string; ancre: string; t: number }

function memoriser(chemin: string, ancre: string) {
  try {
    sessionStorage.setItem(CLE, JSON.stringify({ chemin, ancre, t: Date.now() } satisfies AncreMemorisee))
  } catch {
    // Stockage indisponible : on perd l'ancre, jamais la navigation.
  }
}

function consommer(): string | null {
  try {
    const brut = sessionStorage.getItem(CLE)
    if (!brut) return null
    sessionStorage.removeItem(CLE)
    const memo = JSON.parse(brut) as AncreMemorisee
    // La note ne vaut que pour SA destination : si la navigation a ete
    // abandonnee ou detournee, on ne defile pas au hasard.
    if (memo.chemin !== window.location.pathname) return null
    if (Date.now() - memo.t > FRAICHEUR_MS) return null
    return memo.ancre
  } catch {
    return null
  }
}

export function MemoireAncre() {
  useEffect(() => {
    function surClic(evenement: MouseEvent) {
      const lien = (evenement.target as Element | null)?.closest?.('a[href]')
      if (!(lien instanceof HTMLAnchorElement)) return
      const url = new URL(lien.href, window.location.href)
      if (url.origin !== window.location.origin || !url.hash) return
      memoriser(url.pathname, decodeURIComponent(url.hash.slice(1)))
    }
    // Phase de capture : on note l'intention avant que quiconque navigue.
    document.addEventListener('click', surClic, true)
    return () => document.removeEventListener('click', surClic, true)
  }, [])

  return null
}

export default function AncreAuChargement() {
  useEffect(() => {
    const premierePage = chargementInitial
    chargementInitial = false

    // Une image d'avance : la cible vient tout juste d'etre montee, et
    // `scroll-margin-top` sur la cible tient l'en-tete collant a distance.
    const image = requestAnimationFrame(() => {
      const cible = consommer()
        ?? (premierePage ? decodeURIComponent(window.location.hash.slice(1)) : '')
      if (!cible) return
      document.getElementById(cible)?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(image)
  }, [])

  return null
}
