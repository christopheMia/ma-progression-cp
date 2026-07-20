import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProposerRattachementsButton from '@/components/programme/ProposerRattachementsButton'

const MATIERES: { code: string; label: string }[] = [
  { code: 'francais', label: 'le français' },
  { code: 'maths', label: 'les maths' },
]
const TITRE: Record<string, string> = { francais: '📖 Français', maths: '🔢 Maths' }

export default async function ProgrammePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')
  const { data: classe } = await supabase.from('classes').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) redirect('/setup')

  const codes = MATIERES.map(m => m.code)
  const { data: prog } = await supabase.from('progression')
    .select('matiere, numero, items').eq('class_id', classe.id).in('matiere', codes)
  const { data: sems } = await supabase.from('semaines')
    .select('numero, periode_numero').eq('class_id', classe.id)
  const { data: liens } = await supabase.from('notion_competence')
    .select('matiere, semaine_numero, notion, competence_id, source').eq('class_id', classe.id)
  const { data: comps } = await supabase.from('competences_officielles')
    .select('id, matiere, domaine, libelle').eq('niveau', 'CP').in('matiere', codes)

  const periodeParSemaine = new Map((sems ?? []).map(s => [s.numero, s.periode_numero as number | null]))
  const compById = new Map((comps ?? []).map(c => [c.id as string, { domaine: c.domaine as string, libelle: c.libelle as string }]))
  const nbCompParMatiere = new Map<string, number>()
  for (const c of comps ?? []) nbCompParMatiere.set(c.matiere as string, (nbCompParMatiere.get(c.matiere as string) ?? 0) + 1)
  const lienParNotion = new Map<string, string>() // matiere|semaine|notion -> competence_id
  for (const l of liens ?? []) lienParNotion.set(`${l.matiere}|${l.semaine_numero}|${l.notion}`, l.competence_id as string)

  type Ligne = { periode: number | null; semaine: number; notion: string; competenceId?: string }
  const parMatiere = new Map<string, Ligne[]>()
  for (const p of prog ?? []) {
    const per = periodeParSemaine.get(p.numero as number) ?? null
    for (const item of ((p.items as string[] | null) ?? [])) {
      const notion = (item ?? '').trim()
      if (!notion) continue
      const arr = parMatiere.get(p.matiere as string) ?? []
      arr.push({ periode: per, semaine: p.numero as number, notion, competenceId: lienParNotion.get(`${p.matiere}|${p.numero}|${notion}`) })
      parMatiere.set(p.matiere as string, arr)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/accueil" className="text-violet-600 hover:underline text-sm">← Accueil</Link>
        <h1 className="text-xl font-bold text-gray-800">Programme couvert</h1>
      </div>
      <p className="text-sm text-gray-600 bg-violet-50 border border-violet-100 rounded-lg p-3 leading-relaxed">
        Chaque notion de ta méthode est rattachée à une <strong>compétence officielle</strong>, placée dans sa
        <strong> période</strong>. L&apos;IA propose les rattachements, tu peux les corriger. Les compétences non
        encore couvertes apparaissent comme des <strong>trous du programme</strong>. C&apos;est la base du livret.
      </p>

      {MATIERES.map(({ code, label }) => {
        const lignes = (parMatiere.get(code) ?? []).sort((a, b) => (a.periode ?? 99) - (b.periode ?? 99) || a.semaine - b.semaine)
        const couvertes = new Set(lignes.map(l => l.competenceId).filter(Boolean) as string[])
        const total = nbCompParMatiere.get(code) ?? 0
        // Trous : compétences de la matière non couvertes.
        const trous = (comps ?? []).filter(c => c.matiere === code && !couvertes.has(c.id as string))
        // Regroupe les notions par période.
        const parPeriode = new Map<number | null, Ligne[]>()
        for (const l of lignes) { const a = parPeriode.get(l.periode) ?? []; a.push(l); parPeriode.set(l.periode, a) }

        return (
          <section key={code} className="bg-white border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-bold text-gray-700">{TITRE[code]}
                <span className="ml-2 text-xs font-normal text-gray-400">{couvertes.size}/{total} compétences couvertes</span>
              </h2>
              <ProposerRattachementsButton matiere={code} label={label} />
            </div>

            {lignes.length === 0 && <p className="text-sm text-gray-400">Aucune notion dans la progression pour cette matière.</p>}

            {[...parPeriode.entries()].sort((a, b) => (a[0] ?? 99) - (b[0] ?? 99)).map(([per, ls]) => (
              <div key={String(per)}>
                <h3 className="font-semibold text-violet-700 text-sm mb-1">{per ? `Période ${per}` : 'Hors période'}</h3>
                <ul className="space-y-1">
                  {ls.map((l, i) => {
                    const comp = l.competenceId ? compById.get(l.competenceId) : undefined
                    return (
                      <li key={i} className="text-sm flex flex-wrap items-baseline gap-x-2">
                        <span className="text-gray-800">{l.notion}</span>
                        {comp ? (
                          <span className="text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5">
                            {comp.domaine} : {comp.libelle}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600">à rattacher</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}

            {trous.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-amber-700">🕳️ {trous.length} compétence(s) officielle(s) pas encore couverte(s)</summary>
                <ul className="mt-2 space-y-1">
                  {trous.map(c => (
                    <li key={c.id as string} className="text-xs text-gray-500 flex gap-2">
                      <span className="text-amber-400 shrink-0">•</span>
                      <span>{c.domaine as string} : {c.libelle as string}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )
      })}
    </div>
  )
}
