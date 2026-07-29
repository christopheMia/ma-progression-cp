'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, Copy, Plus, Sparkles, Trash2 } from 'lucide-react'
import ChoixComportement, { TEINTE_COMPORTEMENT, Visage } from '@/components/ui/Visage'
import {
  LIBELLE_COMPORTEMENT,
  posturePour,
  resumerComportement,
  type EtatComportement,
} from '@/lib/comportement'
import { redigerAppreciation, type Brique } from '@/lib/briques-bilan'
import { useSauvegardeDifferee } from '@/lib/useSauvegardeDifferee'
import {
  ajouterObservation,
  definirComportement,
  definirGenre,
  enregistrerBilanPeriode,
  modifierObservation,
  supprimerObservation,
} from '@/lib/actions/suivi-libre'

export type EleveSuivi = { id: string; prenom: string; genre: 'f' | 'm' | null }
export type SemainePeriode = { id: string; numero: number }
export type Observation = {
  id: string
  eleveId: string
  semaineId: string
  observeeLe: string
  texte: string
}

function enFrancais(iso: string) {
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

/**
 * Le titre d'une section du suivi.
 *
 * Retour de Christophe du 29/07 : « les titres des sections doivent etre plus
 * visibles ». Ils etaient en tout petit, en majuscules grises : ils se lisaient
 * comme une etiquette technique, pas comme un titre. Ils sont maintenant a la
 * taille du texte courant, en gras et en violet fonce, avec une barre de
 * couleur qui marque le debut du bloc.
 */
function TitreSection({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-violet-950">
      <span aria-hidden className="h-5 w-1 shrink-0 rounded-full bg-violet-600" />
      {children}
    </h3>
  )
}

/**
 * Le suivi des élèves, en texte libre.
 *
 * Refait le 28/07/2026. Christophe : « le suivi des élèves doit se transformer
 * uniquement en zone de texte libre, avec possibilité de mettre la date avec
 * le calendrier, la liste des élèves doit être déroulante, avec un système à
 * code couleur qui dira comment s'est passée chaque semaine ».
 *
 * Fini les cases par notion et par critère. Un élève, une pastille de
 * comportement pour la semaine, et des observations datées.
 */
export default function SuiviEleves({
  semaineId,
  numeroSemaine,
  periode,
  dateParDefaut,
  eleves,
  semainesPeriode,
  semainesClasse = [],
  comportements: comportementsInitiaux,
  observations: observationsInitiales,
  bilans: bilansInitiaux,
}: {
  semaineId: string
  numeroSemaine: number
  /** La période en cours, ou null si le calendrier ne la connaît pas. */
  periode: number | null
  /** Le premier jour de la semaine : la date la plus probable d'une observation. */
  dateParDefaut: string
  eleves: EleveSuivi[]
  /** Les semaines de la période en cours, pour la frise. */
  semainesPeriode: SemainePeriode[]
  /** Toute l'année, pour retrouver une note écrite une autre période. */
  semainesClasse?: { id: string; numero: number; periode: number | null }[]
  /** Clé `eleveId|semaineId`. */
  comportements: Record<string, EtatComportement>
  observations: Observation[]
  /** Le bilan déjà rédigé, par élève. */
  bilans: Record<string, { texte: string; ecartees: string[] }>
}) {
  const [isPending, startTransition] = useTransition()
  const [erreur, setErreur] = useState('')
  const [iEleve, setIEleve] = useState(0)
  const [comportements, setComportements] = useState(comportementsInitiaux)
  const [observations, setObservations] = useState(observationsInitiales)
  const [dateSaisie, setDateSaisie] = useState(dateParDefaut)
  const [bilans, setBilans] = useState(bilansInitiaux)
  const [copie, setCopie] = useState('')
  const [vue, setVue] = useState('semaine')
  const [recherche, setRecherche] = useState('')
  const programmer = useSauvegardeDifferee()
  const [genres, setGenres] = useState<Record<string, 'f' | 'm' | null>>(
    () => Object.fromEntries(eleves.map(e => [e.id, e.genre])),
  )

  const eleve = eleves[iEleve]
  const cle = (eleveId: string, sId: string) => `${eleveId}|${sId}`

  if (!eleve) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
        Aucun élève dans la classe pour l’instant.
      </div>
    )
  }

  const etatSemaine = comportements[cle(eleve.id, semaineId)] ?? null
  const etatsPeriode = semainesPeriode.map(s => comportements[cle(eleve.id, s.id)] ?? null)
  const resume = resumerComportement(etatsPeriode)
  const posture = posturePour(resume)

  const siennes = observations
    .filter(o => o.eleveId === eleve.id)
    .sort((a, b) => a.observeeLe.localeCompare(b.observeeLe))

  // En fin de periode il y a une tonne de notes (remarque de Christophe du
  // 28/07), et il faut pouvoir en retrouver une ecrite il y a deux mois. Donc
  // on montre une tranche a la fois, et on navigue.
  const periodeDeLaSemaine = new Map(semainesClasse.map(s => [s.id, s.periode]))
  const numeroDeLaSemaine = new Map(semainesClasse.map(s => [s.id, s.numero]))
  const moisEnCours = dateParDefaut.slice(0, 7)

  /** Les observations de la période en cours : c'est elles qui font le bilan. */
  const idsPeriode = new Set(semainesPeriode.map(s => s.id))
  const siennesPeriode = siennes.filter(o => idsPeriode.has(o.semaineId))

  const tranches: { code: string; libelle: string; notes: Observation[] }[] = [
    { code: 'semaine', libelle: `Cette semaine (S${numeroSemaine})`, notes: siennes.filter(o => o.semaineId === semaineId) },
    { code: 'mois', libelle: 'Ce mois-ci', notes: siennes.filter(o => o.observeeLe.slice(0, 7) === moisEnCours) },
    ...[...new Set(semainesClasse.map(s => s.periode).filter((p): p is number => p != null))]
      .sort((a, b) => a - b)
      .map(p => ({
        code: `periode:${p}`,
        libelle: `Période ${p}`,
        notes: siennes.filter(o => periodeDeLaSemaine.get(o.semaineId) === p),
      })),
    { code: 'annee', libelle: 'Toute l’année', notes: siennes },
  ]

  const tranche = tranches.find(t => t.code === vue) ?? tranches[0]
  const cherche = recherche.trim().toLowerCase()
  const affichees = cherche
    ? tranche.notes.filter(o => o.texte.toLowerCase().includes(cherche))
    : tranche.notes

  function poserComportement(etat: EtatComportement | null) {
    const precedent = etatSemaine
    setErreur('')
    setComportements(etatActuel => {
      const suivant = { ...etatActuel }
      if (etat === null) delete suivant[cle(eleve.id, semaineId)]
      else suivant[cle(eleve.id, semaineId)] = etat
      return suivant
    })

    startTransition(async () => {
      const r = await definirComportement(eleve.id, semaineId, etat)
      if (!r.ok) {
        setComportements(etatActuel => {
          const suivant = { ...etatActuel }
          if (precedent === null) delete suivant[cle(eleve.id, semaineId)]
          else suivant[cle(eleve.id, semaineId)] = precedent
          return suivant
        })
        setErreur(r.message)
      }
    })
  }

  function ajouter() {
    setErreur('')
    startTransition(async () => {
      const r = await ajouterObservation(eleve.id, semaineId, dateSaisie)
      if (!r.ok) {
        setErreur(r.message)
        return
      }
      setObservations(liste => [...liste, {
        id: r.valeur, eleveId: eleve.id, semaineId, observeeLe: dateSaisie, texte: '',
      }])
    })
  }

  function modifier(id: string, changement: Partial<Observation>) {
    const suivant = observations.map(o => (o.id === id ? { ...o, ...changement } : o))
    setObservations(suivant)
    const observation = suivant.find(o => o.id === id)
    if (!observation) return

    // Une lettre tapee ne vaut pas un aller-retour serveur : on enregistre
    // quand la frappe s'arrete.
    programmer(`obs:${id}`, () => {
      startTransition(async () => {
        const r = await modifierObservation(id, observation.texte, observation.observeeLe)
        if (!r.ok) setErreur(r.message)
      })
    })
  }

  // ── Le bilan de la période, dans le suivi de l'élève ──────────────────────
  // Demande de Christophe : le bouton vit ici, pas dans le livret. Les briques
  // viennent de ce qui a ete saisi, jamais d'ailleurs : la posture sort de la
  // frise, les observations sont les phrases deja ecrites.

  const bilan = bilans[eleve.id] ?? { texte: '', ecartees: [] }
  const ecartees = new Set(bilan.ecartees)

  const briquesBilan: Brique[] = [
    ...(posture
      ? [{
        cle: 'posture', role: 'posture', texte: posture, suite: '',
        source: `frise de la période${periode ? ` ${periode}` : ''}`,
        actif: !ecartees.has('posture'),
      }]
      : []),
    // Celles de la periode en cours et d'elle seule : l'ecran peut afficher
    // toute l'annee pour retrouver un fait, le bilan ne bilante qu'une periode.
    ...siennesPeriode
      .filter(o => o.texte.trim())
      .map(o => ({
        cle: `obs:${o.id}`,
        role: 'observation',
        texte: o.texte.trim(),
        suite: '',
        source: `le ${enFrancais(o.observeeLe)}`,
        actif: !ecartees.has(`obs:${o.id}`),
      })),
  ]

  /** `differe` pour la frappe au clavier ; un clic part tout de suite. */
  function enregistrerBilan(suivant: { texte: string; ecartees: string[] }, differe = false) {
    setBilans(etat => ({ ...etat, [eleve.id]: suivant }))
    if (periode === null) return
    const envoyer = () => startTransition(async () => {
      const r = await enregistrerBilanPeriode(
        eleve.id, periode, suivant.texte, suivant.ecartees,
      )
      if (!r.ok) setErreur(r.message)
    })
    if (differe) programmer(`bilan:${eleve.id}`, envoyer)
    else envoyer()
  }

  function basculerBrique(cle: string) {
    const suivantes = ecartees.has(cle)
      ? bilan.ecartees.filter(c => c !== cle)
      : [...bilan.ecartees, cle]
    enregistrerBilan({ ...bilan, ecartees: suivantes })
  }

  function faireLeBilan() {
    const texte = redigerAppreciation(briquesBilan, {
      prenom: eleve.prenom,
      genre: genres[eleve.id] ?? null,
    })
    enregistrerBilan({ ...bilan, texte })
  }

  function poserGenre(genre: 'f' | 'm' | null) {
    const precedent = genres[eleve.id] ?? null
    setErreur('')
    setGenres(etat => ({ ...etat, [eleve.id]: genre }))
    startTransition(async () => {
      const r = await definirGenre(eleve.id, genre)
      if (!r.ok) {
        setGenres(etat => ({ ...etat, [eleve.id]: precedent }))
        setErreur(r.message)
      }
    })
  }

  function copierBilan() {
    const texte = `${eleve.prenom}${periode ? ` · période ${periode}` : ''}\n\n${bilan.texte.trim()}`
    const fini = () => {
      setCopie('✓ copié')
      setTimeout(() => setCopie(''), 3000)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texte).then(fini, fini)
    else fini()
  }

  function retirer(id: string) {
    const avant = observations
    setObservations(liste => liste.filter(o => o.id !== id))
    startTransition(async () => {
      const r = await supprimerObservation(id)
      if (!r.ok) {
        setObservations(avant)
        setErreur(r.message)
      }
    })
  }

  return (
    <div id="suivi" className="scroll-mt-20 space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-violet-950">Suivi des élèves</h2>
        <label className="text-sm font-semibold text-gray-800">
          <span className="sr-only">Élève</span>
          <select
            value={iEleve}
            onChange={e => setIEleve(Number(e.target.value))}
            aria-label="Élève"
            className="rounded-lg border px-2 py-1 font-semibold text-gray-900"
          >
            {eleves.map((e, i) => <option key={e.id} value={i}>{e.prenom}</option>)}
          </select>
        </label>
        {/* Fille ou garcon : sans ca le bilan repete le prenom au lieu du
            pronom. On ne devine jamais le genre a partir du prenom, une
            erreur sortirait dans le livret officiel que les parents signent. */}
        {/* Deux lettres seules ne disent pas a quoi elles servent (retour de
            Christophe du 29/07) : le libelle est ecrit a cote, en clair. */}
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-800">Fille ou garçon ?</span>
          <span className="flex items-center gap-1" role="radiogroup" aria-label={`Genre de ${eleve.prenom}`}>
            {([['f', 'F', 'Fille'], ['m', 'G', 'Garçon']] as const).map(([code, lettre, mot]) => {
              const choisi = genres[eleve.id] === code
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={choisi}
                  aria-label={`${eleve.prenom} : ${mot.toLowerCase()}`}
                  title={mot}
                  disabled={isPending}
                  onClick={() => poserGenre(choisi ? null : code)}
                  className={`h-7 w-7 rounded-lg border text-xs font-bold disabled:opacity-50 ${
                    choisi
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-violet-300'
                  }`}
                >
                  {lettre}
                </button>
              )
            })}
          </span>
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

      {isPending && <p className="text-xs text-gray-500">Enregistrement...</p>}
      {erreur && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </p>
      )}

      <section>
        <TitreSection>Comment s’est passée la semaine {numeroSemaine}</TitreSection>
        <ChoixComportement
          valeur={etatSemaine}
          onChange={poserComportement}
          disabled={isPending}
          libelle={`${eleve.prenom}, semaine ${numeroSemaine}`}
        />
      </section>

      {semainesPeriode.length > 0 && (
        <section className="border-t pt-4">
          <TitreSection>La période d’un coup d’œil</TitreSection>
          <div className="flex flex-wrap items-center gap-1.5">
            {semainesPeriode.map(s => {
              const etat = comportements[cle(eleve.id, s.id)] ?? null
              const dit = etat
                ? `Semaine ${s.numero} : ${LIBELLE_COMPORTEMENT[etat]}`
                : `Semaine ${s.numero} : rien de noté`
              return (
                <span
                  key={s.id}
                  title={dit}
                  className={`flex h-10 w-10 flex-col items-center justify-center rounded-lg border-2 ${
                    s.id === semaineId ? 'ring-2 ring-violet-500 ring-offset-1' : ''
                  } ${etat ? `${TEINTE_COMPORTEMENT[etat]} border-current` : 'border-gray-200 text-gray-300'}`}
                >
                  {etat
                    ? <Visage etat={etat} taille={18} />
                    : <span aria-hidden className="text-base leading-none">·</span>}
                  <span className="text-[0.6rem] font-bold">S{s.numero}</span>
                  <span className="sr-only">{dit}</span>
                </span>
              )
            })}
          </div>
          {resume.phrase && (
            <p className="mt-2 text-sm text-gray-600">
              {resume.phrase}
              {posture && <> · proposé pour le bilan : « {eleve.prenom} {posture} »</>}
            </p>
          )}
        </section>
      )}

      <section className="border-t pt-4">
        <TitreSection>Bilan de la période{periode ? ` ${periode}` : ''}</TitreSection>
        <p className="mb-2 text-xs text-gray-600">
          Assemblé depuis la frise et tes observations, rien d’autre. Décoche ce que tu
          ne veux pas dire, puis rédige.
        </p>

        {briquesBilan.length === 0 ? (
          <p className="text-sm text-gray-500">
            Rien de noté sur la période pour {eleve.prenom} : il n’y a pas encore de quoi
            faire un bilan.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {briquesBilan.map(brique => (
              <li
                key={brique.cle}
                className={`flex items-start gap-2 rounded-xl border p-2 text-sm ${
                  brique.actif ? 'bg-white' : 'bg-gray-50 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={brique.actif}
                  onChange={() => basculerBrique(brique.cle)}
                  aria-label={`Utiliser : ${brique.texte}`}
                  className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-violet-700">
                    {brique.role}
                    <span className="font-normal normal-case tracking-normal text-gray-500">
                      {' '}· {brique.source}
                    </span>
                  </span>
                  <span className="text-gray-900">{brique.texte}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={faireLeBilan}
            disabled={isPending || briquesBilan.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-violet-600 bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Faire le bilan de la période
          </button>
          <button
            type="button"
            onClick={copierBilan}
            disabled={!bilan.texte.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-violet-300 px-2.5 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Copier
          </button>
          {copie && <span className="text-sm font-semibold text-emerald-700">{copie}</span>}
          {!genres[eleve.id] && (
            <span className="text-xs text-amber-700">
              Dis fille ou garçon en haut, sinon le texte répète le prénom.
            </span>
          )}
        </div>

        <label className="mt-3 block">
          <span className="sr-only">Bilan de {eleve.prenom}</span>
          <textarea
            value={bilan.texte}
            onChange={e => enregistrerBilan({ ...bilan, texte: e.target.value }, true)}
            rows={4}
            placeholder="Le texte apparaîtra ici, et reste modifiable."
            aria-label={`Bilan de la période de ${eleve.prenom}`}
            className="w-full rounded-lg border-2 border-violet-200 p-2 text-sm text-gray-900 focus:border-violet-600 focus:outline-none"
          />
        </label>
      </section>

      {/* Les observations viennent APRES le bilan : la liste grossit toute
          l'annee, et rien d'important ne doit descendre avec elle. Le geste du
          jour (ajouter) est en haut du bloc, pas en bas. */}
      <section className="border-t pt-4">
        <TitreSection>Mes observations sur {eleve.prenom}</TitreSection>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold text-gray-800">
            Le{' '}
            <input
              type="date"
              value={dateSaisie}
              onChange={e => setDateSaisie(e.target.value)}
              aria-label="Date de la nouvelle observation"
              className="rounded-lg border px-2 py-1 text-sm font-semibold text-gray-900"
            />
          </label>
          <button
            type="button"
            onClick={ajouter}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-violet-600 bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter une observation
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          Une observation par moment, pas une par semaine : ce que tu vois le lundi et
          ce que tu vois le jeudi ne se mélangent pas.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <label className="text-xs font-semibold text-gray-700">
            Voir{' '}
            <select
              value={vue}
              onChange={e => setVue(e.target.value)}
              aria-label="Quelles observations afficher"
              className="rounded-lg border px-2 py-1 text-sm font-semibold text-gray-900"
            >
              {tranches.map(t => (
                <option key={t.code} value={t.code}>
                  {t.libelle} · {t.notes.length}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="sr-only">Retrouver un mot dans les observations</span>
            <input
              type="search"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Retrouver un mot (lecture, colère, progrès...)"
              aria-label="Retrouver un mot dans les observations"
              className="w-full min-w-[12rem] rounded-lg border px-2 py-1 text-sm text-gray-900"
            />
          </label>
        </div>

        {affichees.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            {cherche
              ? `Aucune observation avec « ${recherche.trim()} » dans ${tranche.libelle.toLowerCase()}.`
              : 'Rien d’écrit pour l’instant.'}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {affichees.map(o => (
              <li key={o.id} className="rounded-xl border p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-violet-700" aria-hidden />
                  <input
                    type="date"
                    value={o.observeeLe}
                    onChange={e => modifier(o.id, { observeeLe: e.target.value })}
                    aria-label={`Date de l’observation du ${enFrancais(o.observeeLe)}`}
                    className="rounded border border-violet-200 px-1.5 py-0.5 text-xs font-semibold text-violet-900"
                  />
                  {/* Une note d'une autre semaine dit d'ou elle vient, sinon on
                      ne sait plus ou on est en naviguant. */}
                  {o.semaineId !== semaineId && numeroDeLaSemaine.has(o.semaineId) && (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-bold text-violet-800">
                      S{numeroDeLaSemaine.get(o.semaineId)}
                      {periodeDeLaSemaine.get(o.semaineId) != null
                        && ` · P${periodeDeLaSemaine.get(o.semaineId)}`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => retirer(o.id)}
                    disabled={isPending}
                    aria-label={`Retirer l’observation du ${enFrancais(o.observeeLe)}`}
                    className="ml-auto rounded border border-gray-200 p-1 text-gray-500 hover:border-rose-300 hover:text-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <textarea
                  value={o.texte}
                  onChange={e => modifier(o.id, { texte: e.target.value })}
                  rows={2}
                  placeholder="Ce que tu as vu, avec tes mots."
                  aria-label={`Observation du ${enFrancais(o.observeeLe)}`}
                  className="mt-1.5 w-full rounded-lg border-2 border-violet-200 p-2 text-sm text-gray-900 focus:border-violet-600 focus:outline-none"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
