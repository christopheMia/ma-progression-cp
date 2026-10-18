import type { ReponseRegle } from '@/lib/ia/schema-regle'

/** Appelle `/api/ia-regle` depuis le navigateur. Ne lève jamais : rend un message. */
export async function demanderRegle(
  phrase: string,
  type?: string,
): Promise<{ ok: true; reponse: ReponseRegle } | { ok: false; message: string }> {
  try {
    const res = await fetch('/api/ia-regle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase, type }),
    })
    const json = await res.json().catch(() => ({})) as { reponse?: ReponseRegle; error?: unknown }
    if (!res.ok || !json.reponse) {
      return {
        ok: false,
        message: typeof json.error === 'string' ? json.error : 'Je n’arrive pas à comprendre pour l’instant. Réessaie dans un moment.',
      }
    }
    return { ok: true, reponse: json.reponse }
  } catch {
    return { ok: false, message: 'Je n’arrive pas à joindre l’aide pour l’instant. Réessaie dans un moment.' }
  }
}
