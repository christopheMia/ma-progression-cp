'use client'
import { FileDown, Printer, Sparkles } from 'lucide-react'
import { Eleve, Acquisition, Semaine, Appreciation } from '@/types'
import { toggleAcquisition } from '@/lib/actions/semaine'
import { upsertAppreciation } from '@/lib/actions/appreciation'
import { exporterSuiviWord } from '@/lib/export-word'
import { imprimerElement } from '@/lib/print'
import { celebrate } from '@/lib/confetti'
import { useTransition, useState, useEffect, useRef } from 'react'
import Bouton from '@/components/ui/Bouton'

type ApprState = { statut: string | null; commentaire: string }
type Methode = { methode_id: string; matiere: string; items: string[]; suivi_actif: boolean }

function emojiMatiere(m: string) { return m === 'francais' ? '📖' : m === 'maths' ? '🔢' : '📋' }
function labelMatiere(m: string) { return m === 'francais' ? 'Français' : m === 'maths' ? 'Maths' : m.charAt(0).toUpperCase() + m.slice(1) }

const k = (eleveId: string, matiere: string) => `${eleveId}|${matiere}`

export default function StudentTracking({ semaine, eleves, acquisitions, appreciations, methodes }: {
  semaine: Semaine
  eleves: Eleve[]
  acquisitions: Acquisition[]
  appreciations: Appreciation[]
  methodes: Methode[]
}) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [bilanLoading, setBilanLoading] = useState<string | null>(null)
  // Replié par défaut : la liste élèves x matières est longue ; on la déplie au besoin.
  const [open, setOpen] = useState(false)
  const wasPending = useRef(false)
  const blocRef = useRef<HTMLDivElement>(null)

  const [appr, setAppr] = useState<Record<string, ApprState>>(() => {
    const init: Record<string, ApprState> = {}
    for (const a of appreciations) init[k(a.eleve_id, a.matiere)] = { statut: a.statut, commentaire: a.commentaire ?? '' }
    return init
  })

  useEffect(() => {
    if (wasPending.current && !isPending) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(t)
    }
    wasPending.current = isPending
  }, [isPending])

  function isAcquis(eleveId: string, matiere: string, grapheme: string) {
    return acquisitions.some(a => a.eleve_id === eleveId && a.matiere === matiere && a.grapheme === grapheme && a.acquis)
  }
  function nbAcquis(eleveId: string, matiere: string, items: string[]) {
    return items.filter(g => isAcquis(eleveId, matiere, g)).length
  }
  function getAppr(eleveId: string, matiere: string): ApprState {
    return appr[k(eleveId, matiere)] ?? { statut: null, commentaire: '' }
  }

  function handleToggle(eleveId: string, matiere: string, grapheme: string, current: boolean, items: string[]) {
    if (!current && nbAcquis(eleveId, matiere, items) === items.length - 1 && items.length > 0) {
      celebrate()
    }
    startTransition(() => toggleAcquisition(semaine.id, eleveId, matiere, grapheme, !current))
  }

  function handleStatut(eleveId: string, matiere: string, value: string) {
    const current = getAppr(eleveId, matiere)
    const statut = current.statut === value ? null : value
    const next = { ...current, statut }
    setAppr(p => ({ ...p, [k(eleveId, matiere)]: next }))
    startTransition(() => upsertAppreciation(semaine.id, eleveId, matiere, statut, next.commentaire))
  }

  function handleComment(eleveId: string, matiere: string, commentaire: string) {
    setAppr(p => ({ ...p, [k(eleveId, matiere)]: { ...getAppr(eleveId, matiere), commentaire } }))
  }

  function saveComment(eleveId: string, matiere: string) {
    const a = getAppr(eleveId, matiere)
    startTransition(() => upsertAppreciation(semaine.id, eleveId, matiere, a.statut, a.commentaire))
  }

  async function generateBilan(eleve: Eleve, matiere: string, items: string[]) {
    const current = getAppr(eleve.id, matiere)
    const itemsAcquis = items.filter(g => isAcquis(eleve.id, matiere, g))
    const itemsNonAcquis = items.filter(g => !isAcquis(eleve.id, matiere, g))
    setBilanLoading(k(eleve.id, matiere))
    try {
      const res = await fetch('/api/ia-bilan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSemaine: semaine.numero,
          matiere,
          itemsAcquis,
          itemsNonAcquis,
          statut: current.statut,
        }),
      })
      const data = await res.json()
      if (res.ok && typeof data.bilan === 'string') {
        // Le prénom ne quitte jamais le navigateur : remplacement local du placeholder.
        const texte = data.bilan.replaceAll('[ELEVE]', eleve.prenom)
        setAppr(p => ({ ...p, [k(eleve.id, matiere)]: { ...current, commentaire: texte } }))
        startTransition(() => upsertAppreciation(semaine.id, eleve.id, matiere, current.statut, texte))
      } else {
        alert(data.error ?? 'Erreur lors de la génération du bilan.')
      }
    } catch {
      alert('Erreur réseau lors de la génération du bilan.')
    } finally {
      setBilanLoading(null)
    }
  }

  function statutLabel(statut: string | null) {
    return statut === 'acquis' ? 'Acquis' : statut === 'pas_acquis' ? 'Pas encore' : '—'
  }

  function exportWord(matiere: string, items: string[]) {
    exporterSuiviWord({
      numeroSemaine: semaine.numero,
      graphemes: items,
      lignes: eleves.map(e => ({
        prenom: e.prenom,
        acquis: items.map(g => isAcquis(e.id, matiere, g)),
        progres: `${nbAcquis(e.id, matiere, items)}/${items.length}`,
        bilan: getAppr(e.id, matiere).statut ? statutLabel(getAppr(e.id, matiere).statut) : '',
        commentaire: getAppr(e.id, matiere).commentaire,
      })),
    })
  }

  return (
    <div ref={blocRef} className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 group">
          <h2 className="font-bold text-gray-700 group-hover:text-violet-700">✅ Suivi des élèves</h2>
          <span className="flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-100 rounded-full px-3 py-1">
            <span aria-hidden>{open ? '▾' : '▸'}</span>
            {open ? 'Replier' : 'Déplier'}
          </span>
        </button>
        {isPending && <span className="text-xs text-gray-400">Enregistrement...</span>}
        {saved && !isPending && <span className="text-xs text-green-600">✓ Sauvegardé</span>}
        {open && (
          <div className="no-print ml-auto flex gap-2">
            <Bouton type="button" variant="neutre" size="sm" icon={Printer}
              onClick={() => imprimerElement(blocRef.current)}
              className="text-sm">
              Imprimer
            </Bouton>
          </div>
        )}
      </div>
      {!open && (
        <p className="text-xs text-gray-400">Clique pour ouvrir le suivi des élèves (étoiles, bilans, commentaires).</p>
      )}
      {open && (
      <>
      <p className="text-xs text-gray-400 mb-4">
        Pour chaque élève et chaque <strong>matière</strong> : cliquez l&apos;<strong>étoile</strong> de la
        notion acquise (★), donnez un <strong>bilan</strong> de la semaine, et ajoutez un
        <strong> commentaire</strong> si besoin.
      </p>

      {methodes.filter(m => m.suivi_actif).length > 1 && (
        <div className="sticky top-16 z-10 -mx-5 mb-4 px-5 py-2 flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur border-b border-slate-100 no-print">
          <span className="text-xs text-gray-400">Aller à :</span>
          {methodes.filter(m => m.suivi_actif).map(({ matiere }) => (
            <a key={matiere} href={`#suivi-${matiere}`}
              className="text-xs rounded-full border border-violet-200 text-violet-700 px-3 py-1 hover:bg-violet-50 transition-colors">
              {emojiMatiere(matiere)} {labelMatiere(matiere)}
            </a>
          ))}
          <button type="button" onClick={() => setOpen(false)}
            className="ml-auto text-xs font-semibold text-gray-500 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50">
            ▴ Replier le suivi
          </button>
        </div>
      )}

      {methodes.filter(m => m.suivi_actif).map(({ matiere, items }) => (
        <section key={matiere} id={`suivi-${matiere}`} className="mb-8 last:mb-0 scroll-mt-24">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-bold text-violet-700">{emojiMatiere(matiere)} {labelMatiere(matiere)}</h3>
            <Bouton type="button" variant="contour" size="sm" icon={FileDown}
              onClick={() => exportWord(matiere, items)}
              className="no-print text-sm">
              Word
            </Bouton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left text-sm font-bold text-gray-700 pb-2 pr-4">Élève</th>
                  {items.map(g => (
                    <th key={g} className="pb-2 px-2 align-bottom">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">notion</span>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 font-bold"
                          title={`« ${g} » — étoile si l'élève le maîtrise`}>{g}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center text-sm font-bold text-gray-700 pb-2 px-3">Progrès</th>
                  <th className="text-center text-sm font-bold text-gray-700 pb-2 px-3">Bilan de la semaine</th>
                  <th className="text-left text-sm font-bold text-gray-700 pb-2 pl-3">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eleves.map(eleve => {
                  const acquisEleve = nbAcquis(eleve.id, matiere, items)
                  const totalG = items.length
                  const complet = totalG > 0 && acquisEleve === totalG
                  const a = getAppr(eleve.id, matiere)
                  return (
                    <tr key={eleve.id} className={complet ? 'bg-amber-50/60' : undefined}>
                      <td className="py-2 pr-4 font-medium text-gray-700 whitespace-nowrap">
                        {complet && '🏆 '}{eleve.prenom}
                      </td>
                      {items.map(grapheme => {
                        const acquis = isAcquis(eleve.id, matiere, grapheme)
                        return (
                          <td key={grapheme} className="text-center py-2 px-2">
                            <button
                              type="button"
                              onClick={() => handleToggle(eleve.id, matiere, grapheme, acquis, items)}
                              disabled={isPending}
                              title={`${eleve.prenom} · « ${grapheme} » — ${acquis ? 'acquis ✓ (cliquer pour annuler)' : 'cliquer pour marquer comme acquis'}`}
                              className={`text-xl leading-none transition-transform hover:scale-125 disabled:opacity-50 ${acquis ? 'text-amber-400' : 'text-gray-300'}`}>
                              {acquis ? '★' : '☆'}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 justify-center">
                          <span className="text-xs text-gray-400 tabular-nums">{acquisEleve}/{totalG}</span>
                          <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${complet ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${totalG > 0 ? (acquisEleve / totalG) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="no-print flex gap-1 justify-center">
                          <button type="button" onClick={() => handleStatut(eleve.id, matiere, 'acquis')} disabled={isPending}
                            className={`text-xs rounded-full px-2.5 py-1 border transition-colors disabled:opacity-50 ${
                              a.statut === 'acquis'
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'text-gray-500 border-gray-300 hover:bg-emerald-50'
                            }`}>
                            ✓ Acquis
                          </button>
                          <button type="button" onClick={() => handleStatut(eleve.id, matiere, 'pas_acquis')} disabled={isPending}
                            className={`text-xs rounded-full px-2.5 py-1 border transition-colors disabled:opacity-50 ${
                              a.statut === 'pas_acquis'
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'text-gray-500 border-gray-300 hover:bg-amber-50'
                            }`}>
                            Pas encore
                          </button>
                        </div>
                        <span className="print-only text-sm text-gray-800">{statutLabel(a.statut)}</span>
                      </td>
                      <td className="pl-3 py-2">
                        <div className="no-print flex flex-col gap-1 w-48">
                          <textarea
                            value={a.commentaire}
                            onChange={e => handleComment(eleve.id, matiere, e.target.value)}
                            onBlur={() => saveComment(eleve.id, matiere)}
                            placeholder="Remarque libre…"
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg p-1.5 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-violet-400 outline-none resize-y" />
                          <Bouton type="button" variant="contour" size="sm" icon={Sparkles}
                            onClick={() => generateBilan(eleve, matiere, items)}
                            loading={bilanLoading === k(eleve.id, matiere)}
                            disabled={isPending}
                            title="Rédige un bilan automatiquement (le prénom n'est jamais envoyé à l'IA)"
                            className="self-start px-2 py-0.5 text-[11px]">
                            Bilan IA
                          </Bouton>
                        </div>
                        <span className="print-only text-sm text-gray-800">{a.commentaire || '—'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      </>
      )}
    </div>
  )
}
