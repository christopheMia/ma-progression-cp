'use client'

import { Plus } from 'lucide-react'
import Bouton from '@/components/ui/Bouton'
import type { ProgressionSemaine } from '@/data/manuels'
import type { PeriodeProgrammation } from '@/lib/repartition-periode'
import type { TypeDocumentImport } from '@/lib/ia/schema-import-auto'

type SourceContentPreviewProps = {
  typeDocument: TypeDocumentImport
  semaines: ProgressionSemaine[]
  periodes: PeriodeProgrammation[]
  /** Date du lundi réel par numéro de semaine. Absent = aucune date affichée. */
  datesParNumero?: Record<number, string>
  onSemainesChange: (semaines: ProgressionSemaine[]) => void
  onPeriodesChange: (periodes: PeriodeProgrammation[]) => void
}

const CHAMP =
  'w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'outline-none transition-colors focus:border-violet-600 focus:ring-4 focus:ring-violet-200/70 ' +
  'motion-reduce:transition-none'

function lignes(texte: string): string[] {
  return texte.split(/\r?\n/)
}

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** '2026-09-07' devient 'Semaine du 7 septembre'. */
function libelleSemaine(numero: number, dateLundi?: string): string {
  if (!dateLundi) return `Semaine ${numero}`
  const [, mois, jour] = dateLundi.split('-')
  const nomMois = MOIS[Number(mois) - 1]
  if (!nomMois) return `Semaine ${numero}`
  return `Semaine du ${Number(jour)} ${nomMois}`
}

/**
 * Une semaine sans aucun contenu. Elle reste AFFICHEE : c'est l'information
 * « le document ne met rien ici », souvent la semaine de rentree consacree a
 * l'accueil et a la presentation des manuels.
 */
function semaineEstVide(semaine: ProgressionSemaine): boolean {
  return semaine.items.every(item => !item.trim())
    && !semaine.pages.trim()
    && semaine.mots_exemple.every(mot => !mot.trim())
}

function premierNumeroDisponible(numeros: number[], maximum: number): number | null {
  const utilises = new Set(numeros)
  for (let numero = 1; numero <= maximum; numero++) {
    if (!utilises.has(numero)) return numero
  }
  return null
}

export default function SourceContentPreview({
  typeDocument,
  semaines,
  periodes,
  datesParNumero,
  onSemainesChange,
  onPeriodesChange,
}: SourceContentPreviewProps) {
  if (typeDocument === 'programmation') {
    const prochainePeriode = premierNumeroDisponible(
      periodes.map(periode => periode.numero),
      5,
    )

    return (
      <div className="space-y-4" aria-label="Contenu de la programmation">
        {periodes.map((periode, periodeIndex) => (
          <section
            key={`${periode.numero}-${periodeIndex}`}
            className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-violet-700 px-2 text-sm font-bold text-white">
                P{periode.numero}
              </span>
              <h3 className="font-semibold text-slate-900">Période {periode.numero}</h3>
            </div>

            <div className="space-y-3">
              {periode.domaines.map((domaine, domaineIndex) => {
                const numeroDomaine = domaineIndex + 1
                return (
                  <div
                    key={domaineIndex}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <label
                      className="mb-1 block text-sm font-medium text-slate-700"
                      htmlFor={`periode-${periodeIndex}-domaine-${domaineIndex}`}
                    >
                      Domaine {numeroDomaine}
                    </label>
                    <input
                      id={`periode-${periodeIndex}-domaine-${domaineIndex}`}
                      aria-label={`Nom du domaine ${numeroDomaine} de la période ${periode.numero}`}
                      className={CHAMP}
                      value={domaine.nom}
                      onChange={event => {
                        const prochaines = periodes.map((periodeCourante, indexCourant) => {
                          if (indexCourant !== periodeIndex) return periodeCourante
                          return {
                            ...periodeCourante,
                            domaines: periodeCourante.domaines.map((domaineCourant, indexDomaine) =>
                              indexDomaine === domaineIndex
                                ? { ...domaineCourant, nom: event.target.value }
                                : domaineCourant
                            ),
                          }
                        })
                        onPeriodesChange(prochaines)
                      }}
                    />

                    <label
                      className="mb-1 mt-3 block text-sm font-medium text-slate-700"
                      htmlFor={`periode-${periodeIndex}-items-${domaineIndex}`}
                    >
                      Notions, une par ligne
                    </label>
                    <textarea
                      id={`periode-${periodeIndex}-items-${domaineIndex}`}
                      aria-label={`Notions du domaine ${numeroDomaine} de la période ${periode.numero}`}
                      className={`${CHAMP} min-h-24 resize-y`}
                      value={domaine.items.join('\n')}
                      onChange={event => {
                        const items = lignes(event.target.value)
                        const prochaines = periodes.map((periodeCourante, indexCourant) => {
                          if (indexCourant !== periodeIndex) return periodeCourante
                          return {
                            ...periodeCourante,
                            domaines: periodeCourante.domaines.map((domaineCourant, indexDomaine) =>
                              indexDomaine === domaineIndex
                                ? { ...domaineCourant, items }
                                : domaineCourant
                            ),
                          }
                        })
                        onPeriodesChange(prochaines)
                      }}
                    />
                  </div>
                )
              })}
              <Bouton
                type="button"
                variant="contour"
                size="sm"
                icon={Plus}
                aria-label={`Ajouter un domaine à la période ${periode.numero}`}
                className="w-full motion-reduce:transition-none sm:w-auto"
                onClick={() => {
                  onPeriodesChange(periodes.map((periodeCourante, indexCourant) =>
                    indexCourant === periodeIndex
                      ? {
                          ...periodeCourante,
                          domaines: [
                            ...periodeCourante.domaines,
                            { nom: '', items: [] },
                          ],
                        }
                      : periodeCourante
                  ))
                }}
              >
                Ajouter un domaine
              </Bouton>
            </div>
          </section>
        ))}
        {periodes.length === 0 && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Aucune période n&apos;est encore construite dans ce format.
          </p>
        )}
        {prochainePeriode !== null && (
          <Bouton
            type="button"
            variant="contour"
            size="sm"
            icon={Plus}
            className="w-full motion-reduce:transition-none sm:w-auto"
            onClick={() => onPeriodesChange([
              ...periodes,
              { numero: prochainePeriode, domaines: [] },
            ])}
          >
            Ajouter une période
          </Bouton>
        )}
      </div>
    )
  }

  const prochaineSemaine = premierNumeroDisponible(
    semaines.map(semaine => semaine.numero),
    36,
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-label="Contenu par semaine">
      {semaines.map((semaine, index) => (
        <section
          key={`${semaine.numero}-${index}`}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-violet-100 px-2 text-sm font-bold text-violet-800">
              S{semaine.numero}
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">
                {libelleSemaine(semaine.numero, datesParNumero?.[semaine.numero])}
              </h3>
              {datesParNumero?.[semaine.numero] && (
                <p className="text-xs text-slate-500">Semaine {semaine.numero}</p>
              )}
            </div>
          </div>
          {semaineEstVide(semaine) && (
            <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Aucun contenu du document sur cette semaine. Tu pourras la remplir plus tard.
            </p>
          )}

          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor={`semaine-${index}-items`}
          >
            Notions, une par ligne
          </label>
          <textarea
            id={`semaine-${index}-items`}
            aria-label={`Notions de la semaine ${semaine.numero}`}
            className={`${CHAMP} min-h-28 resize-y`}
            value={semaine.items.join('\n')}
            onChange={event => {
              const items = lignes(event.target.value)
              onSemainesChange(semaines.map((semaineCourante, indexCourant) =>
                indexCourant === index ? { ...semaineCourante, items } : semaineCourante
              ))
            }}
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor={`semaine-${index}-pages`}
              >
                Pages
              </label>
              <input
                id={`semaine-${index}-pages`}
                aria-label={`Pages de la semaine ${semaine.numero}`}
                className={CHAMP}
                value={semaine.pages}
                onChange={event => {
                  const pages = event.target.value
                  onSemainesChange(semaines.map((semaineCourante, indexCourant) =>
                    indexCourant === index ? { ...semaineCourante, pages } : semaineCourante
                  ))
                }}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor={`semaine-${index}-mots`}
              >
                Mots, un par ligne
              </label>
              <textarea
                id={`semaine-${index}-mots`}
                aria-label={`Mots exemples de la semaine ${semaine.numero}`}
                className={`${CHAMP} min-h-20 resize-y`}
                value={semaine.mots_exemple.join('\n')}
                onChange={event => {
                  const mots_exemple = lignes(event.target.value)
                  onSemainesChange(semaines.map((semaineCourante, indexCourant) =>
                    indexCourant === index
                      ? { ...semaineCourante, mots_exemple }
                      : semaineCourante
                  ))
                }}
              />
            </div>
          </div>
        </section>
      ))}
      {semaines.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
          Aucune semaine n&apos;est encore construite dans ce format.
        </p>
      )}
      {prochaineSemaine !== null && (
        <Bouton
          type="button"
          variant="contour"
          size="sm"
          icon={Plus}
          className="w-full motion-reduce:transition-none sm:col-span-2 sm:w-auto"
          onClick={() => onSemainesChange([
            ...semaines,
            {
              numero: prochaineSemaine,
              items: [],
              pages: '',
              mots_exemple: [],
            },
          ])}
        >
          Ajouter une semaine
        </Bouton>
      )}
    </div>
  )
}
