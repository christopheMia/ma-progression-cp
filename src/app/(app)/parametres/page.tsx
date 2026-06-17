import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MANUELS } from '@/data/manuels'
import PrenomEnseignantEditor from '@/components/parametres/PrenomEnseignantEditor'
import ElevesEditor from '@/components/parametres/ElevesEditor'
import EmploiDuTempsGrille from '@/components/parametres/EmploiDuTempsGrille'
import RentreeEditor from '@/components/parametres/RentreeEditor'
import ManuelEditor from '@/components/parametres/ManuelEditor'
import ResetButton from '@/components/parametres/ResetButton'
import DemoButton from '@/components/DemoButton'

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

  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
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
        <Link href="/planning" className="text-violet-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Paramètres de ma classe</h1>
      </div>

      <Section titre="👤 Mon prénom">
        <PrenomEnseignantEditor initial={classe.prenom_enseignant ?? ''} />
      </Section>

      <Section titre="👧 Mes élèves">
        <ElevesEditor initial={(eleves ?? []).map(e => e.prenom)} />
      </Section>

      <Section titre="🕐 Emploi du temps">
        <EmploiDuTempsGrille initial={(edt ?? []).map(c => ({
          jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
          matiere: c.matiere, couleur: c.couleur ?? null, type: (c.type ?? 'cours') as 'cours' | 'routine',
        }))} />
      </Section>

      <Section titre="📅 Date de rentrée">
        <RentreeEditor initial={classe.rentree_date} />
      </Section>

      <Section titre="📖 Manuel de lecture">
        <ManuelEditor currentNom={manuelNom} prenom={(classe.prenom_enseignant ?? '').trim() || undefined} />
      </Section>

      <section className="bg-white border border-violet-200 rounded-2xl p-5">
        <h2 className="font-bold text-violet-700 mb-2">🎓 Mode démonstration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Remplit une classe d&apos;exemple complète (élèves, emploi du temps, progression, suivi) pour la formation.
        </p>
        <DemoButton confirmer />
      </section>

      <section className="bg-white border-2 border-red-200 rounded-2xl p-5">
        <h2 className="font-bold text-red-700 mb-4">🗑️ Repartir de zéro</h2>
        <ResetButton />
      </section>
    </div>
  )
}
