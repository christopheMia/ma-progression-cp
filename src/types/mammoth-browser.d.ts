/**
 * Le paquet `mammoth` ne publie de types que pour son entree Node. La version
 * navigateur (`mammoth/mammoth.browser`) est la seule utilisable ici, car on
 * lit le fichier Word cote client pour ne pas envoyer le document sur le
 * reseau. On declare donc la surface reellement utilisee, rien de plus.
 */
declare module 'mammoth/mammoth.browser' {
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
  ): Promise<{ value: string; messages: { type: string; message: string }[] }>
}
