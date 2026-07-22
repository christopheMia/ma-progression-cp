/**
 * Orchestre le remplacement d'un jeu de lignes sans supprimer l'ancienne
 * version avant que la nouvelle soit disponible.
 *
 * Si le nettoyage des anciennes lignes echoue, les nouvelles sont retirees
 * pour restaurer l'etat de depart. Les fonctions passees en argument portent
 * les appels a la base, ce qui garde cette logique testable sans Supabase.
 */
export async function remplacerSansPerte({
  anciensIds,
  insererNouveau,
  supprimerIds,
}: {
  anciensIds: string[]
  insererNouveau: () => Promise<string[]>
  supprimerIds: (ids: string[]) => Promise<void>
}): Promise<void> {
  const nouveauxIds = await insererNouveau()

  if (!anciensIds.length) return
  try {
    await supprimerIds(anciensIds)
  } catch (suppressionError) {
    if (nouveauxIds.length) {
      try {
        await supprimerIds(nouveauxIds)
      } catch (retourError) {
        const initial = suppressionError instanceof Error
          ? suppressionError.message
          : String(suppressionError)
        const retour = retourError instanceof Error ? retourError.message : String(retourError)
        throw new Error(`Remplacement impossible (${initial}) et retour arrière incomplet (${retour}).`)
      }
    }
    throw suppressionError
  }
}
