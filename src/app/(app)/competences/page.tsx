import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const LABEL_MATIERE: Record<string, string> = {
  francais: '📖 Français',
  maths: '🔢 Maths',
  'questionner-le-monde': '🌍 Questionner le monde',
  emc: '⚖️ Enseignement moral et civique',
  eps: '🤸 Éducation physique et sportive',
  'enseignements-artistiques': '🎨 Enseignements artistiques',
  'langue-vivante': '🗣️ Langue vivante',
}

export default async function CompetencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: comps } = await supabase
    .from('competences_officielles')
    .select('matiere, domaine, libelle, ordre, version_programme')
    .eq('niveau', 'CP')
    .order('ordre')

  // Regroupe matiere -> domaine -> [libelle]
  const groupes: Record<string, Record<string, string[]>> = {}
  for (const c of comps ?? []) {
    const m = c.matiere as string
    const d = c.domaine as string
    ;(groupes[m] ??= {})
    ;(groupes[m][d] ??= [])
    groupes[m][d].push(c.libelle as string)
  }
  const version = (comps?.[0]?.version_programme as string) ?? '2025'
  const vide = Object.keys(groupes).length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/accueil" className="text-violet-600 hover:underline text-sm">← Accueil</Link>
        <h1 className="text-xl font-bold text-gray-800">Compétences officielles (CP)</h1>
      </div>

      <p className="text-sm text-gray-600 bg-violet-50 border border-violet-100 rounded-lg p-3 leading-relaxed">
        Voici le programme officiel de CP : les <strong>attendus de fin d&apos;année</strong> (éduscol, version {version}).
        Ta progression, construite à partir de <strong>ta méthode</strong>, vise ces compétences. Le livret (LSU)
        et le lien de chaque notion avec sa compétence officielle arrivent ensuite.
      </p>

      {vide ? (
        <p className="text-sm text-gray-400">Le référentiel officiel n&apos;est pas encore chargé.</p>
      ) : (
        Object.entries(groupes).map(([matiere, domaines]) => (
          <section key={matiere} className="bg-white border rounded-2xl p-5">
            <h2 className="font-bold text-gray-700 mb-3">{LABEL_MATIERE[matiere] ?? matiere}</h2>
            <div className="space-y-4">
              {Object.entries(domaines).map(([domaine, libelles]) => (
                <div key={domaine}>
                  <h3 className="font-semibold text-violet-700 text-sm mb-1">{domaine}</h3>
                  <ul className="space-y-1">
                    {libelles.map((l, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2">
                        <span className="text-violet-400 shrink-0">•</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
