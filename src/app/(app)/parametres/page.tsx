import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MANUELS } from '@/data/manuels'
import ElevesEditor from '@/components/parametres/ElevesEditor'
import EmploiDuTempsEditor from '@/components/parametres/EmploiDuTempsEditor'
import RentreeEditor from '@/components/parametres/RentreeEditor'
import ManuelEditor from '@/components/parametres/ManuelEditor'
import ResetButton from '@/components/parametres/ResetButton'

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-2xl p-5">
      <h2 className="font-bold text-gray-700 mb-4">{titre}</h2>
      {children}
    </section>
  )
}

export default async function ParametresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).single()
  if (!classe) redirect('/setup')

  const { data: eleves } = await supabase.from('eleves')
    .select('*').eq('class_id', classe.id).order('ordre')
  const { data: edt } = await supabase.from('emploi_du_temps')
    .select('*').eq('class_id', classe.id).order('ordre')

  const manuelNom = MANUELS.find(m => m.id === classe.manuel_id)?.nom
    ?? (classe.manuel_id === 'custom' ? 'Manuel importé' : classe.manuel_id)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-blue-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Paramètres de ma classe</h1>
      </div>

      <Section titre="👧 Mes élèves">
        <ElevesEditor initial={(eleves ?? []).map(e => e.prenom)} />
      </Section>

      <Section titre="🕐 Emploi du temps">
        <EmploiDuTempsEditor initial={(edt ?? []).map(c => ({
          jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin, matiere: c.matiere,
        }))} />
      </Section>

      <Section titre="📅 Date de rentrée">
        <RentreeEditor initial={classe.rentree_date} />
      </Section>

      <Section titre="📖 Manuel de lecture">
        <ManuelEditor currentNom={manuelNom} />
      </Section>

      <section className="bg-white border-2 border-red-200 rounded-2xl p-5">
        <h2 className="font-bold text-red-700 mb-4">🗑️ Repartir de zéro</h2>
        <ResetButton />
      </section>
    </div>
  )
}
