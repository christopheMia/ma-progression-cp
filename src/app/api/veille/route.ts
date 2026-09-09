import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Empêche la mise en veille du projet Supabase.
 *
 * Le projet est sur la formule gratuite, qui endort une base après 7 jours sans
 * activité. Une base endormie se réveille à la main depuis le tableau de bord
 * Supabase, auquel Cécile n'a pas accès : sa classe deviendrait inaccessible
 * sans prévenir, typiquement au retour de deux semaines de vacances scolaires.
 * Un appel par jour suffit à repousser l'échéance indéfiniment.
 *
 * La requête ne lit aucune donnée personnelle. Elle compte les lignes de la
 * table du programme officiel, qui ne contient ni élève ni classe, et elle
 * utilise la clé publique : les règles RLS s'appliquent normalement. Le compte
 * peut donc revenir à zéro sans que ce soit une erreur, ce qui est sans
 * importance ici : ce qui compte est que la base ait été interrogée.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  // Vercel ajoute cet en-tête à ses appels planifiés dès que CRON_SECRET existe.
  // Tant que la variable n'est pas posée, la route reste ouverte : elle ne
  // renvoie rien de sensible, et ça évite qu'un oubli de configuration fasse
  // échouer le ping en silence, ce qui viderait la protection de son sens.
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, raison: 'non autorise' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !cle) {
    return NextResponse.json(
      { ok: false, raison: 'configuration Supabase absente' },
      { status: 500 }
    )
  }

  const supabase = createClient(url, cle, { auth: { persistSession: false } })
  const debut = Date.now()

  const { error } = await supabase
    .from('competences_officielles')
    .select('id', { count: 'exact', head: true })

  const ms = Date.now() - debut

  if (error) {
    return NextResponse.json({ ok: false, raison: error.message, ms }, { status: 502 })
  }

  return NextResponse.json({ ok: true, ms, le: new Date().toISOString() })
}
