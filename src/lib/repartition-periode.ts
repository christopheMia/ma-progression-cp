// src/lib/repartition-periode.ts
//
// Repartit une PROGRAMMATION ANNUELLE PAR PERIODE sur les vraies semaines de
// la classe.
//
// Beaucoup de documents d'editeur (ex. "Maths en CP", Acces Editions) ne
// donnent PAS une progression semaine par semaine : ils donnent, pour chaque
// periode et chaque domaine, la liste des apprentissages. C'est le besoin
// exprime par Cecile : importer ses documents et laisser l'application repartir
// l'annee en periodes, pas en 36 semaines saisies a la main.
//
// Cette fonction est PURE : aucun appel reseau, aucune dependance base. Elle
// porte la seule decision pedagogique du mecanisme, donc elle est testee a part.

export type DomainePeriode = { nom: string; items: string[] }
export type PeriodeProgrammation = { numero: number; domaines: DomainePeriode[] }

/** Une ligne de `progression` : les items a travailler une semaine donnee. */
export type SemaineRepartie = { numero: number; items: string[] }

/**
 * Aplatit les domaines d'une periode en une liste ordonnee d'items, chacun
 * prefixe par son domaine. Le prefixe est ce qui permet ensuite de colorer et
 * de regrouper : "Calcul mental : ajouter ou soustraire 2".
 */
export function aplatirDomaines(domaines: DomainePeriode[]): string[] {
  const out: string[] = []
  for (const d of domaines) {
    const nom = d.nom.trim()
    for (const item of d.items) {
      const texte = item.trim()
      if (!texte) continue
      out.push(nom ? `${nom} : ${texte}` : texte)
    }
  }
  return out
}

/**
 * Repartit `items` sur `semaines` en respectant l'ORDRE du document.
 *
 * Regle retenue : part egale, et le reste va aux PREMIERES semaines. Un CP
 * avance plus vite en debut de periode qu'a la veille des vacances, et surtout
 * cela evite qu'une semaine se retrouve vide au milieu.
 *
 * Si le document contient moins d'items que la periode n'a de semaines, les
 * semaines excedentaires restent vides plutot que de recevoir un item invente
 * ou recopie : mieux vaut un trou visible qu'un contenu faux.
 */
export function repartirSurSemaines(items: string[], semaines: number[]): SemaineRepartie[] {
  if (!semaines.length) return []
  if (!items.length) return semaines.map(numero => ({ numero, items: [] }))

  const base = Math.floor(items.length / semaines.length)
  const reste = items.length % semaines.length

  const out: SemaineRepartie[] = []
  let curseur = 0
  for (let i = 0; i < semaines.length; i++) {
    const part = base + (i < reste ? 1 : 0)
    out.push({ numero: semaines[i], items: items.slice(curseur, curseur + part) })
    curseur += part
  }
  return out
}

/**
 * Repartition complete : pour chaque periode du document, on prend les VRAIES
 * semaines de cette periode dans la classe et on y etale ses apprentissages.
 *
 * `semainesParPeriode` vient de la base (`semaines.periode_numero`), jamais
 * d'un nombre fixe : une periode fait 5 a 8 semaines selon l'annee et la zone.
 * Une periode absente de la classe est ignoree, et signalee.
 */
export function repartirProgrammation(
  periodes: PeriodeProgrammation[],
  semainesParPeriode: Map<number, number[]>,
): { semaines: SemaineRepartie[]; periodesIgnorees: number[] } {
  const semaines: SemaineRepartie[] = []
  const periodesIgnorees: number[] = []

  for (const p of periodes) {
    const numeros = semainesParPeriode.get(p.numero)
    if (!numeros || !numeros.length) {
      periodesIgnorees.push(p.numero)
      continue
    }
    const items = aplatirDomaines(p.domaines)
    if (!items.length) continue
    semaines.push(...repartirSurSemaines(items, [...numeros].sort((a, b) => a - b)))
  }

  semaines.sort((a, b) => a.numero - b.numero)
  return { semaines, periodesIgnorees }
}
