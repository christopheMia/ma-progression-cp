import { TRAME_EDT_CP } from '@/data/trame-edt'
import { datesSemainesCalendaires } from '@/lib/calendrier-semaines'
import {
  periodesOfficielles,
  type PeriodeOfficielle,
  type ZoneScolaire,
} from '@/lib/calendrier-officiel'
import { genererSqueletteSemaines } from '@/lib/progression'
import { codeMatiereCanonique } from '@/lib/matieres'
import {
  estSourceProgressionValide,
  materialiserSources,
  niveauPrecision,
  normaliserTexte,
  regrouperSources,
  type SourceProgression,
} from '@/lib/progression-sources'
import { corrigerPrioriteMatin } from '@/lib/edt-matin'

export type CreneauCreationClasse = {
  jour: string
  heure_debut: string
  heure_fin: string
  matiere: string
  ordre: number
  couleur?: string | null
  type?: 'cours' | 'routine'
}

export type DonneesCreationClasse = {
  sourcesProgression: SourceProgression[]
  rentreeDate: string
  zoneScolaire: ZoneScolaire
  eleves: string[]
  emploiDuTemps: CreneauCreationClasse[]
}

type NouvelleClasse = {
  user_id: string
  manuel_id: 'custom' | 'sans-methode'
  rentree_date: string
  zone_scolaire: ZoneScolaire
}

type NouvelEleve = {
  class_id: string
  prenom: string
  ordre: number
}

type NouvellePeriode = PeriodeOfficielle & {
  class_id: string
}

type NouvelleSemaine = ReturnType<typeof genererSqueletteSemaines>[number] & {
  class_id: string
  periode_numero: number
}

type NouveauCreneau = {
  class_id: string
  jour: string
  heure_debut: string
  heure_fin: string
  matiere: string
  ordre: number
  couleur: string | null
  type: 'cours' | 'routine'
  methode_id: string | null
}

export type ParametresEnregistrementSource = {
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

export type CreationClasseDependances = {
  lireAnciennesClasses: (userId: string) => Promise<string[]>
  insererClasse: (classe: NouvelleClasse) => Promise<string>
  insererEleves: (eleves: NouvelEleve[]) => Promise<void>
  insererPeriodes: (periodes: NouvellePeriode[]) => Promise<void>
  insererSemaines: (semaines: NouvelleSemaine[]) => Promise<void>
  assurerMethode: (
    classeId: string,
    matiere: string,
    nomMethode: string,
  ) => Promise<string>
  enregistrerSource: (params: ParametresEnregistrementSource) => Promise<string>
  insererEmploiDuTemps: (creneaux: NouveauCreneau[]) => Promise<void>
  supprimerClasses: (ids: string[]) => Promise<void>
}

function validerSources(sources: SourceProgression[]) {
  if (!Array.isArray(sources)) {
    throw new Error('La liste des sources de progression est invalide.')
  }

  const methodesParMatiere = new Map<string, {
    nomNormalise: string
    matiereAffichee: string
  }>()
  const empreintesParMethode = new Map<string, Set<string>>()

  for (const source of sources) {
    if (!estSourceProgressionValide(source)) {
      throw new Error('Une source de progression est invalide.')
    }
    if (!source.matiere.trim() || !source.nomMethode.trim()) {
      throw new Error('Chaque source doit indiquer une matière et une méthode.')
    }

    const matiereNormalisee = codeMatiereCanonique(source.matiere)
    const nomNormalise = normaliserTexte(source.nomMethode)
    const existante = methodesParMatiere.get(matiereNormalisee)
    if (existante && existante.nomNormalise !== nomNormalise) {
      throw new Error(
        `Deux méthodes différentes sont indiquées pour la matière ${existante.matiereAffichee}. `
        + 'Garde une seule méthode pour cette matière avant de continuer.',
      )
    }
    methodesParMatiere.set(matiereNormalisee, {
      nomNormalise,
      matiereAffichee: existante?.matiereAffichee ?? source.matiere.trim(),
    })

    const cleMethode = JSON.stringify([matiereNormalisee, nomNormalise])
    const empreintes = empreintesParMethode.get(cleMethode) ?? new Set<string>()
    if (empreintes.has(source.empreinteContenu)) {
      throw new Error('Ce document est déjà importé.')
    }
    empreintes.add(source.empreinteContenu)
    empreintesParMethode.set(cleMethode, empreintes)
  }
}

function construireSemainesParPeriode(
  calendrier: ReturnType<typeof datesSemainesCalendaires>,
): Map<number, number[]> {
  const semainesParPeriode = new Map<number, number[]>()
  for (const semaine of calendrier) {
    semainesParPeriode.set(
      semaine.periode_numero,
      [...(semainesParPeriode.get(semaine.periode_numero) ?? []), semaine.numero],
    )
  }
  return semainesParPeriode
}

function comparerDateCreation(a: SourceProgression, b: SourceProgression): number {
  return Date.parse(a.creeLe) - Date.parse(b.creeLe)
}

export async function executerCreationClasse(
  formData: DonneesCreationClasse,
  userId: string,
  dependances: CreationClasseDependances,
): Promise<string> {
  const sources = formData.sourcesProgression ?? []
  validerSources(sources)
  const sourcesCanonisees = sources.map(source => ({
    ...source,
    matiere: codeMatiereCanonique(source.matiere),
  }))
  const baseEdt = formData.emploiDuTemps.length > 0
    ? formData.emploiDuTemps
    : TRAME_EDT_CP
  const resultatMatin = corrigerPrioriteMatin(baseEdt)
  if (!resultatMatin.ok) {
    throw new Error(resultatMatin.message)
  }
  const edtValide = resultatMatin.creneaux

  const anciensIds = await dependances.lireAnciennesClasses(userId)
  const classeId = await dependances.insererClasse({
    user_id: userId,
    manuel_id: sources.length > 0 ? 'custom' : 'sans-methode',
    rentree_date: formData.rentreeDate,
    zone_scolaire: formData.zoneScolaire,
  })

  try {
    const eleves = (formData.eleves ?? []).map((prenom, ordre) => ({
      class_id: classeId,
      prenom,
      ordre,
    }))
    if (eleves.length) await dependances.insererEleves(eleves)

    const periodes = periodesOfficielles(formData.rentreeDate, formData.zoneScolaire)
    if (periodes.length !== 5) {
      throw new Error(
        "Le calendrier officiel de cette année scolaire n'est pas encore disponible dans l'application.",
      )
    }
    await dependances.insererPeriodes(
      periodes.map(periode => ({ ...periode, class_id: classeId })),
    )

    const squelette = genererSqueletteSemaines(formData.rentreeDate)
    const calendrier = datesSemainesCalendaires(periodes, squelette.length)
    if (calendrier.length !== squelette.length) {
      throw new Error('Le calendrier scolaire ne contient pas assez de semaines de classe.')
    }
    const calendrierParNumero = new Map(
      calendrier.map(semaine => [semaine.numero, semaine]),
    )
    const semaines = squelette.map(semaine => {
      const officielle = calendrierParNumero.get(semaine.numero)
      if (!officielle) {
        throw new Error(`La semaine ${semaine.numero} ne peut pas être placée dans le calendrier.`)
      }
      return {
        ...semaine,
        class_id: classeId,
        date_debut: officielle.date_debut,
        periode_numero: officielle.periode_numero,
      }
    })
    await dependances.insererSemaines(semaines)

    const semainesParPeriode = construireSemainesParPeriode(calendrier)
    const methodeIdParMatiere = new Map<string, string>()
    for (const methode of regrouperSources(sourcesCanonisees)) {
      const methodeId = await dependances.assurerMethode(
        classeId,
        methode.matiere,
        methode.nomMethode,
      )
      methodeIdParMatiere.set(methode.matiere, methodeId)
      const sourceIdsAttendus: string[] = []
      const sourcesEnregistrees: SourceProgression[] = []
      const sourcesOrdonnees = [...methode.sources].sort(comparerDateCreation)

      for (const source of sourcesOrdonnees) {
        sourcesEnregistrees.push(source)
        const materialisation = materialiserSources(
          sourcesEnregistrees,
          semainesParPeriode,
        )
        const sourceId = await dependances.enregistrerSource({
          p_class_id: classeId,
          p_methode_id: methodeId,
          p_matiere: methode.matiere,
          p_nom_source: source.nomSource,
          p_type_document: source.typeDocument,
          p_periode_numero: source.periodeNumero,
          p_niveau_precision: niveauPrecision(source.typeDocument),
          p_contenu_structure: {
            semaines: source.semaines,
            periodes: source.periodes,
          },
          p_empreinte_contenu: source.empreinteContenu,
          p_lignes: materialisation.semaines,
          p_source_ids_attendus: [...sourceIdsAttendus],
        })
        if (!sourceId) {
          throw new Error(`La source ${source.nomSource} n'a pas été enregistrée.`)
        }
        sourceIdsAttendus.push(sourceId)
      }
    }

    await dependances.insererEmploiDuTemps(edtValide.map(creneau => ({
      class_id: classeId,
      jour: creneau.jour,
      heure_debut: creneau.heure_debut,
      heure_fin: creneau.heure_fin,
      matiere: creneau.matiere,
      ordre: creneau.ordre,
      couleur: creneau.couleur ?? null,
      type: creneau.type ?? 'cours',
      methode_id: (creneau.type ?? 'cours') === 'routine'
        ? null
        : methodeIdParMatiere.get(codeMatiereCanonique(creneau.matiere)) ?? null,
    })))
  } catch (error) {
    await dependances.supprimerClasses([classeId])
    throw error
  }

  await dependances.supprimerClasses(anciensIds)
  return classeId
}
