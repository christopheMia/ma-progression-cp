import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import MatiereBlock from '@/components/semaine/MatiereBlock'
import EdmBlock from '@/components/semaine/EdmBlock'
import StudentTracking from '@/components/semaine/StudentTracking'
import CahierJournalEditor from '@/components/semaine/CahierJournalEditor'
import PrintButton from '@/components/PrintButton'

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

  const { data: appreciations } = await supabase.from('appreciations')
    .select('*').eq('semaine_id', id)

  const { data: progression } = await supabase
    .from('progression')
    .select('*')
    .eq('class_id', semaine.class_id)
    .eq('numero', semaine.numero)
  const progFrancais = progression?.find(p => p.matiere === 'francais') ?? null
  const progMaths = progression?.find(p => p.matiere === 'maths') ?? null

  const methodes = [
    { matiere: 'francais' as const, items: progFrancais?.items ?? semaine.graphemes },
    ...(progMaths ? [{ matiere: 'maths' as const, items: progMaths.items }] : []),
  ]

  const dateFormatee = format(new Date(semaine.date_debut), 'd MMMM yyyy', { locale: fr })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-violet-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Semaine {semaine.numero} — {dateFormatee}</h1>
        <div className="ml-auto">
          <PrintButton label="🖨️ Imprimer la fiche" />
        </div>
      </div>
      <MatiereBlock
        matiere="francais"
        items={progFrancais?.items ?? semaine.graphemes}
        pages={progFrancais?.pages ?? semaine.manuel_pages}
        motsExemple={progFrancais?.mots_exemple ?? semaine.mots_exemple}
      />
      {progMaths && (
        <MatiereBlock
          matiere="maths"
          items={progMaths.items}
          pages={progMaths.pages}
          motsExemple={progMaths.mots_exemple}
        />
      )}
      <EdmBlock semaine={semaine} />
      <StudentTracking semaine={semaine} eleves={eleves ?? []} acquisitions={acquisitions ?? []} appreciations={appreciations ?? []} methodes={methodes} />
      <CahierJournalEditor semaineId={semaine.id} numeroSemaine={semaine.numero} />
    </div>
  )
}
