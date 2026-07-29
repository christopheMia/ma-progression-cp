import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProgrammeCouvert, { type Competence } from '@/components/programme/ProgrammeCouvert'

/**
 * « Programme couvert » : cocher les compétences officielles travaillées.
 *
 * Virage du 28/07/2026. L'écran partait des notions du manuel qu'il fallait
 * rattacher une par une ; il part maintenant du programme officiel, et Cécile
 * coche ce que la classe a travaillé. C'est ce qui alimente le livret.
 */
export default async function ProgrammePage() {
  const supabase = await createClient()
  // Pas de `getUser` ici : le proxy a deja refuse qui n'est pas connecte, et
  // RLS ne rend que la classe de la personne connectee (voir `session.ts`).
  const { data: classe } = await supabase.from('classes').select('id')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) redirect('/setup')

  const [{ data: comps }, { data: sems }, { data: prises }] = await Promise.all([
    supabase.from('competences_officielles').select('id, matiere, domaine, libelle')
      .eq('niveau', 'CP').order('matiere').order('ordre'),
    supabase.from('semaines').select('periode_numero').eq('class_id', classe.id),
    supabase.from('competences_travaillees').select('periode_numero, competence_id')
      .eq('class_id', classe.id),
  ])

  const periodes = [...new Set(
    (sems ?? []).map(s => s.periode_numero as number | null).filter((p): p is number => p != null),
  )].sort((a, b) => a - b)

  const competences: Competence[] = (comps ?? []).map(c => ({
    id: c.id as string,
    matiere: c.matiere as string,
    domaine: c.domaine as string,
    libelle: c.libelle as string,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/accueil" className="text-sm text-violet-600 hover:underline">← Accueil</Link>
        <h1 className="text-xl font-bold text-gray-800">Programme couvert</h1>
      </div>
      <p className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm leading-relaxed text-violet-950">
        Coche ce que la classe a travaillé pendant la période. Ces compétences arrivent
        telles quelles dans le{' '}
        <Link href="/livret" className="underline">livret</Link>, avec leur domaine, et il
        ne te reste qu’à positionner chaque élève. Ton manuel sert à préparer la classe,
        pas à remplir le livret.
      </p>

      {periodes.length === 0 ? (
        <p className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
          Le calendrier de l’année n’est pas encore posé, donc il n’y a pas de période.{' '}
          <Link href="/setup" className="text-violet-700 underline">Reprendre la configuration</Link>.
        </p>
      ) : (
        <ProgrammeCouvert
          competences={competences}
          periodes={periodes}
          travaillees={(prises ?? []).map(p => ({
            periode: p.periode_numero as number,
            competenceId: p.competence_id as string,
          }))}
        />
      )}
    </div>
  )
}
