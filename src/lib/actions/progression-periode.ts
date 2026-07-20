'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProgressionSemaine } from '@/data/manuels'
import { ensureMethode } from '@/lib/methodes-db'

export type PeriodeDispo = {
  numero: number
  nom: string
  /** Numero de la 1re semaine de l'annee appartenant a cette periode. */
  premiereSemaine: number
  /** Nombre de semaines de classe dans la periode. */
  nbSemaines: number
}

async function classeCourante() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')
  const { data: classe } = await supabase
    .from('classes').select('id').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) throw new Error('Aucune classe')
  return { supabase, classeId: classe.id as string }
}

/**
 * Periodes reellement disponibles pour l'import, calculees depuis le calendrier
 * de la classe (`semaines.periode_numero`) et NON depuis un "7 semaines" force :
 * les periodes reelles font 5 a 8 semaines selon les zones et l'annee.
 * Renvoie [] si la classe n'a pas encore de rattachement aux periodes.
 */
export async function getPeriodesDisponibles(): Promise<PeriodeDispo[]> {
  try {
    const { supabase, classeId } = await classeCourante()
    const [{ data: semaines }, { data: periodes }] = await Promise.all([
      supabase.from('semaines').select('numero, periode_numero')
        .eq('class_id', classeId).order('numero'),
      supabase.from('periodes').select('numero, nom').eq('class_id', classeId).order('numero'),
    ])

    const parPeriode = new Map<number, number[]>()
    for (const s of semaines ?? []) {
      const p = s.periode_numero as number | null
      if (p === null || p === undefined) continue
      const liste = parPeriode.get(p)
      if (liste) liste.push(s.numero as number)
      else parPeriode.set(p, [s.numero as number])
    }

    return [...parPeriode.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([numero, numeros]) => ({
        numero,
        nom: (periodes ?? []).find(p => p.numero === numero)?.nom ?? `Période ${numero}`,
        premiereSemaine: Math.min(...numeros),
        nbSemaines: numeros.length,
      }))
  } catch {
    return []
  }
}

/**
 * Enregistre la progression d'UNE periode pour UNE matiere.
 *
 * Difference cruciale avec `enregistrerProgressionMatiere`, qui efface TOUTE la
 * matiere : ici on ne remplace que les semaines de la periode importee. Importer
 * la periode 2 ne doit evidemment pas effacer la periode 1 deja saisie.
 *
 * L'IA renvoie des semaines numerotees 1..N (elle ne connait pas le calendrier
 * de la classe) : on les recale sur les vrais numeros de semaine de la periode.
 */
export async function enregistrerProgressionPeriode(
  matiere: string,
  periodeNumero: number,
  semaines: ProgressionSemaine[],
  /** Nom du manuel importe, affiche ensuite partout dans l'appli. */
  nomManuel?: string,
): Promise<{ premiereSemaine: number; derniereSemaine: number; debordement: number }> {
  const trimmed = matiere.trim()
  if (!trimmed) throw new Error('Matière inconnue')
  matiere = trimmed

  const { supabase, classeId } = await classeCourante()

  const { data: semainesClasse } = await supabase
    .from('semaines').select('numero, periode_numero')
    .eq('class_id', classeId).order('numero')

  const numerosPeriode = (semainesClasse ?? [])
    .filter(s => s.periode_numero === periodeNumero)
    .map(s => s.numero as number)
    .sort((a, b) => a - b)

  if (!numerosPeriode.length) {
    throw new Error(
      `Aucune semaine rattachée à la période ${periodeNumero}. Cale d'abord tes semaines sur le calendrier dans les paramètres.`
    )
  }

  const premiereSemaine = numerosPeriode[0]
  // Recalage : la i-eme semaine importee devient la i-eme semaine de la periode.
  // Si le document contient PLUS de semaines que la periode, le surplus continue
  // apres la periode plutot que d'etre silencieusement perdu.
  const recalees = semaines.map((s, i) => ({ ...s, numero: premiereSemaine + i }))
  const debordement = Math.max(0, semaines.length - numerosPeriode.length)
  const derniereSemaine = premiereSemaine + Math.max(0, recalees.length - 1)

  const methodeId = await ensureMethode(supabase, classeId, matiere, nomManuel)

  // On n'efface QUE l'intervalle reecrit : les autres periodes sont preservees.
  const numerosEcrases = recalees.map(s => s.numero)
  await supabase.from('progression').delete()
    .eq('class_id', classeId).eq('matiere', matiere).in('numero', numerosEcrases)

  const lignes = recalees.map(s => ({
    class_id: classeId,
    methode_id: methodeId,
    matiere,
    numero: s.numero,
    items: s.items,
    pages: s.pages || null,
    mots_exemple: s.mots_exemple ?? null,
  }))
  if (lignes.length > 0) {
    const { error } = await supabase.from('progression').insert(lignes)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/planning')
  revalidatePath('/accueil')
  return { premiereSemaine, derniereSemaine, debordement }
}
