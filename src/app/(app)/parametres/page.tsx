import { createClient } from '@/lib/supabase/server'
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
import SectionRepliable from '@/components/parametres/SectionRepliable'
import SommaireParametres from '@/components/parametres/SommaireParametres'
import MonRangementEditor from '@/components/parametres/MonRangementEditor'
import { casesDisponibles, lireReglesCompletes } from '@/lib/regles-rangement'
import { soldeDepuisRpc, type PageParametresData } from '@/lib/rpc-pages'
import type { Methode, MethodeSource } from '@/types'

// L'ordre de la page, repris tel quel par le sommaire cliquable.
const SECTIONS = [
  { id: 'prenom', titre: 'Mon prénom' },
  { id: 'eleves', titre: 'Mes élèves' },
  { id: 'edt', titre: 'Emploi du temps' },
  { id: 'rangement', titre: 'Mon rangement' },
  { id: 'rentree', titre: 'Date de rentrée' },
  { id: 'methodes', titre: 'Méthodes et acquis' },
  { id: 'credit-ia', titre: 'Crédit IA' },
  { id: 'demo', titre: 'Mode démonstration' },
  { id: 'remise-a-zero', titre: 'Remise à zéro' },
]

export default async function ParametresPage() {
  // Cette page a enchaine jusqu'a SEPT requetes en serie (2,08 s mesurees le
  // 29/07), puis deux vagues. Depuis la migration 025, la fonction SQL
  // `page_parametres` rend tout en UN aller-retour : classe, eleves, emploi du
  // temps, methodes, progression, documents et solde IA.
  const supabase = await createClient()

  // Le carnet de rangement (migration 031) est lu EN MEME TEMPS que le reste :
  // pas de second aller-retour. La policy ne rend que les regles des classes
  // de l'enseignante ; on garde ensuite celles de cette classe. Illisible
  // (migration pas encore passee), la section le dit et rien d'autre ne casse.
  const [{ data, error }, { data: reglesLues, error: reglesErreur }] = await Promise.all([
    supabase.rpc('page_parametres'),
    supabase.from('regles_rangement').select('id, class_id, type, type_cle, creneau, jour, origine'),
  ])
  if (error) {
    throw new Error(`Chargement des paramètres impossible : ${error.message}`)
  }
  const page = (data ?? {}) as PageParametresData
  const classe = page.classe
  if (!classe) redirect('/setup')

  const { eleves, edt, methodes, progression } = page
  const solde = soldeDepuisRpc(page.solde)
  const sources = (page.sources ?? []) as unknown as MethodeSource[]

  const regles = reglesErreur ? [] : lireReglesCompletes(reglesLues).filter(r => r.class_id === classe.id)
  const casesRangement = casesDisponibles((edt ?? []).map(c => ({
    jour: c.jour, matiere: c.matiere,
    type: (c.type ?? 'cours') as 'cours' | 'routine',
    visible_journal: (c.visible_journal ?? true) as boolean,
  })))

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

      <SommaireParametres sections={SECTIONS} />

      <SectionRepliable id="prenom" titre="👤 Mon prénom">
        <PrenomEnseignantEditor initial={classe.prenom_enseignant ?? ''} />
      </SectionRepliable>

      <SectionRepliable id="eleves" titre="👧 Mes élèves" headerRight={<ResetBlockButton scope="eleves" message="Efface tous les élèves et leur suivi." />}>
        <ElevesEditor initial={(eleves ?? []).map(e => ({ id: e.id, prenom: e.prenom }))} />
      </SectionRepliable>

      <SectionRepliable id="edt" titre="🕐 Emploi du temps" headerRight={
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
      </SectionRepliable>

      <SectionRepliable id="rangement" titre="🗂️ Mon rangement">
        <MonRangementEditor initial={regles} cases={casesRangement} indisponible={Boolean(reglesErreur)} />
      </SectionRepliable>

      <SectionRepliable id="rentree" titre="📅 Date de rentrée" headerRight={<RealignerSemainesButton />}>
        <RentreeEditor initial={classe.rentree_date}
          initialZone={(classe.zone_scolaire === 'B' || classe.zone_scolaire === 'C') ? classe.zone_scolaire : 'A'} />
      </SectionRepliable>

      <SectionRepliable id="methodes" titre="📚 Mes méthodes et acquis des élèves" headerRight={<ResetBlockButton scope="methodes" message="Efface les méthodes importées et leur progression." />}>
        <MethodesEditor
          prenom={(classe.prenom_enseignant ?? '').trim() || undefined}
          methodes={(methodes ?? []) as Methode[]}
          sources={sources}
          creneaux={(edt ?? []).map(c => ({ id: c.id, matiere: c.matiere, jour: c.jour, methode_id: c.methode_id ?? null }))}
          resumes={resumes}
        />
      </SectionRepliable>

      <SectionRepliable id="credit-ia" titre="💳 Crédit IA">
        <CreditIaEditor
          soldeInitial={solde.soldeReleveUsd}
          releveAt={solde.releveAt}
          consommeDepuis={solde.consommeUsd}
        />
      </SectionRepliable>

      <SectionRepliable id="demo" titre="🎓 Mode démonstration" ton="demo">
        <p className="text-sm text-gray-500 mb-4">
          Remplit une classe d&apos;exemple complète (élèves, emploi du temps, progression, suivi) pour la formation.
        </p>
        <DemoButton confirmer />
      </SectionRepliable>

      <SectionRepliable id="remise-a-zero" titre="⚠️ Remise à zéro" ton="danger">
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-red-700 mb-1">🧽 Nouvelle année, même classe</h3>
            <p className="text-sm text-gray-500 mb-3">
              Vide tout le contenu et garde ta classe telle quelle. L&apos;emploi du temps repart vide.
            </p>
            <ResetContenuButton />
          </div>
          <div className="border-t border-red-100 pt-5">
            <h3 className="font-bold text-red-700 mb-1">🗑️ Repartir de zéro</h3>
            <p className="text-sm text-gray-500 mb-3">
              Supprime aussi la classe et relance la configuration complète.
            </p>
            <ResetButton />
          </div>
        </div>
      </SectionRepliable>
    </div>
  )
}
