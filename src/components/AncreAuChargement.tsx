'use client'
import { useEffect } from 'react'

/**
 * Rejoue l'ancre de l'URL une fois le VRAI contenu affiche.
 *
 * Pourquoi ce composant existe : les pages qui ont un `loading.tsx` affichent
 * d'abord un squelette. Quand le routeur veut honorer le `#eleves` d'un lien
 * venu de l'accueil, la section cible n'existe pas encore : le navigateur reste
 * en haut, et personne ne rejoue l'ancre quand le contenu arrive. L'ancre etait
 * donc silencieusement perdue, ce qui revenait a ouvrir les paramètres tout en
 * haut, exactement ce qu'un lien cible doit eviter.
 *
 * A monter dans une page qui a un `loading.tsx` ET des ancres.
 */
export default function AncreAuChargement() {
  useEffect(() => {
    const cible = decodeURIComponent(window.location.hash.slice(1))
    if (!cible) return

    // Une image d'avance : la cible vient tout juste d'etre montee.
    const image = requestAnimationFrame(() => {
      // `scroll-margin-top` sur la cible est respecte : l'en-tete collant ne
      // recouvre pas le titre de la section.
      document.getElementById(cible)?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(image)
  }, [])

  return null
}
