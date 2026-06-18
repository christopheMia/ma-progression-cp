export const MATIERES_METHODE = ['francais', 'maths'] as const
export type MatiereMethode = (typeof MATIERES_METHODE)[number]

export const LABELS_MATIERE: Record<MatiereMethode, string> = {
  francais: 'Français',
  maths: 'Maths',
}

export function isMatiereMethode(v: string): v is MatiereMethode {
  return (MATIERES_METHODE as readonly string[]).includes(v)
}
