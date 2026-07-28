'use client'

import { useMemo, useState, useTransition } from 'react'
import { Copy } from 'lucide-react'
import BoutonsNiveau, { LegendeNiveaux } from '@/components/ui/BoutonsNiveau'
import BlocMatiere from '@/components/livret/BlocMatiere'
import {
  construireBriques,
  type ElementLivret,
  type Formulation,
  type MotDeLaSemaine,
} from '@/lib/briques-bilan'

export type CompetenceBilan = {
  id: string
  matiere: string
  domaine: string
  libelle: string
}
import { LIBELLE_NIVEAU, estNiveau, type Niveau } from '@/lib/niveaux'
import {
  definirPositionnement,
  enregistrerAppreciationPeriode,
  enregistrerFormulation,
} from '@/lib/actions/livret'

export type Eleve = { id: string; prenom: string; genre: 'f' | 'm' | null }
export type EtatAppreciation = {
  texte: string
  ecartees: string[]
  retouchees: Record<string, { texte: string; suite: string }>
}

const VIDE: EtatAppreciation = { texte: '', ecartees: [], retouchees: {} }

const LIBELLE_MATIERE: Record<string, string> = {
  francais: 'Français',
  maths: 'Mathématiques',
}

function nommerMatiere(matiere: string) {
  return LIBELLE_MATIERE[matiere] ?? matiere.charAt(0).toUpperCase() + matiere.slice(1)
}

const clePosition = (eleveId: string, periode: number, competenceId: string) =>
  `${eleveId}|${periode}|${competenceId}`
const cleAppreciation = (eleveId: string, periode: number, matiere: string) =>
  `${eleveId}|${periode}|${matiere}`

export default function Livret({
  eleves,
  periodes,
  competences,
  travaillees,
  motsDeLaSemaine,
  formulations,
  positions,
  appreciations,
}: {
  eleves: Eleve[]
  periodes: number[]
  competences: CompetenceBilan[]
  /** Ce que l'enseignante a coché dans « Programme couvert », par période. */
  travaillees: { periode: number; competenceId: string }[]
  motsDeLaSemaine: Record<string, Record<number, MotDeLaSemaine[]>>
  formulations: Record<string, Formulation>
  positions: { eleveId: string; periode: number; competenceId: string; niveau: string }[]
  appreciations: {
    eleveId: string; periode: number; matiere: string
    texte: string; ecartees: string[]
    retouchees: Record<string, { texte: string; suite: string }>
  }[]
}) {
  const [isPending, startTransition] = useTransition()
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')

  const [periode, setPeriode] = useState(periodes[0])
  const [iEleve, setIEleve] = useState(0)

  const [niveaux, setNiveaux] = useState<Record<string, Niveau>>(() => {
    const init: Record<string, Niveau> = {}
    for (const p of positions) {
      if (estNiveau(p.niveau)) init[clePosition(p.eleveId, p.periode, p.competenceId)] = p.niveau
    }
    return init
  })

  const [textes, setTextes] = useState<Record<string, EtatAppreciation>>(() => {
    const init: Record<string, EtatAppreciation> = {}
    for (const a of appreciations) {
      init[cleAppreciation(a.eleveId, a.periode, a.matiere)] = {
        texte: a.texte, ecartees: a.ecartees, retouchees: a.retouchees,
      }
    }
    return init
  })

  const [phrases, setPhrases] = useState<Record<string, Formulation>>(formulations)
  const [choisies, setChoisies] = useState<Record<string, boolean>>({})

  const eleve = eleves[iEleve]

  // Les compétences cochées dans « Programme couvert » pour cette période, dans
  // l'ordre du référentiel, avec le niveau posé pour cet élève. Rien n'est
  // calculé : c'est l'enseignante qui coche, et c'est elle qui positionne.
  const elements: ElementLivret[] = useMemo(() => {
    if (!eleve) return []
    const prises = new Set(
      travaillees.filter(t => t.periode === periode).map(t => t.competenceId),
    )
    return competences
      .filter(c => prises.has(c.id))
      .map(c => ({
        competenceId: c.id,
        matiere: c.matiere,
        domaine: c.domaine,
        libelle: c.libelle,
        niveau: niveaux[clePosition(eleve.id, periode, c.id)] ?? null,
      }))
  }, [eleve, periode, competences, travaillees, niveaux])

  const matieres = useMemo(
    () => [...new Set(elements.map(e => e.matiere))],
    [elements],
  )

  const estChoisie = (matiere: string) => choisies[matiere] ?? true
  const matieresChoisies = matieres.filter(estChoisie)

  function etatDe(matiere: string): EtatAppreciation {
    return textes[cleAppreciation(eleve.id, periode, matiere)] ?? VIDE
  }

  function briquesDe(matiere: string) {
    const etat = etatDe(matiere)
    return construireBriques({
      elements: elements.filter(e => e.matiere === matiere),
      formulations: phrases,
      motsDeLaSemaine: (motsDeLaSemaine[eleve?.id]?.[periode] ?? []).filter(m => m.matiere === matiere),
      ecartees: etat.ecartees,
      retouchees: etat.retouchees,
    })
  }

  /** Les compétences positionnées dont la phrase de ce niveau n'existe pas. */
  function aFormuler(matiere: string) {
    return elements.filter(element => {
      if (element.matiere !== matiere || element.niveau === null) return false
      const f = phrases[element.competenceId]
      if (!f) return true
      if (element.niveau === 'depasse') return !f.eclat.trim() && !f.reussite.trim()
      if (element.niveau === 'atteint') return !f.reussite.trim()
      if (element.niveau === 'partiellement') return !f.encours.trim()
      return !f.vigilance.trim()
    })
  }

  const bilansCommences = eleves.filter(e => matieres.some(m => (
    (textes[cleAppreciation(e.id, periode, m)]?.texte ?? '').trim().length > 0
  ))).length

  function poserNiveau(competenceId: string, niveau: Niveau) {
    const cle = clePosition(eleve.id, periode, competenceId)
    const precedent = niveaux[cle]
    setErreur('')
    setNiveaux(etat => ({ ...etat, [cle]: niveau }))

    startTransition(async () => {
      const r = await definirPositionnement(eleve.id, periode, competenceId, niveau)
      if (!r.ok) {
        setNiveaux(etat => {
          const suivant = { ...etat }
          if (precedent === undefined) delete suivant[cle]
          else suivant[cle] = precedent
          return suivant
        })
        setErreur(r.message)
      }
    })
  }

  function majAppreciation(matiere: string, changement: Partial<EtatAppreciation>) {
    const cle = cleAppreciation(eleve.id, periode, matiere)
    const suivant = { ...etatDe(matiere), ...changement }
    setTextes(etat => ({ ...etat, [cle]: suivant }))
    setErreur('')

    startTransition(async () => {
      const r = await enregistrerAppreciationPeriode(
        eleve.id, periode, matiere, suivant.texte, suivant.ecartees, suivant.retouchees,
      )
      if (!r.ok) setErreur(r.message)
    })
  }

  function enregistrerPhrases(competenceId: string, formulation: Formulation) {
    setPhrases(etat => ({ ...etat, [competenceId]: formulation }))
    setErreur('')
    startTransition(async () => {
      const r = await enregistrerFormulation(competenceId, formulation)
      if (!r.ok) setErreur(r.message)
    })
  }

  /** Le texte d'une matière : ses éléments positionnés, puis le commentaire. */
  function texteMatiere(matiere: string) {
    const lignes: string[] = [nommerMatiere(matiere).toUpperCase(), 'Éléments travaillés :']
    for (const element of elements.filter(e => e.matiere === matiere)) {
      lignes.push(`  ${element.libelle} : ${
        element.niveau ? LIBELLE_NIVEAU[element.niveau] : 'non positionné'
      }`)
    }
    lignes.push('', 'Acquisitions, progrès et difficultés :')
    lignes.push(etatDe(matiere).texte.trim() || '(rien de rédigé)')
    return lignes.join('\n')
  }

  function copier(texte: string, confirmation: string) {
    const fini = () => {
      setMessage(confirmation)
      setTimeout(() => setMessage(''), 3000)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texte).then(fini, fini)
    else fini()
  }

  function copierGroupe() {
    if (matieresChoisies.length === 0) return
    const texte = [
      `${eleve.prenom} · Période ${periode}`,
      '',
      matieresChoisies.map(texteMatiere).join('\n\n'),
    ].join('\n')
    copier(texte, matieresChoisies.length === matieres.length
      ? '✓ tout le bilan copié'
      : `✓ ${matieresChoisies.length} matière${matieresChoisies.length > 1 ? 's copiées' : ' copiée'}`)
  }

  if (eleves.length === 0) {
    return (
      <p className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
        Aucun élève dans la classe pour l’instant.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Période
            </span>
            <select
              value={periode}
              onChange={e => setPeriode(Number(e.target.value))}
              className="rounded-lg border px-2 py-1 font-semibold text-gray-900"
            >
              {periodes.map(p => <option key={p} value={p}>Période {p}</option>)}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Élève
            </span>
            <select
              value={iEleve}
              onChange={e => setIEleve(Number(e.target.value))}
              className="rounded-lg border px-2 py-1 font-semibold text-gray-900"
            >
              {eleves.map((e, i) => {
                const commence = matieres.some(m => (
                  (textes[cleAppreciation(e.id, periode, m)]?.texte ?? '').trim().length > 0
                ))
                return (
                  <option key={e.id} value={i}>
                    {e.prenom} · {commence ? 'commencé' : 'rien saisi'}
                  </option>
                )
              })}
            </select>
          </label>

          <span className="text-xs text-gray-500">
            {bilansCommences} bilan{bilansCommences > 1 ? 's' : ''} commencé
            {bilansCommences > 1 ? 's' : ''} sur {eleves.length}
          </span>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setIEleve((iEleve - 1 + eleves.length) % eleves.length)}
              className="rounded-lg border px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-50"
            >
              ← {eleves[(iEleve - 1 + eleves.length) % eleves.length].prenom}
            </button>
            <button
              type="button"
              onClick={() => setIEleve((iEleve + 1) % eleves.length)}
              className="rounded-lg border px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-50"
            >
              {eleves[(iEleve + 1) % eleves.length].prenom} →
            </button>
          </div>
        </div>

        {isPending && <p className="mt-2 text-xs text-gray-500">Enregistrement...</p>}
        {erreur && (
          <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erreur}
          </p>
        )}
      </section>

      {elements.length === 0 ? (
        <p className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
          Aucune compétence cochée pour cette période, donc rien à positionner. Passe
          par « Programme couvert » pour cocher ce que la classe a travaillé.
        </p>
      ) : (
        <>
          <section className="rounded-2xl border bg-white p-4">
            <h2 className="font-bold text-gray-700">
              Ce qui a été travaillé, et où en est {eleve.prenom}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Les compétences cochées dans « Programme couvert », dans l’ordre du
              livret. Pose le niveau de chaque ligne.
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-3">Domaine</th>
                    <th className="py-2 pr-3">Élément du programme travaillé</th>
                    <th className="py-2 whitespace-nowrap">Positionnement</th>
                  </tr>
                </thead>
                <tbody>
                  {matieres.map(matiere => (
                    <MatiereLignes
                      key={matiere}
                      matiere={matiere}
                      elements={elements.filter(e => e.matiere === matiere)}
                      prenom={eleve.prenom}
                      disabled={isPending}
                      onNiveau={poserNiveau}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3">
              <LegendeNiveaux />
            </div>
          </section>

          <p className="text-sm text-gray-600">
            Le livret officiel demande un commentaire par matière. Chaque bloc se rédige,
            se corrige et se copie tout seul. La case de son titre décide de ce qui part
            quand tu copies plusieurs matières d’un coup.
          </p>

          {matieres.map(matiere => (
            <BlocMatiere
              key={matiere}
              titre={nommerMatiere(matiere)}
              eleve={eleve}
              briques={briquesDe(matiere)}
              aFormuler={aFormuler(matiere)}
              formulations={phrases}
              etat={etatDe(matiere)}
              choisie={estChoisie(matiere)}
              disabled={isPending}
              onChoisie={valeur => setChoisies(etat => ({ ...etat, [matiere]: valeur }))}
              onChange={changement => majAppreciation(matiere, changement)}
              onFormulation={enregistrerPhrases}
              onCopier={() => copier(texteMatiere(matiere), `✓ ${nommerMatiere(matiere)} copié`)}
            />
          ))}

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={matieresChoisies.length === matieres.length}
                onChange={e => {
                  const valeur = e.target.checked
                  setChoisies(Object.fromEntries(matieres.map(m => [m, valeur])))
                }}
                className="h-4 w-4 accent-violet-600"
              />
              Toutes les matières
            </label>
            <button
              type="button"
              onClick={copierGroupe}
              disabled={matieresChoisies.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-violet-600 bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Copy className="h-4 w-4" aria-hidden />
              {matieresChoisies.length === 0
                ? 'Rien à copier'
                : matieresChoisies.length === 1
                  ? `Copier ${nommerMatiere(matieresChoisies[0])}`
                  : `Copier les ${matieresChoisies.length} matières cochées`}
            </button>
            {message && <span className="text-sm font-semibold text-emerald-700">{message}</span>}
          </div>
        </>
      )}
    </div>
  )
}

/** Les lignes d'une matière : son titre, puis un élément par ligne. */
function MatiereLignes({
  matiere,
  elements,
  prenom,
  disabled,
  onNiveau,
}: {
  matiere: string
  elements: ElementLivret[]
  prenom: string
  disabled: boolean
  onNiveau: (competenceId: string, niveau: Niveau) => void
}) {
  let domainePrecedent = ''
  return (
    <>
      <tr>
        <th
          colSpan={3}
          scope="colgroup"
          className="bg-violet-50 px-2 py-1.5 text-left font-bold text-violet-900"
        >
          {nommerMatiere(matiere)}
        </th>
      </tr>
      {elements.map(element => {
        const memeDomaine = element.domaine === domainePrecedent
        domainePrecedent = element.domaine
        return (
          <tr key={element.competenceId} className="border-b align-top">
            {/* Le domaine ne se repete pas d'une ligne a l'autre, comme dans le
                document officiel. */}
            <td className="py-2 pr-3 font-serif text-violet-900">
              {memeDomaine ? '' : element.domaine}
            </td>
            {/* La competence EN GRAS, et rien en dessous : c'est exactement ce
                qui se recopie dans le livret (demande de Christophe du 28/07). */}
            <td className="py-2 pr-3 font-semibold text-gray-900">{element.libelle}</td>
            <td className="py-2">
              <BoutonsNiveau
                valeur={element.niveau}
                onChange={niveau => onNiveau(element.competenceId, niveau)}
                disabled={disabled}
                libelle={`${prenom}, ${element.libelle}`}
              />
            </td>
          </tr>
        )
      })}
    </>
  )
}
