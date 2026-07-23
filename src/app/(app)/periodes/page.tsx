import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PrintButton from '@/components/PrintButton'
import { agregerParPeriode } from '@/lib/vue-periode'

// Libelles connus. Les autres matieres (saisies a la main, EPS, arts...) sont
// affichees avec leur nom capitalise, complete si besoin par le nom du manuel.
const LABELS: Record<string, { icon: string; nom: string }> = {
  francais: { icon: '📖', nom: 'Français' },
  maths: { icon: '🔢', nom: 'Maths' },
}

function libelleMatiere(code: string, manuel: string | null): string {
  const base = LABELS[code]?.nom ?? (code.charAt(0).toUpperCase() + code.slice(1))
  const icone = LABELS[code]?.icon ?? '📘'
  return manuel ? `${icone} ${base} · ${manuel}` : `${icone} ${base}`
}

export default async function PeriodesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')
  const { data: classe } = await supabase.from('classes').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) redirect('/setup')

  const [{ data: prog }, { data: sems }, { data: periodes }, { data: methodes }] = await Promise.all([
    supabase.from('progression').select('matiere, numero, items').eq('class_id', classe.id),
    supabase.from('semaines').select('numero, periode_numero').eq('class_id', classe.id),
    supabase.from('periodes').select('numero, nom, date_debut, date_fin, ordre')
      .eq('class_id', classe.id).order('ordre'),
    supabase.from('methodes').select('matiere, manuel').eq('class_id', classe.id),
  ])

  const periodeParSemaine = new Map<number, number | null>(
    (sems ?? []).map(s => [s.numero as number, (s.periode_numero as number | null) ?? null]),
  )
  const nomPeriode = new Map<number, string>(
    (periodes ?? []).map(p => [p.numero as number, p.nom as string]),
  )
  const manuelParMatiere = new Map<string, string | null>(
    (methodes ?? []).map(m => [m.matiere as string, (m.manuel as string | null) ?? null]),
  )

  const blocs = agregerParPeriode(
    (prog ?? []).map(p => ({
      matiere: p.matiere as string,
      numero: p.numero as number,
      items: (p.items as string[] | null) ?? [],
    })),
    periodeParSemaine,
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-violet-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Vue par période</h1>
        <div className="ml-auto">
          <PrintButton label="Imprimer" />
        </div>
      </div>
      <p className="text-sm text-gray-600 bg-violet-50 border border-violet-100 rounded-lg p-3 leading-relaxed">
        Pour chaque période, tout ce qui se travaille, <strong>toutes matières confondues</strong> :
        le français semaine par semaine, les maths sur toute la période, et les autres matières que
        tu as renseignées. C&apos;est la vue d&apos;ensemble d&apos;une période complète.
      </p>

      {blocs.length === 0 && (
        <p className="text-sm text-gray-400">
          Aucune progression pour l&apos;instant. Importe tes méthodes, le contenu apparaîtra ici, rangé par période.
        </p>
      )}

      {blocs.map(bloc => (
        <section key={String(bloc.periode)} className="bg-white border rounded-2xl p-5 space-y-3 print-section">
          <h2 className="font-bold text-violet-800">
            {bloc.periode ? (nomPeriode.get(bloc.periode) ?? `Période ${bloc.periode}`) : 'Hors période'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {bloc.matieres.map(m => (
              <div key={m.matiere} className="border border-gray-100 rounded-xl p-3">
                <h3 className="font-semibold text-gray-700 text-sm mb-1">
                  {libelleMatiere(m.matiere, manuelParMatiere.get(m.matiere) ?? null)}
                </h3>
                <ul className="space-y-0.5">
                  {m.notions.map((n, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-violet-300 shrink-0">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
