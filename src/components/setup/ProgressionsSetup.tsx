'use client'

import { useState } from 'react'
import { ArrowRight, BookOpenCheck, Files, FolderOpen, Info, Trash2 } from 'lucide-react'
import SourceImporter from '@/components/methodes/SourceImporter'
import Bouton from '@/components/ui/Bouton'
import {
  analyserAjoutSource,
  cleMethode,
  regrouperSources,
  type SourceProgression,
} from '@/lib/progression-sources'

type ProgressionsSetupProps = {
  initialSources?: SourceProgression[]
  onContinue: (sources: SourceProgression[]) => void
}

const LABEL_TYPE: Record<SourceProgression['typeDocument'], string> = {
  manuel: 'Sommaire général',
  periode: 'Planning de période',
  programmation: 'Programmation annuelle',
}

function detailType(source: SourceProgression): string {
  const type = LABEL_TYPE[source.typeDocument]
  return source.typeDocument === 'periode'
    ? `${type}, Période ${source.periodeNumero}`
    : type
}

function nombreDocuments(nombre: number): string {
  return `${nombre} document${nombre > 1 ? 's' : ''}`
}

export default function ProgressionsSetup({
  initialSources = [],
  onContinue,
}: ProgressionsSetupProps) {
  const [sources, setSources] = useState<SourceProgression[]>(initialSources)
  const [importerVersion, setImporterVersion] = useState(0)
  const [avertissement, setAvertissement] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const methodes = regrouperSources(sources)

  function ajouterSource(candidate: SourceProgression) {
    const cleCandidate = cleMethode(candidate)
    const sourcesMethode = sources.filter(source => cleMethode(source) === cleCandidate)
    const analyse = analyserAjoutSource(sourcesMethode, candidate)
    setImporterVersion(version => version + 1)

    if (!analyse.autorisable) {
      setConfirmation(null)
      setAvertissement(analyse.message)
      return
    }

    setSources(existantes => [...existantes, candidate])
    setAvertissement(null)
    setConfirmation(
      `${candidate.nomSource} a été ajouté au classeur. Tu peux importer un autre document.`,
    )
  }

  function retirerSource(clientId: string) {
    setSources(existantes => existantes.filter(source => source.clientId !== clientId))
    setAvertissement(null)
    setConfirmation('Le brouillon a été retiré.')
  }

  return (
    <section
      className="min-w-0 space-y-6"
      aria-labelledby="progressions-setup-title"
      data-testid="classeur-progressions"
    >
      <header className="relative overflow-hidden rounded-3xl border border-violet-200 bg-violet-50/70 p-5 pl-7 sm:p-6 sm:pl-9">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-violet-700 via-violet-600 to-purple-500"
        />
        <div className="flex items-start gap-3">
          <span className="rounded-xl border border-violet-200 bg-white p-2 text-violet-700 shadow-sm">
            <FolderOpen size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
              Ton classeur de progression
            </p>
            <h2
              id="progressions-setup-title"
              className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl"
            >
              Ajoute les documents que tu as déjà
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sommaire, planning de période ou programmation annuelle : chaque document
              rejoint la bonne matière et la bonne méthode.
            </p>
          </div>
        </div>
      </header>

      <aside
        aria-label="Priorité des documents"
        className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
      >
        <Info className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
        <p>
          Un planning de période plus précis complète ou remplace seulement la partie
          concernée du sommaire général. Le reste de ta progression est conservé.
        </p>
      </aside>

      {avertissement && (
        <p
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-950"
        >
          {avertissement}
        </p>
      )}

      {confirmation && (
        <p
          role="status"
          className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900"
        >
          {confirmation}
        </p>
      )}

      <SourceImporter
        key={importerVersion}
        onSourceReady={ajouterSource}
      />

      {methodes.length > 0 && (
        <div className="space-y-3" aria-labelledby="documents-importes-title">
          <div className="flex items-center gap-2">
            <BookOpenCheck size={20} className="text-violet-700" aria-hidden="true" />
            <h2 id="documents-importes-title" className="font-bold text-slate-900">
              Documents prêts pour ta classe
            </h2>
          </div>

          <div className="grid min-w-0 gap-4">
            {methodes.map(methode => (
              <article
                key={methode.cle}
                data-testid="methode-progression"
                className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex min-w-0 items-start gap-3 border-b border-violet-100 bg-violet-50/70 p-4">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-700 text-white"
                  >
                    <Files size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="break-words font-bold text-slate-900"
                      aria-label={`${methode.matiere}, ${methode.nomMethode}`}
                    >
                      <span className="block text-xs font-bold uppercase tracking-wide text-violet-700">
                        {methode.matiere}
                      </span>
                      {methode.nomMethode}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {nombreDocuments(methode.sources.length)}
                    </p>
                  </div>
                </div>

                <ul className="divide-y divide-slate-100">
                  {methode.sources.map(source => (
                    <li
                      key={source.clientId}
                      className="flex min-w-0 items-start gap-3 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-slate-900">
                          {source.nomSource}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {detailType(source)}
                        </p>
                      </div>
                      <Bouton
                        type="button"
                        variant="fantome"
                        size="sm"
                        icon={Trash2}
                        aria-label={`Retirer ${source.nomSource}`}
                        className="shrink-0 text-red-700 hover:bg-red-50 hover:text-red-800 motion-reduce:transition-none"
                        onClick={() => retirerSource(source.clientId)}
                      />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {sources.length > 0 ? (
          <Bouton
            type="button"
            variant="principal"
            size="lg"
            iconRight={ArrowRight}
            className="w-full motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:[&>span]:transition-none"
            onClick={() => onContinue(sources)}
          >
            Continuer avec {nombreDocuments(sources.length)}
          </Bouton>
        ) : (
          <Bouton
            type="button"
            variant="contour"
            size="lg"
            iconRight={ArrowRight}
            className="w-full motion-reduce:transition-none"
            onClick={() => onContinue([])}
          >
            Je n&apos;ai encore rien à importer
          </Bouton>
        )}
        <p className="mt-2 text-center text-xs leading-5 text-slate-500">
          Tu pourras ajouter ou corriger tes méthodes plus tard dans Paramètres.
        </p>
      </div>
    </section>
  )
}
