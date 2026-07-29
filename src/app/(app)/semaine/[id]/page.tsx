import { createClient } from '@/lib/supabase/server'
import { utilisateurCourant } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import MatiereBlock from '@/components/semaine/MatiereBlock'
import SuiviEleves from '@/components/semaine/SuiviEleves'
import CahierJournalEditor from '@/components/semaine/CahierJournalEditor'
import CollapsibleSection from '@/components/semaine/CollapsibleSection'
import EdtApercu from '@/components/semaine/EdtApercu'
import PrintButton from '@/components/PrintButton'
import type { EtatComportement } from '@/lib/comportement'

export default async function SemainePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Identité déjà vérifiée par le layout : `session.ts` évite de la redemander.
  const user = await utilisateurCourant()
  if (!user) redirect('/connexion')

  const supabase = await createClient()

  const { data: semaine } = await supabase.from('semaines').select('*').eq('id', id).single()
  if (!semaine) redirect('/planning')

  // Un seul aller-retour. Avant, un deuxieme groupe de requetes attendait le
  // premier (il lui fallait les identifiants des semaines de la periode) : deux
  // allers-retours en serie a chaque ouverture de la fiche. Comportements et
  // observations portent `class_id`, donc ils se demandent tout de suite, et
  // c'est le composant qui trie ce qui releve de la periode.
  const [
    { data: eleves },
    { data: acquisitions },
    { data: appreciations },
    { data: progression },
    { data: methodesList },
    { data: edt },
    { data: semainesClasse },
    { data: comportements },
    { data: observations },
    { data: bilansPeriode },
  ] = await Promise.all([
    supabase.from('eleves').select('*').eq('class_id', semaine.class_id).order('ordre'),
    supabase.from('acquisitions').select('*').eq('semaine_id', id),
    supabase.from('appreciations').select('*').eq('semaine_id', id),
    supabase.from('progression').select('*').eq('class_id', semaine.class_id).eq('numero', semaine.numero),
    supabase.from('methodes').select('id, matiere, suivi_actif, manuel').eq('class_id', semaine.class_id).order('created_at'),
    supabase.from('emploi_du_temps').select('*').eq('class_id', semaine.class_id).order('ordre'),
    supabase.from('semaines').select('id, numero, periode_numero').eq('class_id', semaine.class_id).order('numero'),
    supabase.from('comportements_semaine').select('eleve_id, semaine_id, etat')
      .eq('class_id', semaine.class_id),
    // Toute l'annee, pas seulement la periode : Christophe veut pouvoir
    // retrouver un fait ecrit deux mois plus tot. Le bilan, lui, ne prend que
    // la periode en cours, et c'est le composant qui fait ce tri.
    supabase.from('observations').select('id, eleve_id, semaine_id, observee_le, texte')
      .eq('class_id', semaine.class_id),
    // Le bilan de periode est range comme une appreciation, avec la matiere
    // reservee `__general` : c'est l'appreciation generale du livret.
    supabase.from('appreciations_periode').select('eleve_id, texte, briques_ecartees')
      .eq('class_id', semaine.class_id).eq('matiere', '__general')
      .eq('periode_numero', semaine.periode_numero ?? 0),
  ])

  // Les semaines de la période en cours : c'est la frise du suivi.
  const semainesPeriode = (semainesClasse ?? [])
    .filter(s => s.periode_numero === semaine.periode_numero)
    .map(s => ({ id: s.id as string, numero: s.numero as number }))
  const dateFormatee = format(new Date(semaine.date_debut), 'd MMMM yyyy', { locale: fr })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-violet-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Semaine {semaine.numero} — {dateFormatee}</h1>
        <div className="ml-auto">
          <PrintButton label="Imprimer la fiche" />
        </div>
      </div>

      <CollapsibleSection title="📚 Contenu de la semaine">
        {(methodesList ?? []).map(m => {
          const prog = progression?.find(p => p.methode_id === m.id)
          const items = (prog?.items as string[]) ?? (m.matiere === 'francais' ? (semaine.graphemes as string[]) : [])
          const pages = (prog?.pages as string | null) ?? (m.matiere === 'francais' ? semaine.manuel_pages : null)
          const motsExemple = (prog?.mots_exemple as string[] | null) ?? (m.matiere === 'francais' ? semaine.mots_exemple : null)
          if (items.length === 0 && !prog) return null
          return (
            <MatiereBlock key={m.id} matiere={m.matiere} items={items} pages={pages}
              motsExemple={motsExemple} manuel={m.manuel as string | null} />
          )
        })}
      </CollapsibleSection>
      <SuiviEleves
        semaineId={id}
        numeroSemaine={semaine.numero as number}
        periode={(semaine.periode_numero as number | null) ?? null}
        dateParDefaut={semaine.date_debut as string}
        eleves={(eleves ?? []).map(e => ({
          id: e.id as string,
          prenom: e.prenom as string,
          genre: (e.genre as 'f' | 'm' | null) ?? null,
        }))}
        semainesPeriode={semainesPeriode}
        semainesClasse={(semainesClasse ?? []).map(s => ({
          id: s.id as string,
          numero: s.numero as number,
          periode: (s.periode_numero as number | null) ?? null,
        }))}
        comportements={Object.fromEntries(
          (comportements ?? []).map(c => [
            `${c.eleve_id}|${c.semaine_id}`, c.etat as EtatComportement,
          ]),
        )}
        observations={(observations ?? []).map(o => ({
          id: o.id as string,
          eleveId: o.eleve_id as string,
          semaineId: o.semaine_id as string,
          observeeLe: o.observee_le as string,
          texte: (o.texte as string) ?? '',
        }))}
        bilans={Object.fromEntries(
          (bilansPeriode ?? []).map(b => [b.eleve_id as string, {
            texte: (b.texte as string) ?? '',
            ecartees: (b.briques_ecartees as string[]) ?? [],
          }]),
        )}
      />
      {/* Verification de l'emploi du temps AVANT de generer le cahier journal
          (retour du 20/07). Replie par defaut pour ne pas alourdir la page. */}
      <CollapsibleSection title="🕐 Mon emploi du temps" defaultOpen={false}>
        <EdtApercu creneaux={(edt ?? []).map(c => ({
          jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
          matiere: c.matiere,
          couleur: c.couleur ?? null, couleur_texte: c.couleur_texte ?? null,
          texte_gras: c.texte_gras ?? false,
          texte_italique: c.texte_italique ?? false,
          texte_souligne: c.texte_souligne ?? false,
        }))} />
      </CollapsibleSection>

      <CahierJournalEditor
        semaineId={semaine.id}
        numeroSemaine={semaine.numero}
      />
    </div>
  )
}
