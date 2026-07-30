import { createClient } from '@/lib/supabase/server'
import { mesurer } from '@/lib/perf'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PrenomEnseignantEditor from '@/components/parametres/PrenomEnseignantEditor'
import ElevesEditor from '@/components/parametres/ElevesEditor'
import EmploiDuTempsGrille from '@/components/parametres/EmploiDuTempsGrille'
import RentreeEditor from '@/components/parametres/RentreeEditor'
import MethodesEditor from '@/components/parametres/MethodesEditor'
import ResetButton from '@/components/parametres/ResetButton'
import ResetBlockButton from '@/components/parametres/ResetBlockButton'
import ResetContenuButton from '@/components/parametres/ResetContenuButton'
import GenererEdtButton from '@/components/parametres/GenererEdtButton'
import ImporterEdtButton from '@/components/parametres/ImporterEdtButton'
import RealignerSemainesButton from '@/components/parametres/RealignerSemainesButton'
import DemoButton from '@/components/DemoButton'
import CreditIaEditor from '@/components/parametres/CreditIaEditor'
import AncreAuChargement from '@/components/AncreAuChargement'
import { soldeDepuisRpc, type PageParametresData } from '@/lib/rpc-pages'
import type { Methode, MethodeSource } from '@/types'

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
  // Cette page a enchaine jusqu'a SEPT requetes en serie (2,08 s mesurees le
  // 29/07), puis deux vagues. Depuis la migration 025, la fonction SQL
  // `page_parametres` rend tout en UN aller-retour : classe, eleves, emploi du
  // temps, methodes, progression, documents et solde IA.
  const supabase = await createClient()

  const { data, error } = await mesurer('parametres', async () => supabase.rpc('page_parametres'))
  if (error) {
    throw new Error(`Chargement des paramètres impossible : ${error.message}`)
  }
  const page = (data ?? {}) as PageParametresData
  const classe = page.classe
  if (!classe) redirect('/setup')

  const { eleves, edt, methodes, progression } = page
  const solde = soldeDepuisRpc(page.solde)
  const sources = (page.sources ?? []) as unknown as MethodeSource[]

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

  return (
    <div className="space-y-4">
      {/* Cette page a un `loading.tsx` : sans ce rappel, les liens `#eleves`,
          `#edt`, `#methodes` ou `#credit-ia` retombaient tout en haut. */}
      <AncreAuChargement />
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-violet-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Paramètres de ma classe</h1>
      </div>

      <Section id="prenom" titre="👤 Mon prénom">
        <PrenomEnseignantEditor initial={classe.prenom_enseignant ?? ''} />
      </Section>

      <Section id="eleves" titre="👧 Mes élèves" headerRight={<ResetBlockButton scope="eleves" message="Efface tous les élèves et leur suivi." />}>
        <ElevesEditor initial={(eleves ?? []).map(e => e.prenom)} />
      </Section>

      <Section id="edt" titre="🕐 Emploi du temps" headerRight={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <ImporterEdtButton />
          <GenererEdtButton />
          <ResetBlockButton scope="edt" message="Réinitialise l'emploi du temps (trame par défaut)." />
          <ResetBlockButton scope="edt-vide" label="Vider" message="Vide complètement l'emploi du temps (aucune trame rechargée)." />
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

      <Section id="rentree" titre="📅 Date de rentrée" headerRight={<RealignerSemainesButton />}>
        <RentreeEditor initial={classe.rentree_date}
          initialZone={(classe.zone_scolaire === 'B' || classe.zone_scolaire === 'C') ? classe.zone_scolaire : 'A'} />
      </Section>

      <Section id="methodes" titre="📚 Mes méthodes et acquis des élèves" headerRight={<ResetBlockButton scope="methodes" message="Efface les méthodes importées et leur progression." />}>
        <MethodesEditor
          prenom={(classe.prenom_enseignant ?? '').trim() || undefined}
          methodes={(methodes ?? []) as Methode[]}
          sources={sources}
          creneaux={(edt ?? []).map(c => ({ id: c.id, matiere: c.matiere, jour: c.jour, methode_id: c.methode_id ?? null }))}
          resumes={resumes}
        />
      </Section>

      <Section id="credit-ia" titre="💳 Crédit IA">
        <CreditIaEditor
          soldeInitial={solde.soldeReleveUsd}
          releveAt={solde.releveAt}
          consommeDepuis={solde.consommeUsd}
        />
      </Section>

      <section id="demo" className="bg-white border border-violet-200 rounded-2xl p-5 scroll-mt-24">
        <h2 className="font-bold text-violet-700 mb-2">🎓 Mode démonstration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Remplit une classe d&apos;exemple complète (élèves, emploi du temps, progression, suivi) pour la formation.
        </p>
        <DemoButton confirmer />
      </section>

      <section id="remise-a-zero" className="bg-white border-2 border-red-200 rounded-2xl p-5 space-y-5 scroll-mt-24">
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
