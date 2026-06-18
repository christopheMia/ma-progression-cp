'use server'
import { createClient } from '@/lib/supabase/server'

function moisCourant(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Ajoute l'usage d'un appel IA (best-effort ; n'interrompt jamais la réponse). */
export async function enregistrerUsageIA(inputTokens: number, outputTokens: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: classe } = await supabase.from('classes').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!classe) return
    await supabase.from('ia_usage').insert({
      class_id: classe.id, mois: moisCourant(),
      input_tokens: inputTokens || 0, output_tokens: outputTokens || 0,
    })
  } catch { /* best-effort */ }
}

/** Somme des tokens du mois courant pour la classe de l'utilisateur. */
export async function usageMoisCourant(): Promise<{ input: number; output: number }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { input: 0, output: 0 }
    const { data: classe } = await supabase.from('classes').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!classe) return { input: 0, output: 0 }
    const { data } = await supabase.from('ia_usage').select('input_tokens, output_tokens')
      .eq('class_id', classe.id).eq('mois', moisCourant())
    return {
      input: (data ?? []).reduce((s, r) => s + (r.input_tokens ?? 0), 0),
      output: (data ?? []).reduce((s, r) => s + (r.output_tokens ?? 0), 0),
    }
  } catch { return { input: 0, output: 0 } }
}
