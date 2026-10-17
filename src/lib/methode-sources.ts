import { codeMatiereCanonique, libelleMatiereCanonique } from '@/lib/matieres'
import {
  estSourceProgressionValide,
  materialiserSources,
  niveauPrecision,
  normaliserTexte,
  type SourceProgression,
} from '@/lib/progression-sources'
import type { ProgressionSemaine } from '@/data/manuels'

export type SourceProgressionBdd = {
  id: string
  methode_id: string
  nom_source: unknown
  type_document: unknown
  periode_numero: unknown
  niveau_precision: unknown
  contenu_structure: unknown
  empreinte_contenu: unknown
  created_at: unknown
}

export type MethodeSourceOperation = {
  id: string
  matiere: string
  manuel: string | null
}

export type SemaineSourceOperation = {
  id: string
  numero: number
  periode_numero: number | null
}

export type ParametresAjoutSource = {
  p_class_id: string
  p_methode_id: string
  p_matiere: string
  p_nom_source: string
  p_type_document: SourceProgression['typeDocument']
  p_periode_numero: SourceProgression['periodeNumero']
  p_niveau_precision: number
  p_contenu_structure: {
    semaines: SourceProgression['semaines']
    periodes: SourceProgression['periodes']
  }
  p_empreinte_contenu: string
  p_lignes: ReturnType<typeof materialiserSources>['semaines']
  p_source_ids_attendus: string[]
}

export type ParametresRetraitSource = {
  p_source_id: string
  p_lignes: ReturnType<typeof materialiserSources>['semaines']
  p_source_ids_attendus: string[]
}

export type LigneProgressionActuelle = {
  numero: number
  items: string[] | null
  pages: string | null
  mots_exemple: string[] | null
}

export type MethodeSourcesDependances = {
  lireContexte: () => Promise<{ classId: string }>
  trouverMethode: (
    classId: string,
    matiere: string,
  ) => Promise<MethodeSourceOperation | null>
  lireMethodeParId: (
    classId: string,
    methodeId: string,
  ) => Promise<MethodeSourceOperation | null>
  creerMethode: (
    classId: string,
    matiere: string,
    nomMethode: string,
  ) => Promise<string>
  lireSource: (sourceId: string) => Promise<SourceProgressionBdd | null>
  lireSources: (methodeId: string) => Promise<SourceProgressionBdd[]>
  lireSemaines: (classId: string) => Promise<SemaineSourceOperation[]>
  /** Les lignes ACTUELLES de la matière, quel que soit le chemin qui les a écrites. */
  lireProgression: (classId: string, matiere: string) => Promise<LigneProgressionActuelle[]>
  enregistrerSource: (params: ParametresAjoutSource) => Promise<string>
  retirerSource: (params: ParametresRetraitSource) => Promise<void>
  methodeEstVide: (methodeId: string) => Promise<boolean>
  supprimerMethodeCreee: (classId: string, methodeId: string) => Promise<void>
  revalider: (semaineIds: string[]) => Promise<void>
}

export function sourceProgressionDepuisBdd(
  ligne: SourceProgressionBdd,
  nomMethode: string,
  matiere = 'francais',
): SourceProgression {
  const contenu = estObjet(ligne.contenu_structure)
    ? ligne.contenu_structure
    : {}
  const commun = {
    clientId: ligne.id,
    creeLe: ligne.created_at,
    nomSource: ligne.nom_source,
    matiere: codeMatiereCanonique(matiere),
    nomMethode,
    semaines: contenu.semaines,
    periodes: contenu.periodes,
    empreinteContenu: ligne.empreinte_contenu,
  }
  const source = ligne.type_document === 'periode'
    ? {
        ...commun,
        typeDocument: 'periode',
        periodeNumero: ligne.periode_numero,
      }
    : {
        ...commun,
        typeDocument: ligne.type_document,
        periodeNumero: null,
      }

  if (!estSourceProgressionValide(source)) {
    throw new Error(
      `La source enregistrée est invalide (${ligne.id}). Retire-la ou réimporte le document.`,
    )
  }
  return source
}

export type ResultatAjoutSource =
  | { statut: 'ajoute'; sourceId: string; methodeId: string }
  /** Rien n'est écrit : ces semaines déjà remplies changeraient, l'enseignante choisit. */
  | { statut: 'a-confirmer'; semainesRemplacees: number[] }

export type OptionsAjoutSource = {
  /**
   * Les semaines que l'enseignante a vues et accepté de remplacer. L'accord ne
   * vaut que pour elles : si la liste recalculée diffère (une semaine remplie
   * entre-temps), on redemande au lieu d'écrire.
   */
  semainesConfirmees?: number[]
}

export async function executerAjoutSourceProgression(
  sourceBrute: SourceProgression,
  dependances: MethodeSourcesDependances,
  options: OptionsAjoutSource = {},
): Promise<ResultatAjoutSource> {
  if (!estSourceProgressionValide(sourceBrute)) {
    throw new Error('Le document à ajouter est invalide.')
  }
  const matiere = codeMatiereCanonique(sourceBrute.matiere)
  const nomMethode = sourceBrute.nomMethode.trim()
  if (!nomMethode) throw new Error('Renseigne le nom de la méthode.')
  const source: SourceProgression = {
    ...sourceBrute,
    matiere,
    nomMethode,
  }
  const { classId } = await dependances.lireContexte()
  let methode = await dependances.trouverMethode(classId, matiere)
  let methodeCreee = false

  // Une matière n'a qu'une méthode. Quand le document la nomme autrement
  // (l'IA ne recopie jamais deux fois le même titre), c'est le nom déjà
  // enregistré qui est repris. Refuser bloquait l'enseignante pour une virgule
  // (17/10/2026 : « Arts (poésie, arts plastiques…) » contre « Arts
  // plastiques, poésie… »).
  if (methode?.manuel && normaliserTexte(methode.manuel) !== normaliserTexte(nomMethode)) {
    source.nomMethode = methode.manuel.trim()
  }

  if (!methode) {
    const methodeId = await dependances.creerMethode(classId, matiere, nomMethode)
    methode = { id: methodeId, matiere, manuel: nomMethode }
    methodeCreee = true
  }

  try {
    const [lignesBdd, semaines, lignesActuelles] = await Promise.all([
      dependances.lireSources(methode.id),
      dependances.lireSemaines(classId),
      dependances.lireProgression(classId, matiere),
    ])
    const sourcesExistantes = lignesBdd.map(ligne =>
      sourceProgressionDepuisBdd(
        ligne,
        methode?.manuel?.trim() || nomMethode,
        matiere,
      )
    )
    if (sourcesExistantes.some(existante =>
      existante.empreinteContenu === source.empreinteContenu
    )) {
      throw new Error('Ce document est déjà importé.')
    }

    const semainesParPeriode = construireSemainesParPeriode(semaines)
    const avant = materialiserSources(sourcesExistantes, semainesParPeriode)
    const apres = materialiserSources(
      [...sourcesExistantes, source],
      semainesParPeriode,
    )

    // Décision de Christophe du 17/10/2026 : rien ne remplace une semaine déjà
    // remplie sans que l'enseignante l'ait vu. Le même PDF, classé manuel en
    // juillet puis programmation, avait réécrit les 36 semaines d'arts de la
    // classe de test sans un mot. La comparaison se fait avec la BASE, pas avec
    // les documents : `remplacer_progression` efface toute la matière avant de
    // la réécrire, retouches à la main comprises.
    const semainesRemplacees = semainesQuiChangent(lignesActuelles, apres.semaines)
    if (semainesRemplacees.length
      && !memesNumeros(semainesRemplacees, options.semainesConfirmees)) {
      // Possible même pour une méthode créée à l'instant : la matière peut
      // porter des lignes écrites hors des documents. On ne laisse pas derrière
      // soi une méthode vide que personne n'a demandée.
      if (methodeCreee && await dependances.methodeEstVide(methode.id)) {
        await dependances.supprimerMethodeCreee(classId, methode.id)
      }
      return { statut: 'a-confirmer', semainesRemplacees }
    }
    const sourceIdsAttendus = lignesBdd.map(ligne => ligne.id)
    const sourceId = await dependances.enregistrerSource({
      p_class_id: classId,
      p_methode_id: methode.id,
      p_matiere: matiere,
      p_nom_source: source.nomSource,
      p_type_document: source.typeDocument,
      p_periode_numero: source.periodeNumero,
      p_niveau_precision: niveauPrecision(source.typeDocument),
      p_contenu_structure: {
        semaines: source.semaines,
        periodes: source.periodes,
      },
      p_empreinte_contenu: source.empreinteContenu,
      p_lignes: apres.semaines,
      p_source_ids_attendus: [...sourceIdsAttendus],
    })
    if (!sourceId) throw new Error("Le document n'a pas été enregistré.")

    await dependances.revalider(semaineIdsAffectees(
      semaines,
      avant.semaines,
      apres.semaines,
    ))
    return { statut: 'ajoute', sourceId, methodeId: methode.id }
  } catch (error) {
    if (methodeCreee && await dependances.methodeEstVide(methode.id)) {
      await dependances.supprimerMethodeCreee(classId, methode.id)
    }
    throw error
  }
}

/**
 * Les semaines REMPLIES aujourd'hui dont le contenu changerait, ou qui
 * disparaîtraient. Une semaine vide qui se remplit n'est pas un remplacement :
 * compléter ne demande rien.
 */
function semainesQuiChangent(
  actuelles: LigneProgressionActuelle[],
  futures: ProgressionSemaine[],
): number[] {
  const futuresParNumero = new Map(futures.map(semaine => [semaine.numero, semaine]))
  const numeros = new Set<number>()
  for (const ligne of actuelles) {
    const avant = contenuComparable(ligne.items, ligne.pages, ligne.mots_exemple)
    if (avant === null) continue
    const future = futuresParNumero.get(ligne.numero)
    const apres = future
      ? contenuComparable(future.items, future.pages, future.mots_exemple)
      : null
    if (apres !== avant) numeros.add(ligne.numero)
  }
  return [...numeros].sort((a, b) => a - b)
}

/** `null` pour une semaine sans contenu ; sinon une forme stable à comparer. */
function contenuComparable(
  items: string[] | null | undefined,
  pages: string | null | undefined,
  mots: string[] | null | undefined,
): string | null {
  const propres = (liste: string[] | null | undefined) =>
    (liste ?? []).map(texte => texte.trim()).filter(Boolean)
  const contenu = {
    items: propres(items),
    pages: (pages ?? '').trim(),
    mots: propres(mots),
  }
  if (!contenu.items.length && !contenu.pages && !contenu.mots.length) return null
  return JSON.stringify(contenu)
}

function memesNumeros(a: number[], b: number[] | undefined): boolean {
  if (!b || a.length !== b.length) return false
  const triee = [...b].sort((x, y) => x - y)
  return a.every((numero, index) => numero === triee[index])
}

export async function executerRetraitSourceProgression(
  sourceId: string,
  dependances: MethodeSourcesDependances,
): Promise<void> {
  if (!sourceId.trim()) throw new Error('La source à retirer est invalide.')
  const { classId } = await dependances.lireContexte()
  const cible = await dependances.lireSource(sourceId)
  if (!cible) throw new Error('Source introuvable ou non autorisée.')
  const methode = await dependances.lireMethodeParId(classId, cible.methode_id)
  if (!methode) throw new Error('Source introuvable ou non autorisée.')

  const [lignesBdd, semaines] = await Promise.all([
    dependances.lireSources(methode.id),
    dependances.lireSemaines(classId),
  ])
  if (!lignesBdd.some(ligne => ligne.id === sourceId)) {
    throw new Error('Les documents ont changé. Recharge la page puis réessaie.')
  }

  const nomMethode = methode.manuel?.trim()
    || libelleMatiereCanonique(methode.matiere)
  const sources = lignesBdd.map(ligne =>
    sourceProgressionDepuisBdd(ligne, nomMethode, methode.matiere)
  )
  const restantes = sources.filter(source => source.clientId !== sourceId)
  const semainesParPeriode = construireSemainesParPeriode(semaines)
  const avant = materialiserSources(sources, semainesParPeriode)
  const apres = materialiserSources(restantes, semainesParPeriode)

  await dependances.retirerSource({
    p_source_id: sourceId,
    p_lignes: apres.semaines,
    p_source_ids_attendus: lignesBdd.map(ligne => ligne.id),
  })
  await dependances.revalider(semaineIdsAffectees(
    semaines,
    avant.semaines,
    apres.semaines,
  ))
}

function construireSemainesParPeriode(
  semaines: SemaineSourceOperation[],
): Map<number, number[]> {
  const resultat = new Map<number, number[]>()
  for (const semaine of semaines) {
    if (semaine.periode_numero == null) continue
    const numeros = resultat.get(semaine.periode_numero) ?? []
    numeros.push(semaine.numero)
    resultat.set(semaine.periode_numero, numeros)
  }
  return resultat
}

function semaineIdsAffectees(
  semaines: SemaineSourceOperation[],
  avant: ReturnType<typeof materialiserSources>['semaines'],
  apres: ReturnType<typeof materialiserSources>['semaines'],
): string[] {
  const numeros = new Set([
    ...avant.map(semaine => semaine.numero),
    ...apres.map(semaine => semaine.numero),
  ])
  return semaines
    .filter(semaine => numeros.has(semaine.numero))
    .map(semaine => semaine.id)
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}
