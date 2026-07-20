'use server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, MODELE_CHAT } from '@/lib/ia/anthropic'
import { revalidatePath } from 'next/cache'

async function getClasseId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')
  const { data: classe } = await supabase
    .from('classes').select('id').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) throw new Error('Classe introuvable')
  return { supabase, classId: classe.id as string }
}

type Notion = { semaine: number; notion: string }

/**
 * Propose, via l'IA, un rattachement de chaque notion de la progression d'une
 * matière à une compétence officielle détaillée. RGPD : n'envoie QUE les notions
 * (contenu de méthode) et la liste des compétences, jamais de donnée élève.
 *
 * `periodeNumero` optionnel : limite le rattachement aux notions des semaines de
 * cette période (rattachement période par période, plus léger).
 *
 * Les rattachements existants (source 'manuel' ou 'ia') ne sont pas écrasés
 * (upsert ignoreDuplicates sur la contrainte d'unicité).
 */
export async function proposerRattachements(
  matiere: string,
  periodeNumero?: number,
): Promise<{ notions: number; rattaches: number }> {
  const { supabase, classId } = await getClasseId()

  const { data: prog } = await supabase
    .from('progression').select('numero, items').eq('class_id', classId).eq('matiere', matiere)
  const { data: sems } = await supabase
    .from('semaines').select('numero, periode_numero').eq('class_id', classId)
  const periodeParSemaine = new Map((sems ?? []).map((s: { numero: number; periode_numero: number | null }) => [s.numero, s.periode_numero]))

  const notions: Notion[] = []
  for (const p of prog ?? []) {
    if (periodeNumero != null && periodeParSemaine.get(p.numero) !== periodeNumero) continue
    for (const item of ((p.items as string[] | null) ?? [])) {
      const t = (item ?? '').trim()
      if (t) notions.push({ semaine: p.numero, notion: t })
    }
  }
  if (notions.length === 0) return { notions: 0, rattaches: 0 }

  const { data: comps } = await supabase
    .from('competences_officielles').select('id, domaine, libelle')
    .eq('matiere', matiere).eq('niveau', 'CP').order('ordre')
  if (!comps?.length) return { notions: notions.length, rattaches: 0 }

  const uniques = [...new Set(notions.map(n => n.notion))].slice(0, 150)
  const listeComp = comps.map((c: { domaine: string; libelle: string }, i: number) => `${i + 1}. [${c.domaine}] ${c.libelle}`).join('\n')
  const listeNotions = uniques.map((n, i) => `${i + 1}. ${n}`).join('\n')

  const prompt =
    `Tu es conseiller pédagogique en cycle 2. Voici les compétences officielles de ` +
    `${matiere} (CP), numérotées :\n${listeComp}\n\n` +
    `Voici des notions issues d'une méthode de classe, numérotées :\n${listeNotions}\n\n` +
    `Pour CHAQUE notion, donne le numéro de la compétence officielle la plus proche. ` +
    `Si aucune ne convient vraiment, mets null. Réponds UNIQUEMENT par un tableau JSON ` +
    `compact, sans texte autour : [{"n":1,"c":12},{"n":2,"c":null},...]`

  const client = getAnthropicClient()
  const resp = await client.messages.create({
    model: MODELE_CHAT,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })
  const txt = resp.content.map(b => (b.type === 'text' ? b.text : '')).join('')
  const debut = txt.indexOf('['), fin = txt.lastIndexOf(']')
  if (debut < 0 || fin < 0) throw new Error('Réponse IA illisible')
  let paires: { n: number; c: number | null }[]
  try { paires = JSON.parse(txt.slice(debut, fin + 1)) } catch { throw new Error('Réponse IA illisible') }

  const notionVersComp = new Map<string, string>()
  for (const p of paires) {
    if (p.c == null) continue
    const notion = uniques[p.n - 1]
    const comp = comps[p.c - 1]
    if (notion && comp) notionVersComp.set(notion, comp.id)
  }

  const rows = notions
    .map(n => {
      const cid = notionVersComp.get(n.notion)
      return cid ? { class_id: classId, matiere, semaine_numero: n.semaine, notion: n.notion, competence_id: cid, source: 'ia' } : null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length) {
    const { error } = await supabase.from('notion_competence')
      .upsert(rows, { onConflict: 'class_id,matiere,semaine_numero,notion,competence_id', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/programme')
  return { notions: notions.length, rattaches: rows.length }
}

/** Change (ou pose) manuellement la compétence rattachée à une notion. */
export async function rattacherNotionManuel(
  matiere: string, semaineNumero: number, notion: string, competenceId: string,
) {
  const { supabase, classId } = await getClasseId()
  // Une seule compétence principale par notion : on remplace l'existant.
  await supabase.from('notion_competence').delete()
    .eq('class_id', classId).eq('matiere', matiere).eq('semaine_numero', semaineNumero).eq('notion', notion)
  const { error } = await supabase.from('notion_competence').insert({
    class_id: classId, matiere, semaine_numero: semaineNumero, notion, competence_id: competenceId, source: 'manuel',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/programme')
}
