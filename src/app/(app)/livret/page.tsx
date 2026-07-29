import { createClient } from '@/lib/supabase/server'
import { classeCourante, utilisateurCourant } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Livret, { type CompetenceBilan } from '@/components/livret/Livret'
import type { Formulation, MotDeLaSemaine } from '@/lib/briques-bilan'

/**
 * Le livret d'une période, élève par élève.
 *
 * Depuis le virage du 28/07/2026, il se remplit depuis le PROGRAMME OFFICIEL :
 * les compétences cochées dans « Programme couvert » arrivent telles quelles,
 * avec leur domaine. Plus rien n'est déduit du manuel, plus rien n'est calculé.
 *
 * Cette page LIT et compose ; l'assemblage des briques et la rédaction sont
 * dans `briques-bilan.ts`, testés à part.
 */
export default async function LivretPage() {
  // Le layout vient de vérifier l'identité et de charger la classe : par
  // `session.ts`, on récupère son résultat au lieu de refaire les deux appels.
  const user = await utilisateurCourant()
  if (!user) redirect('/connexion')

  const classe = await classeCourante(user.id)
  if (!classe) redirect('/setup')

  const supabase = await createClient()

  const [
    { data: eleves },
    { data: semaines },
    { data: competences },
    { data: travaillees },
    { data: positions },
    { data: appreciationsPeriode },
    { data: formulations },
    { data: motsHebdo },
  ] = await Promise.all([
    supabase.from('eleves').select('id, prenom, genre').eq('class_id', classe.id).order('ordre'),
    supabase.from('semaines').select('id, numero, periode_numero').eq('class_id', classe.id).order('numero'),
    supabase.from('competences_officielles').select('id, matiere, domaine, libelle')
      .eq('niveau', 'CP').order('matiere').order('ordre'),
    supabase.from('competences_travaillees').select('periode_numero, competence_id')
      .eq('class_id', classe.id),
    supabase.from('positionnements_periode').select('eleve_id, periode_numero, competence_id, niveau')
      .eq('class_id', classe.id),
    supabase.from('appreciations_periode')
      .select('eleve_id, periode_numero, matiere, texte, briques_ecartees, briques_retouchees')
      .eq('class_id', classe.id),
    supabase.from('formulations_competence')
      .select('competence_id, eclat, reussite, encours, vigilance, suite')
      .eq('class_id', classe.id),
    // `appreciations` ne porte pas `class_id` : on passe par une jointure
    // interne sur `semaines`. Avant, cette requete attendait la liste des
    // semaines rendue par la precedente, donc un deuxieme aller-retour en
    // serie a chaque ouverture du livret.
    supabase.from('appreciations')
      .select('semaine_id, eleve_id, matiere, commentaire, semaines!inner(class_id)')
      .eq('semaines.class_id', classe.id),
  ])

  const semaineParId = new Map((semaines ?? []).map(s => [s.id as string, s]))
  const periodes = [...new Set(
    (semaines ?? []).map(s => s.periode_numero as number | null).filter((p): p is number => p != null),
  )].sort((a, b) => a - b)

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

  // La dernière semaine de chaque période : c'est là qu'on écrit le bilan
  // général, donc c'est la porte que le livret propose.
  const semaineParPeriode: Record<number, string> = {}
  for (const s of semaines ?? []) {
    const p = s.periode_numero as number | null
    if (p != null) semaineParPeriode[p] = s.id as string
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
        competences={(competences ?? []).map(c => ({
          id: c.id as string,
          matiere: c.matiere as string,
          domaine: c.domaine as string,
          libelle: c.libelle as string,
        })) satisfies CompetenceBilan[]}
        travaillees={(travaillees ?? []).map(t => ({
          periode: t.periode_numero as number,
          competenceId: t.competence_id as string,
        }))}
        motsDeLaSemaine={mots}
        formulations={formulationsParCompetence}
        semaineParPeriode={semaineParPeriode}
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
