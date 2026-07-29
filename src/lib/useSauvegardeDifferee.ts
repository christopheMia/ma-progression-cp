'use client'

import { useEffect, useRef } from 'react'

/**
 * Enregistre APRES la frappe, pas pendant.
 *
 * Avant, chaque lettre tapée dans une observation ou dans un bilan déclenchait
 * une action serveur : un aller-retour Supabase et un `revalidatePath` par
 * caractère. Sur un téléphone en 4G, la saisie devenait poussive et les
 * boutons clignotaient en « Enregistrement... » (retour de Christophe du
 * 29/07 : « c'est encore un peu lent »).
 *
 * `programmer(cle, action)` remplace l'enregistrement en attente pour cette
 * clé : seul le dernier compte, et il part une fois la frappe finie. Les
 * gestes uniques (une pastille, une date, un ajout) ne passent pas par ici :
 * eux doivent partir tout de suite.
 *
 * Ce qui reste en attente est envoyé si le composant disparaît, sinon la
 * dernière phrase tapée serait perdue en changeant de page.
 */
export function useSauvegardeDifferee(delai = 600) {
  const minuteries = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const enAttente = useRef(new Map<string, () => void>())

  useEffect(() => {
    const timers = minuteries.current
    const restes = enAttente.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      for (const action of restes.values()) action()
      timers.clear()
      restes.clear()
    }
  }, [])

  function programmer(cle: string, action: () => void) {
    const precedente = minuteries.current.get(cle)
    if (precedente) clearTimeout(precedente)
    enAttente.current.set(cle, action)
    minuteries.current.set(cle, setTimeout(() => {
      minuteries.current.delete(cle)
      enAttente.current.delete(cle)
      action()
    }, delai))
  }

  return programmer
}
