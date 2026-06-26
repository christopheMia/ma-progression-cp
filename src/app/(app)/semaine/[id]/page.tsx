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

  const [{ data: eleves }, { data: acquisitions }, { data: appreciations }, { data: progression }, { data: methodesList }] = await Promise.all([
    supabase.from('eleves').select('*').eq('class_id', semaine.class_id).order('ordre'),
    supabase.from('acquisitions').select('*').eq('semaine_id', id),
    supabase.from('appreciations').select('*').eq('semaine_id', id),
    supabase.from('progression').select('*').eq('class_id', semaine.class_id).eq('numero', semaine.numero),
    supabase.from('methodes').select('id, matiere, suivi_actif').eq('class_id', semaine.class_id).order('created_at'),
  ])

  // Construit la liste des méthodes pour StudentTracking (uniquement suivi_actif)
  const methodesPourSuivi = (methodesList ?? []).map(m => {
    const prog = progression?.find(p => p.methode_id === m.id)
    return {
      methode_id: m.id,
      matiere: m.matiere,
      suivi_actif: m.suivi_actif as boolean,
      items: (prog?.items as string[]) ?? (m.matiere === 'francais' ? (semaine.graphemes as string[]) : []),
    }
  })

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

      {(methodesList ?? []).map(m => {
        const prog = progression?.find(p => p.methode_id === m.id)
        const items = (prog?.items as string[]) ?? (m.matiere === 'francais' ? (semaine.graphemes as string[]) : [])
        const pages = (prog?.pages as string | null) ?? (m.matiere === 'francais' ? semaine.manuel_pages : null)
        const motsExemple = (prog?.mots_exemple as string[] | null) ?? (m.matiere === 'francais' ? semaine.mots_exemple : null)
        if (items.length === 0 && !prog) return null
        return (
          <MatiereBlock key={m.id} matiere={m.matiere} items={items} pages={pages} motsExemple={motsExemple} />
        )
      })}

      <EdmBlock semaine={semaine} />
      <StudentTracking
        semaine={semaine}
        eleves={eleves ?? []}
        acquisitions={acquisitions ?? []}
        appreciations={appreciations ?? []}
        methodes={methodesPourSuivi}
      />
      <CahierJournalEditor
        semaineId={semaine.id}
        numeroSemaine={semaine.numero}
        francais={(progression?.find(p => p.matiere === 'francais')?.items as string[]) ?? []}
        maths={(progression?.find(p => p.matiere === 'maths')?.items as string[]) ?? []}
      />
    </div>
  )
}
