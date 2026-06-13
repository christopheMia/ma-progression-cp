import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import LectureBlock from '@/components/semaine/LectureBlock'
import EdmBlock from '@/components/semaine/EdmBlock'
import StudentTracking from '@/components/semaine/StudentTracking'
import CahierJournalEditor from '@/components/semaine/CahierJournalEditor'

export default async function SemainePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: semaine } = await supabase.from('semaines').select('*').eq('id', id).single()
  if (!semaine) redirect('/planning')

  const { data: eleves } = await supabase.from('eleves')
    .select('*').eq('class_id', semaine.class_id).order('ordre')

  const { data: acquisitions } = await supabase.from('acquisitions')
    .select('*').eq('semaine_id', id)

  const dateFormatee = format(new Date(semaine.date_debut), 'd MMMM yyyy', { locale: fr })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-blue-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Semaine {semaine.numero} — {dateFormatee}</h1>
      </div>
      <LectureBlock semaine={semaine} />
      <EdmBlock semaine={semaine} />
      <StudentTracking semaine={semaine} eleves={eleves ?? []} acquisitions={acquisitions ?? []} />
      <CahierJournalEditor semaineId={semaine.id} numeroSemaine={semaine.numero} />
    </div>
  )
}
