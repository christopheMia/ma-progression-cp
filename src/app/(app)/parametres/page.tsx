import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MANUELS } from '@/data/manuels'
import PrenomEnseignantEditor from '@/components/parametres/PrenomEnseignantEditor'
import ElevesEditor from '@/components/parametres/ElevesEditor'
import EmploiDuTempsGrille from '@/components/parametres/EmploiDuTempsGrille'
import RentreeEditor from '@/components/parametres/RentreeEditor'
import ManuelEditor from '@/components/parametres/ManuelEditor'
import MethodesEditor from '@/components/parametres/MethodesEditor'
import ResetButton from '@/components/parametres/ResetButton'
import ResetBlockButton from '@/components/parametres/ResetBlockButton'
import ResetContenuButton from '@/components/parametres/ResetContenuButton'
import GenererEdtButton from '@/components/parametres/GenererEdtButton'
import RealignerSemainesButton from '@/components/parametres/RealignerSemainesButton'
import DemoButton from '@/components/DemoButton'
import type { Methode } from '@/types'

function Section({ titre, children, id, headerRight }: { titre: string; children: React.ReactNode; id?: string; headerRight?: React.ReactNode }) {
  return (
    <section id={id} className="bg-white border rounded-2xl p-5 scroll-mt-24">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-gray-700">{titre}</h2>
        {headerRight}
      </div>
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
  const { data: methodes } = await supabase
    .from('methodes').select('*').eq('class_id', classe.id).order('created_at')
  const { data: progression } = await supabase
    .from('progression').select('methode_id, items').eq('class_id', classe.id)

  // Recap par methode : ce que l'IA a produit a l'import (nb de semaines + nb de notions).
  const resumes: Record<string, { semaines: number; notions: number }> = {}
  for (const p of progression ?? []) {
    if (!p.methode_id) continue
    const items = (p.items as string[] | null) ?? []
    const r = resumes[p.methode_id] ?? { semaines: 0, notions: 0 }
    if (items.length > 0) r.semaines += 1
    r.notions += items.length
    resumes[p.methode_id] = r
  }

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

      <Section titre="👧 Mes élèves" headerRight={<ResetBlockButton scope="eleves" message="Efface tous les élèves et leur suivi." />}>
        <ElevesEditor initial={(eleves ?? []).map(e => e.prenom)} />
      </Section>

      <Section id="edt" titre="🕐 Emploi du temps" headerRight={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <GenererEdtButton />
          <ResetBlockButton scope="edt" message="Réinitialise l'emploi du temps (trame par défaut)." />
          <ResetBlockButton scope="edt-vide" label="🗑️ Vider" message="Vide complètement l'emploi du temps (aucune trame rechargée)." />
        </div>
      }>
        <EmploiDuTempsGrille initial={(edt ?? []).map(c => ({
          jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
          matiere: c.matiere, couleur: c.couleur ?? null, couleur_texte: c.couleur_texte ?? null,
          texte_gras: c.texte_gras ?? false, texte_italique: c.texte_italique ?? false, texte_souligne: c.texte_souligne ?? false,
          type: (c.type ?? 'cours') as 'cours' | 'routine',
          visible_journal: (c.visible_journal ?? true) as boolean,
        }))} />
      </Section>

      <Section titre="📅 Date de rentrée" headerRight={<RealignerSemainesButton />}>
        <RentreeEditor initial={classe.rentree_date} />
      </Section>

      <Section id="methodes" titre="📚 Mes méthodes et acquis des élèves" headerRight={<ResetBlockButton scope="methodes" message="Efface les méthodes importées et leur progression." />}>
        <MethodesEditor
          prenom={(classe.prenom_enseignant ?? '').trim() || undefined}
          methodes={(methodes ?? []) as Methode[]}
          creneaux={(edt ?? []).map(c => ({ id: c.id, matiere: c.matiere, jour: c.jour, methode_id: c.methode_id ?? null }))}
          resumes={resumes}
        />
      </Section>

      <Section titre="♻️ Tout régénérer (changer de manuel)">
        <ManuelEditor currentNom={manuelNom} prenom={(classe.prenom_enseignant ?? '').trim() || undefined} />
      </Section>

      <section className="bg-white border border-violet-200 rounded-2xl p-5">
        <h2 className="font-bold text-violet-700 mb-2">🎓 Mode démonstration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Remplit une classe d&apos;exemple complète (élèves, emploi du temps, progression, suivi) pour la formation.
        </p>
        <DemoButton confirmer />
      </section>

      <section className="bg-white border-2 border-red-200 rounded-2xl p-5 space-y-5">
        <div>
          <h2 className="font-bold text-red-700 mb-1">🧽 Nouvelle année, même classe</h2>
          <p className="text-sm text-gray-500 mb-3">
            Vide tout le contenu et garde ta classe telle quelle. L&apos;emploi du temps repart vide.
          </p>
          <ResetContenuButton />
        </div>
        <div className="border-t border-red-100 pt-5">
          <h2 className="font-bold text-red-700 mb-1">🗑️ Repartir de zéro</h2>
          <p className="text-sm text-gray-500 mb-3">
            Supprime aussi la classe et relance la configuration complète.
          </p>
          <ResetButton />
        </div>
      </section>
    </div>
  )
}
