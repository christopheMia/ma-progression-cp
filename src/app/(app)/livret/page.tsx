import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Livret from '@/components/livret/Livret'
import type { ObservationPeriode, Rattachement } from '@/lib/bilan-periode'
import type { Formulation, MotDeLaSemaine } from '@/lib/briques-bilan'
import { estNiveau, niveauDepuisAcquis } from '@/lib/niveaux'

/**
 * Le livret d'une période, élève par élève.
 *
 * Le socle des commentaires : tout ce qui a été observé pendant la période
 * converge ici, et c'est d'ici que l'enseignante copie, matière par matière,
 * vers le LSU officiel.
 *
 * Cette page LIT et compose ; tous les calculs sont dans des fonctions pures
 * (`bilan-periode.ts`, `briques-bilan.ts`), testées à part.
 */
export default async function LivretPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) redirect('/setup')

  const [
    { data: eleves },
    { data: semaines },
    { data: competences },
    { data: liens },
    { data: positions },
    { data: appreciationsPeriode },
    { data: formulations },
  ] = await Promise.all([
    supabase.from('eleves').select('id, prenom, genre').eq('class_id', classe.id).order('ordre'),
    supabase.from('semaines').select('id, numero, periode_numero').eq('class_id', classe.id).order('numero'),
    supabase.from('competences_officielles').select('id, matiere, domaine, libelle')
      .eq('niveau', 'CP').order('matiere').order('ordre'),
    supabase.from('notion_competence').select('matiere, semaine_numero, notion, competence_id')
      .eq('class_id', classe.id),
    supabase.from('positionnements_periode').select('eleve_id, periode_numero, competence_id, niveau')
      .eq('class_id', classe.id),
    supabase.from('appreciations_periode')
      .select('eleve_id, periode_numero, matiere, texte, briques_ecartees, briques_retouchees')
      .eq('class_id', classe.id),
    supabase.from('formulations_competence')
      .select('competence_id, eclat, reussite, encours, vigilance, suite')
      .eq('class_id', classe.id),
  ])

  const idsSemaines = (semaines ?? []).map(s => s.id as string)
  const [{ data: acquisitions }, { data: criteres }, { data: motsHebdo }] = idsSemaines.length > 0
    ? await Promise.all([
      supabase.from('acquisitions').select('semaine_id, eleve_id, matiere, grapheme, niveau, acquis')
        .in('semaine_id', idsSemaines),
      supabase.from('criteres_observation').select('id, semaine_id, matiere, notion')
        .in('semaine_id', idsSemaines),
      supabase.from('appreciations').select('semaine_id, eleve_id, matiere, commentaire')
        .in('semaine_id', idsSemaines),
    ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const idsCriteres = (criteres ?? []).map(c => c.id as string)
  const { data: acquisitionsCriteres } = idsCriteres.length > 0
    ? await supabase.from('acquisitions_criteres')
      .select('critere_id, eleve_id, niveau, acquis').in('critere_id', idsCriteres)
    : { data: [] }

  // ── Mise en forme pour les fonctions pures ────────────────────────────────

  const semaineParId = new Map((semaines ?? []).map(s => [s.id as string, s]))
  const periodes = [...new Set(
    (semaines ?? []).map(s => s.periode_numero as number | null).filter((p): p is number => p != null),
  )].sort((a, b) => a - b)

  const semainesParPeriode: Record<number, number[]> = {}
  for (const periode of periodes) {
    semainesParPeriode[periode] = (semaines ?? [])
      .filter(s => s.periode_numero === periode)
      .map(s => s.numero as number)
  }

  const rattachements: Rattachement[] = (liens ?? []).map(l => ({
    matiere: l.matiere as string,
    semaine: l.semaine_numero as number,
    notion: l.notion as string,
    competenceId: l.competence_id as string,
  }))

  // Le suivi d'une notion, et celui de ses critères, comptent tous les deux :
  // une enseignante peut ne renseigner que l'un des deux.
  const observations: Record<string, ObservationPeriode[]> = {}
  const ajouter = (eleveId: string, observation: ObservationPeriode) => {
    (observations[eleveId] ??= []).push(observation)
  }

  for (const a of acquisitions ?? []) {
    const semaine = semaineParId.get(a.semaine_id as string)
    if (!semaine) continue
    const niveau = estNiveau(a.niveau) ? a.niveau : niveauDepuisAcquis(a.acquis as boolean)
    if (!niveau) continue
    ajouter(a.eleve_id as string, {
      semaine: semaine.numero as number,
      matiere: a.matiere as string,
      notion: a.grapheme as string,
      niveau,
    })
  }

  const critereParId = new Map((criteres ?? []).map(c => [c.id as string, c]))
  for (const ac of acquisitionsCriteres ?? []) {
    const critere = critereParId.get(ac.critere_id as string)
    if (!critere) continue
    const semaine = semaineParId.get(critere.semaine_id as string)
    if (!semaine) continue
    const niveau = estNiveau(ac.niveau) ? ac.niveau : niveauDepuisAcquis(ac.acquis as boolean)
    if (!niveau) continue
    ajouter(ac.eleve_id as string, {
      semaine: semaine.numero as number,
      matiere: critere.matiere as string,
      notion: critere.notion as string,
      niveau,
    })
  }

  // Les commentaires écrits chaque semaine remontent dans le bilan, rangés par
  // élève et par période, étiquetés de leur semaine.
  const mots: Record<string, Record<number, MotDeLaSemaine[]>> = {}
  for (const m of motsHebdo ?? []) {
    const texte = ((m.commentaire as string | null) ?? '').trim()
    if (!texte) continue
    const semaine = semaineParId.get(m.semaine_id as string)
    const periode = semaine?.periode_numero as number | null
    if (!semaine || periode == null) continue
    const parEleve = (mots[m.eleve_id as string] ??= {})
    ;(parEleve[periode] ??= []).push({
      semaine: semaine.numero as number,
      matiere: m.matiere as string,
      texte,
    })
  }

  const formulationsParCompetence: Record<string, Formulation> = {}
  for (const f of formulations ?? []) {
    formulationsParCompetence[f.competence_id as string] = {
      eclat: (f.eclat as string) ?? '',
      reussite: (f.reussite as string) ?? '',
      encours: (f.encours as string) ?? '',
      vigilance: (f.vigilance as string) ?? '',
      suite: (f.suite as string) ?? '',
    }
  }

  if (periodes.length === 0) {
    return (
      <div className="space-y-4">
        <EnTete />
        <p className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
          Le calendrier de l’année n’est pas encore posé, donc il n’y a pas de période
          à bilanter.{' '}
          <Link href="/setup" className="text-violet-700 underline">Reprendre la configuration</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <EnTete />
      <Livret
        eleves={(eleves ?? []).map(e => ({
          id: e.id as string,
          prenom: e.prenom as string,
          genre: (e.genre as 'f' | 'm' | null) ?? null,
        }))}
        periodes={periodes}
        semainesParPeriode={semainesParPeriode}
        competences={(competences ?? []).map(c => ({
          id: c.id as string,
          matiere: c.matiere as string,
          domaine: c.domaine as string,
          libelle: c.libelle as string,
        }))}
        rattachements={rattachements}
        observations={observations}
        motsDeLaSemaine={mots}
        formulations={formulationsParCompetence}
        positions={(positions ?? []).map(p => ({
          eleveId: p.eleve_id as string,
          periode: p.periode_numero as number,
          competenceId: p.competence_id as string,
          niveau: p.niveau as string,
        }))}
        appreciations={(appreciationsPeriode ?? []).map(a => ({
          eleveId: a.eleve_id as string,
          periode: a.periode_numero as number,
          matiere: a.matiere as string,
          texte: (a.texte as string) ?? '',
          ecartees: (a.briques_ecartees as string[]) ?? [],
          retouchees: (a.briques_retouchees as Record<string, { texte: string; suite: string }>) ?? {},
        }))}
      />
    </div>
  )
}

function EnTete() {
  return (
    <div className="flex items-center gap-3">
      <Link href="/accueil" className="text-sm text-violet-600 hover:underline">← Accueil</Link>
      <h1 className="text-xl font-bold text-gray-800">Livret</h1>
    </div>
  )
}
