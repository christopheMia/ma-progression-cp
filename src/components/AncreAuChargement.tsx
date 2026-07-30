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
    // Le hash se lit DANS le rappel, jamais au montage : les effets des
    // enfants s'executent avant ceux du routeur, donc a cet instant precis
    // window.location peut encore montrer l'entree PRECEDENTE de l'historique.
    // Lu trop tot, le composant rejouait l'ancre de la visite d'avant : apres
    // un passage par /semaine/X#suivi, un lien SANS ancre vers la meme fiche
    // atterrissait sur le suivi (vu par Christophe le 30/07). Une frame plus
    // tard, le routeur a fini d'ecrire la vraie URL.
    const image = requestAnimationFrame(() => {
      const cible = decodeURIComponent(window.location.hash.slice(1))
      if (!cible) return
      // `scroll-margin-top` sur la cible est respecte : l'en-tete collant ne
      // recouvre pas le titre de la section.
      document.getElementById(cible)?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(image)
  }, [])

  return null
}
