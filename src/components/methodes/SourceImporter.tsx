'use client'

import { useEffect, useRef, useState } from 'react'
import { FileCheck2, FileUp, Plus, Search } from 'lucide-react'
import Bouton from '@/components/ui/Bouton'
import SourceContentPreview from '@/components/methodes/SourceContentPreview'
import BandeauCalage from '@/components/methodes/BandeauCalage'
import {
  calerSemaines,
  decalagePourDemarrerEn,
  type BaseCalage,
} from '@/lib/calage-semaines'
import type { ZoneScolaire } from '@/lib/calendrier-officiel'
import { baseCalageImport } from '@/lib/ia/schema-import-auto'
import type { ProgressionSemaine } from '@/data/manuels'
import { extractPdfText } from '@/lib/ia/pdf-client'
import {
  calculerEmpreinteSource,
  type NumeroPeriode,
  type SourceProgression,
} from '@/lib/progression-sources'
import type { TypeDocumentImport } from '@/lib/ia/schema-import-auto'
import type { PeriodeProgrammation } from '@/lib/repartition-periode'

type SourceImporterProps = {
  prenom?: string
  matiereInitiale?: string
  methodeInitiale?: string
  /** Date de rentrée de la classe. Absente = ni bandeau de calage ni dates. */
  rentreeDate?: string
  zone?: ZoneScolaire
  onSourceReady: (source: SourceProgression) => void | Promise<void>
  onCancel?: () => void
}

type AnalyseSource = {
  matiere: string
  nomMethode: string
  typeDocument: TypeDocumentImport
  periodeNumero: NumeroPeriode | null
  confiance: number
  avertissements: string[]
  baseCalage: BaseCalage
  semaines: ProgressionSemaine[]
  periodes: PeriodeProgrammation[]
  nomSource: string
}

type ReponseImport = {
  matiere?: unknown
  nom_methode?: unknown
  type_document?: unknown
  periode_numero?: unknown
  confiance_detection?: unknown
  avertissements?: unknown
  base_calage?: unknown
  progression?: unknown
  periodes?: unknown
  error?: unknown
}

const LIMITE_PDF_BRUT = 4 * 1024 * 1024
const LIMITE_PDF_TOTAL = 25 * 1024 * 1024
const NOMBRE_PDF_MAX = 10
const SEPARATEUR_FICHIERS = '\n\n--- fichier suivant ---\n\n'

const CHAMP =
  'w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 ' +
  'outline-none transition-colors focus:border-violet-600 focus:ring-4 focus:ring-violet-200/70 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ' +
  'motion-reduce:transition-none'

const LABELS_TYPE: Record<TypeDocumentImport, string> = {
  manuel: 'Manuel ou sommaire',
  periode: "Planning d'une période",
  programmation: 'Programmation annuelle',
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

function estTypeDocument(valeur: unknown): valeur is TypeDocumentImport {
  return valeur === 'manuel' || valeur === 'periode' || valeur === 'programmation'
}

function estNumeroPeriode(valeur: unknown): valeur is NumeroPeriode {
  return typeof valeur === 'number'
    && Number.isInteger(valeur)
    && valeur >= 1
    && valeur <= 5
}

function chaine(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur.trim() : ''
}

function nettoyerTexte(valeur: string): string {
  return valeur.normalize('NFC').trim().replace(/\s+/g, ' ')
}

function nettoyerSemaines(semaines: ProgressionSemaine[]): ProgressionSemaine[] {
  return semaines.flatMap(semaine => {
    const propre = {
      numero: semaine.numero,
      items: semaine.items.map(nettoyerTexte).filter(Boolean),
      pages: nettoyerTexte(semaine.pages),
      mots_exemple: semaine.mots_exemple.map(nettoyerTexte).filter(Boolean),
    }
    return propre.items.length || propre.pages || propre.mots_exemple.length ? [propre] : []
  })
}

function nettoyerPeriodes(periodes: PeriodeProgrammation[]): PeriodeProgrammation[] {
  return periodes.flatMap(periode => {
    const domaines = periode.domaines.flatMap(domaine => {
      const items = domaine.items.map(nettoyerTexte).filter(Boolean)
      return items.length ? [{
        nom: nettoyerTexte(domaine.nom),
        items,
      }] : []
    })
    return domaines.length ? [{ numero: periode.numero, domaines }] : []
  })
}

function normaliserSemaines(valeur: unknown): ProgressionSemaine[] {
  if (!Array.isArray(valeur)) return []
  return valeur.flatMap(brute => {
    if (!estObjet(brute) || typeof brute.numero !== 'number' || !Number.isInteger(brute.numero)) {
      return []
    }
    return [{
      numero: brute.numero,
      items: Array.isArray(brute.items)
        ? brute.items.filter((item): item is string => typeof item === 'string')
        : [],
      pages: typeof brute.pages === 'string' ? brute.pages : '',
      mots_exemple: Array.isArray(brute.mots_exemple)
        ? brute.mots_exemple.filter((mot): mot is string => typeof mot === 'string')
        : [],
    }]
  })
}

function normaliserPeriodes(valeur: unknown): PeriodeProgrammation[] {
  if (!Array.isArray(valeur)) return []
  return valeur.flatMap(brute => {
    if (!estObjet(brute) || typeof brute.numero !== 'number' || !Number.isInteger(brute.numero)) {
      return []
    }
    const domaines = Array.isArray(brute.domaines)
      ? brute.domaines.flatMap(domaine => {
          if (!estObjet(domaine)) return []
          return [{
            nom: typeof domaine.nom === 'string' ? domaine.nom : '',
            items: Array.isArray(domaine.items)
              ? domaine.items.filter((item): item is string => typeof item === 'string')
              : [],
          }]
        })
      : []
    return [{ numero: brute.numero, domaines }]
  })
}

function aContenuSemaines(semaines: ProgressionSemaine[]): boolean {
  return semaines.some(semaine =>
    semaine.items.some(item => item.trim())
    || Boolean(semaine.pages.trim())
    || semaine.mots_exemple.some(mot => mot.trim())
  )
}

function aContenuPeriodes(periodes: PeriodeProgrammation[]): boolean {
  return periodes.some(periode =>
    periode.domaines.some(domaine => domaine.items.some(item => item.trim()))
  )
}

function explicationsValidation(analyse: AnalyseSource): string[] {
  const erreurs: string[] = []
  if (!analyse.matiere.trim()) erreurs.push('Renseigne la matière.')
  if (!analyse.nomMethode.trim()) erreurs.push('Renseigne le nom de la méthode.')
  if (analyse.typeDocument === 'periode' && !estNumeroPeriode(analyse.periodeNumero)) {
    erreurs.push('Pour un planning de période, choisis une période entre 1 et 5.')
  }
  const contenuPresent = analyse.typeDocument === 'programmation'
    ? aContenuPeriodes(analyse.periodes)
    : aContenuSemaines(analyse.semaines)
  if (!contenuPresent) erreurs.push('Ajoute au moins une notion dans le contenu.')
  return erreurs
}

export default function SourceImporter({
  prenom,
  matiereInitiale = '',
  methodeInitiale = '',
  rentreeDate,
  zone,
  onSourceReady,
  onCancel,
}: SourceImporterProps) {
  const [texte, setTexte] = useState('')
  const [indiceMatiere, setIndiceMatiere] = useState(matiereInitiale)
  const [analyse, setAnalyse] = useState<AnalyseSource | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  // Decalage a appliquer aux numeros rendus par l'IA. L'enseignante ne le voit
  // jamais: elle repond « ma progression demarre en semaine N » et on convertit.
  const [decalage, setDecalage] = useState(0)
  const savingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requeteTokenRef = useRef(0)

  const etapeActive = saving || ready ? 3 : analyse ? 2 : 1
  const erreursValidation = analyse ? explicationsValidation(analyse) : []

  // Recalcul purement local: repondre a la question ne rappelle jamais l'IA.
  const calage = analyse && analyse.typeDocument !== 'programmation' && rentreeDate && zone
    ? calerSemaines({
        semaines: analyse.semaines,
        rentreeDate,
        zone,
        base: analyse.baseCalage,
        decalage,
      })
    : null

  // Les lignes vides sont AFFICHEES (le trou se voit) mais pas enregistrees:
  // le trou dans la numerotation porte deja la meme information.
  const semainesAffichees: ProgressionSemaine[] = calage
    ? calage.lignes.map(ligne => ({
        numero: ligne.numero,
        items: ligne.items,
        pages: ligne.pages,
        mots_exemple: ligne.motsExemple,
      }))
    : analyse?.semaines ?? []

  const datesParNumero = calage
    ? Object.fromEntries(calage.lignes.map(ligne => [ligne.numero, ligne.dateLundi]))
    : undefined

  useEffect(() => () => {
    requeteTokenRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  function commencerOperation() {
    requeteTokenRef.current += 1
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    const operation = { token: requeteTokenRef.current, controller }
    setError(null)
    setConfirmation(null)
    setAnalyse(null)
    setDecalage(0)
    setLoading(true)
    return operation
  }

  function operationActive(operation: { token: number; controller: AbortController }): boolean {
    return requeteTokenRef.current === operation.token && !operation.controller.signal.aborted
  }

  function terminerOperation(operation: { token: number; controller: AbortController }) {
    if (!operationActive(operation)) return
    if (abortControllerRef.current === operation.controller) abortControllerRef.current = null
    setLoading(false)
  }

  async function lancerAnalyse(
    form: FormData,
    nomSource: string,
    operation = commencerOperation(),
  ) {
    const indice = indiceMatiere.trim()
    if (indice) form.append('matiere', indice)
    // Permet a l'IA de rattacher une date du document a l'annee reelle.
    if (rentreeDate) form.append('rentree_date', rentreeDate)

    try {
      const response = await fetch('/api/ia-manuel', {
        method: 'POST',
        body: form,
        signal: operation.controller.signal,
      })
      const texteReponse = await response.text()
      if (!operationActive(operation)) return
      let data: ReponseImport | null = null
      try {
        data = JSON.parse(texteReponse) as ReponseImport
      } catch {
        data = null
      }

      if (!response.ok || !data) {
        const detail = chaine(data?.error) || texteReponse.slice(0, 180) || 'réponse vide'
        setError(`Erreur ${response.status} : ${detail}`)
        return
      }
      if (!estTypeDocument(data.type_document)) {
        setError("Réponse invalide : le type de document n'est pas reconnu.")
        return
      }

      const confianceBrute = typeof data.confiance_detection === 'number'
        && Number.isFinite(data.confiance_detection)
        ? data.confiance_detection
        : 0
      const avertissements = Array.isArray(data.avertissements)
        ? data.avertissements.filter((item): item is string => typeof item === 'string')
        : []
      const prochaineAnalyse: AnalyseSource = {
        matiere: chaine(data.matiere) || matiereInitiale.trim(),
        nomMethode: chaine(data.nom_methode) || methodeInitiale.trim(),
        typeDocument: data.type_document,
        periodeNumero: estNumeroPeriode(data.periode_numero) ? data.periode_numero : null,
        confiance: Math.max(0, Math.min(1, confianceBrute)),
        avertissements,
        baseCalage: baseCalageImport(data.base_calage),
        semaines: normaliserSemaines(data.progression),
        periodes: normaliserPeriodes(data.periodes),
        nomSource,
      }
      setAnalyse(prochaineAnalyse)
      setConfirmation(
        `${prenom ? `${prenom}, ton` : 'Ton'} document a été analysé. Vérifie les informations avant de l'ajouter.`,
      )
    } catch (erreur) {
      if (!operationActive(operation)) return
      if (erreur instanceof DOMException && erreur.name === 'AbortError') return
      setError(`Erreur réseau : ${erreur instanceof Error ? erreur.message : String(erreur)}`)
    } finally {
      terminerOperation(operation)
    }
  }

  function analyserTexte() {
    if (texte.trim().length < 20) {
      setError("Colle un texte un peu plus long avant de lancer l'analyse.")
      return
    }
    const form = new FormData()
    form.append('texte', texte.trim())
    void lancerAnalyse(form, 'Texte collé')
  }

  async function importerPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(event.target.files ?? [])
    if (!fichiers.length) return
    const tailleTotale = fichiers.reduce((total, fichier) => total + fichier.size, 0)
    if (fichiers.length > NOMBRE_PDF_MAX) {
      setError(`Tu peux importer au maximum ${NOMBRE_PDF_MAX} fichiers PDF à la fois.`)
      return
    }
    if (tailleTotale > LIMITE_PDF_TOTAL) {
      setError('Le total des PDF ne doit pas dépasser 25 Mio au total.')
      return
    }
    const nomSource = fichiers.map(fichier => fichier.name).join(', ')

    if (tailleTotale <= LIMITE_PDF_BRUT) {
      const form = new FormData()
      for (const fichier of fichiers) form.append('pdf', fichier)
      await lancerAnalyse(form, nomSource)
      return
    }

    const operation = commencerOperation()
    const textes: string[] = []
    try {
      for (const fichier of fichiers) {
        if (!operationActive(operation)) return
        textes.push(await extractPdfText(fichier))
      }
    } catch (erreur) {
      if (operationActive(operation)) {
        setError(
          `Lecture du PDF impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
        )
        terminerOperation(operation)
      }
      return
    }
    if (!operationActive(operation)) return

    const texteExtrait = textes.join(SEPARATEUR_FICHIERS).trim()
    if (texteExtrait.length < 20) {
      setError(
        'Ce PDF ne contient pas assez de texte sélectionnable. Colle le sommaire en texte ou utilise un autre PDF.',
      )
      terminerOperation(operation)
      return
    }
    const form = new FormData()
    form.append('texte', texteExtrait)
    await lancerAnalyse(form, nomSource, operation)
  }

  async function validerSource() {
    if (!analyse || ready || savingRef.current || explicationsValidation(analyse).length) return
    savingRef.current = true
    setSaving(true)
    setError(null)

    try {
      const creeLe = new Date().toISOString()
      const commun = {
        creeLe,
        nomSource: analyse.nomSource,
        matiere: nettoyerTexte(analyse.matiere),
        nomMethode: nettoyerTexte(analyse.nomMethode),
        semaines: analyse.typeDocument === 'programmation'
          ? []
          // Le decalage repondu a l'ecran est celui qu'on enregistre.
          : nettoyerSemaines(
              analyse.semaines.map(semaine => ({
                ...semaine,
                numero: semaine.numero + decalage,
              })),
            ),
        periodes: analyse.typeDocument === 'programmation'
          ? nettoyerPeriodes(analyse.periodes)
          : [],
      }
      const sourceSansIdentifiants = analyse.typeDocument === 'periode'
        ? {
            ...commun,
            typeDocument: 'periode' as const,
            periodeNumero: analyse.periodeNumero as NumeroPeriode,
          }
        : {
            ...commun,
            typeDocument: analyse.typeDocument,
            periodeNumero: null,
          }
      const empreinteContenu = await calculerEmpreinteSource(sourceSansIdentifiants)
      const source = {
        ...sourceSansIdentifiants,
        clientId: crypto.randomUUID(),
        empreinteContenu,
      } as SourceProgression
      await onSourceReady(source)
      setReady(true)
      setConfirmation(null)
    } catch (erreur) {
      setError(
        `Impossible de préparer la source : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
      )
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function changerTypeDocument(typeDocument: TypeDocumentImport) {
    if (!analyse) return
    const changeDeStructure =
      (analyse.typeDocument === 'programmation') !== (typeDocument === 'programmation')

    setAnalyse({
      ...analyse,
      typeDocument,
    })

    if (!changeDeStructure) {
      setConfirmation(null)
      return
    }
    setConfirmation(
      typeDocument === 'programmation'
        ? 'Le document doit être restructuré dans ce format. Ajoute les périodes/domaines'
        : 'Le document doit être restructuré dans ce format. Ajoute les semaines',
    )
  }

  function annuler() {
    requeteTokenRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setLoading(false)
    setError(null)
    setConfirmation(null)
    setAnalyse(null)
    onCancel?.()
  }

  return (
    <section
      className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-6"
      aria-labelledby="source-importer-title"
    >
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
          Nouvelle source
        </p>
        <h2 id="source-importer-title" className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
          Ajoute un document à ta progression
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Dépose les pages utiles de ton document papier. L&apos;analyse prépare le contenu,
          puis tu gardes toujours la main avant de l&apos;ajouter.
        </p>
      </div>

      <ol
        className="mb-6 grid grid-cols-3 border-b-2 border-violet-100"
        aria-label="Étapes de l'ajout d'une source"
      >
        {[
          { numero: 1, label: 'Document', Icone: FileUp },
          { numero: 2, label: 'Vérification', Icone: FileCheck2 },
          { numero: 3, label: 'Ajouter', Icone: Plus },
        ].map(({ numero, label, Icone }) => {
          const active = numero === etapeActive
          const terminee = numero < etapeActive
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className={[
                'relative flex min-w-0 flex-col items-center gap-1 rounded-t-xl px-1 py-2 text-center text-[11px] font-semibold sm:flex-row sm:justify-center sm:px-3 sm:text-sm',
                active ? 'bg-violet-700 text-white' : '',
                terminee ? 'bg-violet-50 text-violet-800' : '',
                !active && !terminee ? 'text-slate-500' : '',
              ].join(' ')}
            >
              <Icone size={16} aria-hidden="true" />
              <span className="truncate">{label}</span>
            </li>
          )
        })}
      </ol>

      {!ready && !analyse && (
        <div className="space-y-5">
          <div>
            <label
              htmlFor="indice-matiere-source"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Matière pressentie, facultatif
            </label>
            <input
              id="indice-matiere-source"
              className={CHAMP}
              value={indiceMatiere}
              disabled={loading}
              placeholder="Ex : Français ou Mathématiques"
              onChange={event => setIndiceMatiere(event.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              C&apos;est un simple indice. Le document reste la source de vérité.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 p-4">
            <label htmlFor="pdf-source" className="block cursor-pointer text-center">
              <span className="block font-semibold text-violet-900">Dépose un ou plusieurs PDF</span>
                  <span className="mt-1 block text-xs leading-5 text-violet-700">
                10 PDF maximum, 25 Mio au total. Jusqu&apos;à 4 Mo, ils sont envoyés tels quels.
              </span>
            </label>
            <input
              id="pdf-source"
              aria-label="Documents PDF"
              type="file"
              accept=".pdf,application/pdf"
              multiple
              disabled={loading}
              onChange={event => void importerPdf(event)}
              className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-violet-700 hover:file:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/70"
            />
          </div>

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">ou</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div>
            <label htmlFor="texte-source" className="mb-1 block text-sm font-medium text-slate-700">
              Texte du document
            </label>
            <textarea
              id="texte-source"
              className={`${CHAMP} min-h-32 resize-y`}
              value={texte}
              disabled={loading}
              placeholder="Colle ici le sommaire ou la programmation..."
              onChange={event => setTexte(event.target.value)}
            />
          </div>

          <Bouton
            type="button"
            variant="principal"
            icon={Search}
            loading={loading}
            className="w-full motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:[&>span]:transition-none"
            onClick={analyserTexte}
          >
            Analyser le document
          </Bouton>
        </div>
      )}

      {!ready && error && (
        <p role="alert" className="my-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {!ready && confirmation && (
        <p role="status" className="my-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
          {confirmation}
        </p>
      )}

      {!ready && analyse && (
        <div className="space-y-5">
          {(analyse.confiance < 0.7 || analyse.avertissements.length > 0) && (
            <aside className="rounded-2xl border border-amber-600/30 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">
                Vérifie bien ces informations, confiance {Math.round(analyse.confiance * 100)} %
              </p>
              {analyse.avertissements.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {analyse.avertissements.map((avertissement, index) => (
                    <li key={`${index}-${avertissement}`}>{avertissement}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1">La détection mérite une vérification attentive.</p>
              )}
            </aside>
          )}

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="matiere-source" className="mb-1 block text-sm font-medium text-slate-700">
                Matière
              </label>
              <input
                id="matiere-source"
                className={CHAMP}
                value={analyse.matiere}
                disabled={saving}
                onChange={event => setAnalyse({ ...analyse, matiere: event.target.value })}
              />
            </div>

            <div>
              <label htmlFor="methode-source" className="mb-1 block text-sm font-medium text-slate-700">
                Nom de la méthode
              </label>
              <input
                id="methode-source"
                className={CHAMP}
                value={analyse.nomMethode}
                disabled={saving}
                onChange={event => setAnalyse({ ...analyse, nomMethode: event.target.value })}
              />
            </div>

            <div>
              <label htmlFor="type-source" className="mb-1 block text-sm font-medium text-slate-700">
                Type de document
              </label>
              <select
                id="type-source"
                className={CHAMP}
                value={analyse.typeDocument}
                disabled={saving}
                onChange={event => changerTypeDocument(
                  event.target.value as TypeDocumentImport,
                )}
              >
                {Object.entries(LABELS_TYPE).map(([valeur, label]) => (
                  <option key={valeur} value={valeur}>{label}</option>
                ))}
              </select>
            </div>

            {analyse.typeDocument === 'periode' && (
              <div>
                <label htmlFor="periode-source" className="mb-1 block text-sm font-medium text-slate-700">
                  Période
                </label>
                <select
                  id="periode-source"
                  className={CHAMP}
                  value={analyse.periodeNumero ?? ''}
                  disabled={saving}
                  onChange={event => {
                    const numero = Number(event.target.value)
                    setAnalyse({
                      ...analyse,
                      periodeNumero: estNumeroPeriode(numero) ? numero : null,
                    })
                  }}
                >
                  <option value="">Choisir une période</option>
                  {[1, 2, 3, 4, 5].map(numero => (
                    <option key={numero} value={numero}>Période {numero}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <div className="mb-3">
              <h3 className="font-semibold text-slate-900">Contenu détecté</h3>
              <p className="text-sm text-slate-600">
                Une ligne correspond à une notion complète. Tu peux tout corriger ici.
              </p>
            </div>
            {calage && (
              <div className="mb-4">
                <BandeauCalage
                  calage={calage}
                  onSemaineDepart={semaine => setDecalage(
                    decalagePourDemarrerEn(analyse.semaines, semaine),
                  )}
                />
              </div>
            )}
            <SourceContentPreview
              typeDocument={analyse.typeDocument}
              semaines={semainesAffichees}
              periodes={analyse.periodes}
              datesParNumero={datesParNumero}
              onSemainesChange={semaines => setAnalyse({
                ...analyse,
                // L'apercu montre les numeros decales ; l'analyse garde les
                // numeros d'origine, sinon le decalage s'appliquerait deux fois.
                semaines: semaines.map(semaine => ({
                  ...semaine,
                  numero: semaine.numero - decalage,
                })),
              })}
              onPeriodesChange={periodes => setAnalyse({ ...analyse, periodes })}
            />
          </div>

          {erreursValidation.length > 0 && (
            <div
              aria-live="polite"
              className="rounded-xl border border-amber-600/30 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <p className="font-semibold">Avant d&apos;ajouter cette source :</p>
              <ul className="mt-1 list-disc pl-5">
                {erreursValidation.map(erreurValidation => (
                  <li key={erreurValidation}>{erreurValidation}</li>
                ))}
              </ul>
            </div>
          )}

          <Bouton
            type="button"
            variant="principal"
            icon={Plus}
            loading={saving}
            disabled={ready || erreursValidation.length > 0}
            className="w-full motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:[&>span]:transition-none"
            onClick={() => void validerSource()}
          >
            {ready ? 'Source ajoutée' : 'Ajouter cette source'}
          </Bouton>
        </div>
      )}

      {ready && (
        <div className="space-y-4 text-center">
          <p
            role="status"
            className="rounded-2xl border border-violet-200 bg-violet-50 p-5 font-semibold text-violet-900"
          >
            Document prêt
          </p>
          {onCancel && (
            <Bouton
              type="button"
              variant="contour"
              className="w-full"
              onClick={onCancel}
            >
              Fermer
            </Bouton>
          )}
        </div>
      )}

      {!ready && (onCancel || loading) && (
        <Bouton
          type="button"
          variant="contour"
          className="mt-4 w-full"
          disabled={saving}
          onClick={annuler}
        >
          Annuler
        </Bouton>
      )}
    </section>
  )
}
