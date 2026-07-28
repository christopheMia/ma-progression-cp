'use server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, MODELE_CHAT } from '@/lib/ia/anthropic'
import { notionsSemblables, tete } from '@/lib/notions-semblables'
import { resultat, type Resultat } from '@/lib/resultat'
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

/**
 * Change (ou pose) manuellement la compétence rattachée à une notion.
 *
 * RENVOIE son message d'erreur au lieu de le lever : en production, Next.js
 * efface le texte d'une erreur levée dans une action serveur. Voir
 * `src/lib/resultat.ts`.
 */
export async function rattacherNotionManuel(
  matiere: string, semaineNumero: number, notion: string, competenceId: string,
): Promise<Resultat<void>> {
  return resultat(async () => {
    const { supabase, classId } = await getClasseId()
    // Une seule compétence principale par notion : on remplace l'existant.
    await supabase.from('notion_competence').delete()
      .eq('class_id', classId).eq('matiere', matiere).eq('semaine_numero', semaineNumero).eq('notion', notion)
    const { error } = await supabase.from('notion_competence').insert({
      class_id: classId, matiere, semaine_numero: semaineNumero, notion, competence_id: competenceId, source: 'manuel',
    })
    if (error) throw new Error('Le rattachement n’a pas pu être enregistré.')
    revalidatePath('/programme')
  }, 'Le rattachement n’a pas pu être enregistré.')
}

/**
 * Rattache une notion sur TOUTES les semaines où elle revient.
 *
 * L'écran affiche désormais une ligne par notion et non plus une par semaine :
 * « Lire a » revient dix-sept fois dans l'année, et c'est la même compétence
 * les dix-sept fois. Un choix vaut donc pour toutes ses occurrences.
 *
 * Rend le nombre de semaines traitées, pour que l'écran puisse le dire.
 */
export async function rattacherNotionPartout(
  matiere: string, notion: string, competenceId: string,
): Promise<Resultat<number>> {
  return resultat(async () => {
    const { supabase, classId } = await getClasseId()

    const { data: prog } = await supabase
      .from('progression').select('numero, items').eq('class_id', classId).eq('matiere', matiere)

    const semaines = (prog ?? [])
      .filter(p => ((p.items as string[] | null) ?? []).some(i => (i ?? '').trim() === notion))
      .map(p => p.numero as number)
    if (semaines.length === 0) throw new Error('Cette notion n’est plus dans la progression.')

    // On remplace : une notion ne porte qu'une compétence principale, et deux
    // semaines ne doivent jamais dire deux choses différentes.
    await supabase.from('notion_competence').delete()
      .eq('class_id', classId).eq('matiere', matiere).eq('notion', notion)

    const { error } = await supabase.from('notion_competence').insert(
      semaines.map(semaine => ({
        class_id: classId,
        matiere,
        semaine_numero: semaine,
        notion,
        competence_id: competenceId,
        source: 'manuel',
      })),
    )
    if (error) throw new Error('Le rattachement n’a pas pu être enregistré.')

    revalidatePath('/programme')
    return semaines.length
  }, 'Le rattachement n’a pas pu être enregistré.')
}

/**
 * Les notions de la matière qui ressemblent à celle-ci et ne sont pas encore
 * rattachées. Sert à annoncer honnêtement ce que fera « appliquer aux notions
 * semblables » AVANT de le faire.
 *
 * La liste est recalculée ici, à partir de la progression : le navigateur ne
 * choisit pas les notions à modifier, il demande seulement à voir.
 */
export async function compterNotionsSemblables(
  matiere: string, notion: string,
): Promise<Resultat<{ notions: string[]; tete: string }>> {
  return resultat(async () => {
    const { supabase, classId } = await getClasseId()
    const candidates = await notionsNonRattachees(supabase, classId, matiere)
    const semblables = notionsSemblables(notion, candidates)
    // Une même notion revient sur plusieurs semaines : on l'annonce une fois.
    const notions = [...new Set(semblables.map(n => n.notion))]
    return { notions, tete: tete(notion) }
  }, 'Les notions semblables n’ont pas pu être cherchées.')
}

/**
 * Rattache d'un coup toutes les notions semblables PAS ENCORE rattachées.
 *
 * Ne touche jamais à un rattachement existant : la répétition est une corvée,
 * l'écrasement silencieux serait une perte. Rend le nombre de notions traitées
 * pour que l'écran puisse le dire.
 */
export async function rattacherNotionsSemblables(
  matiere: string, notion: string, competenceId: string,
): Promise<Resultat<number>> {
  return resultat(async () => {
    const { supabase, classId } = await getClasseId()
    const candidates = await notionsNonRattachees(supabase, classId, matiere)
    const semblables = notionsSemblables(notion, candidates)
    if (semblables.length === 0) return 0

    const { error } = await supabase.from('notion_competence').insert(
      semblables.map(n => ({
        class_id: classId,
        matiere,
        semaine_numero: n.semaine,
        notion: n.notion,
        competence_id: competenceId,
        source: 'manuel',
      })),
    )
    if (error) throw new Error('Les rattachements n’ont pas pu être enregistrés.')

    revalidatePath('/programme')
    return semblables.length
  }, 'Les rattachements n’ont pas pu être enregistrés.')
}

export type LienSupprime = {
  matiere: string
  semaine_numero: number
  notion: string
  competence_id: string
  source: string
}

/** Une matière et les notions à détacher dedans. */
export type CibleDetachement = { matiere: string; notions: string[] }

/**
 * Retire des rattachements, à n'importe quelle échelle : une notion, une
 * période, une matière, ou tout.
 *
 * RENVOIE les liens supprimés, pour que l'écran puisse proposer d'annuler. Se
 * tromper de compétence sur une matière entière doit rester rattrapable en un
 * clic, sinon personne n'ose toucher au bouton.
 */
export async function detacherNotions(
  cibles: CibleDetachement[],
): Promise<Resultat<LienSupprime[]>> {
  return resultat(async () => {
    const { supabase, classId } = await getClasseId()
    const supprimes: LienSupprime[] = []

    for (const cible of cibles) {
      if (cible.notions.length === 0) continue

      const { data } = await supabase.from('notion_competence')
        .select('matiere, semaine_numero, notion, competence_id, source')
        .eq('class_id', classId).eq('matiere', cible.matiere).in('notion', cible.notions)

      for (const lien of data ?? []) {
        supprimes.push({
          matiere: lien.matiere as string,
          semaine_numero: lien.semaine_numero as number,
          notion: lien.notion as string,
          competence_id: lien.competence_id as string,
          source: (lien.source as string) ?? 'manuel',
        })
      }

      const { error } = await supabase.from('notion_competence').delete()
        .eq('class_id', classId).eq('matiere', cible.matiere).in('notion', cible.notions)
      if (error) throw new Error('Le détachement n’a pas pu être enregistré.')
    }

    revalidatePath('/programme')
    return supprimes
  }, 'Le détachement n’a pas pu être enregistré.')
}

/** Remet des rattachements que l'on vient de retirer. C'est le « revenir en arrière ». */
export async function restaurerRattachements(
  liens: LienSupprime[],
): Promise<Resultat<number>> {
  return resultat(async () => {
    if (liens.length === 0) return 0
    const { supabase, classId } = await getClasseId()

    const { error } = await supabase.from('notion_competence').upsert(
      liens.map(l => ({ ...l, class_id: classId })),
      { onConflict: 'class_id,matiere,semaine_numero,notion,competence_id', ignoreDuplicates: true },
    )
    if (error) throw new Error('Les rattachements n’ont pas pu être remis.')

    revalidatePath('/programme')
    return liens.length
  }, 'Les rattachements n’ont pas pu être remis.')
}

/** Les notions de la progression d'une matière qui n'ont encore aucun lien. */
async function notionsNonRattachees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  matiere: string,
): Promise<Notion[]> {
  const { data: prog } = await supabase
    .from('progression').select('numero, items').eq('class_id', classId).eq('matiere', matiere)
  const { data: liens } = await supabase
    .from('notion_competence').select('semaine_numero, notion')
    .eq('class_id', classId).eq('matiere', matiere)

  const dejaLiees = new Set(
    (liens ?? []).map(l => `${l.semaine_numero}|${l.notion}`),
  )

  const notions: Notion[] = []
  for (const p of prog ?? []) {
    for (const item of ((p.items as string[] | null) ?? [])) {
      const t = (item ?? '').trim()
      if (!t) continue
      if (dejaLiees.has(`${p.numero}|${t}`)) continue
      notions.push({ semaine: p.numero as number, notion: t })
    }
  }
  return notions
}
