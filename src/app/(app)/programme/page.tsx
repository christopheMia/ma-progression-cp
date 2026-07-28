import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProgrammeCouvert from '@/components/programme/ProgrammeCouvert'
import type { CompChoix } from '@/components/programme/NotionLigne'
import { grouperNotions } from '@/lib/programme-couvert'

/**
 * « Programme couvert » : rattacher chaque notion de la méthode à une
 * compétence officielle. C'est ce qui permet au livret de proposer quoi que ce
 * soit.
 *
 * Refait le 28/07/2026 : la page listait TOUTES les matières, toutes les
 * périodes et toutes les semaines d'un coup. Elle ne se limite plus au français
 * et aux maths, et elle regroupe les notions au lieu de les répéter semaine
 * après semaine. Voir `ProgrammeCouvert` et `lib/programme-couvert.ts`.
 */
export default async function ProgrammePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')
  const { data: classe } = await supabase.from('classes').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) redirect('/setup')

  const [{ data: prog }, { data: sems }, { data: liens }, { data: comps }] = await Promise.all([
    supabase.from('progression').select('matiere, numero, items').eq('class_id', classe.id),
    supabase.from('semaines').select('numero, periode_numero').eq('class_id', classe.id),
    supabase.from('notion_competence').select('matiere, semaine_numero, notion, competence_id')
      .eq('class_id', classe.id),
    supabase.from('competences_officielles').select('id, matiere, domaine, libelle')
      .eq('niveau', 'CP').order('matiere').order('ordre'),
  ])

  const periodeParSemaine: Record<number, number | null> = {}
  for (const s of sems ?? []) {
    periodeParSemaine[s.numero as number] = (s.periode_numero as number | null) ?? null
  }

  const notions = grouperNotions({
    progression: (prog ?? []).map(p => ({
      matiere: p.matiere as string,
      numero: p.numero as number,
      items: (p.items as string[] | null) ?? null,
    })),
    periodeParSemaine,
    liens: (liens ?? []).map(l => ({
      matiere: l.matiere as string,
      semaine_numero: l.semaine_numero as number,
      notion: l.notion as string,
      competence_id: l.competence_id as string,
    })),
  })

  const competencesParMatiere: Record<string, CompChoix[]> = {}
  const nbCompetences: Record<string, number> = {}
  for (const c of comps ?? []) {
    const matiere = c.matiere as string
    ;(competencesParMatiere[matiere] ??= []).push({
      id: c.id as string,
      domaine: c.domaine as string,
      libelle: c.libelle as string,
    })
    nbCompetences[matiere] = (nbCompetences[matiere] ?? 0) + 1
  }

  // Les compétences officielles réellement atteintes par au moins une notion.
  const couvertesParMatiere: Record<string, number> = {}
  for (const [matiere, liste] of Object.entries(
    notions.reduce<Record<string, typeof notions>>((acc, n) => {
      (acc[n.matiere] ??= []).push(n)
      return acc
    }, {}),
  )) {
    couvertesParMatiere[matiere] = new Set(
      liste.map(n => n.competenceId).filter((id): id is string => Boolean(id)),
    ).size
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/accueil" className="text-sm text-violet-600 hover:underline">← Accueil</Link>
        <h1 className="text-xl font-bold text-gray-800">Programme couvert</h1>
      </div>
      {/* Sur un fond teinte, l'encre l'est aussi : un gris neutre sur du violet
          se lit comme un reste de gabarit plutot que comme un choix. */}
      <p className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm leading-relaxed text-violet-950">
        Chaque notion de ta méthode se rattache à une <strong>compétence officielle</strong>.
        Une notion qui revient plusieurs semaines n’apparaît qu’<strong>une fois</strong> :
        la rattacher vaut pour toutes ses semaines. C’est ce travail, fait une fois, qui
        permet au <Link href="/livret" className="text-violet-700 underline">livret</Link> de
        proposer les positionnements.
      </p>

      <ProgrammeCouvert
        notions={notions}
        competencesParMatiere={competencesParMatiere}
        nbCompetences={nbCompetences}
        couvertesParMatiere={couvertesParMatiere}
      />
    </div>
  )
}
