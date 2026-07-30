'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Wrench, ChevronUp, ChevronDown, ArrowRight,
  ClipboardList, BookOpen, Target, Puzzle,
  type LucideIcon,
} from 'lucide-react'

// Cle d'icone serialisable : la page (composant serveur) ne peut pas passer un
// composant React a ce composant client, on passe donc un NOM d'icone et on le
// resout ici via cette table.
const ICONES: Record<string, LucideIcon> = {
  ClipboardList, BookOpen, Target, Puzzle,
}

export type OutilIa = { href: string; icon: keyof typeof ICONES; titre: string; sous: string }

const CLE_STOCKAGE = 'accueil.outilsIa.ouvert'

/**
 * Section "Mes outils IA" : en-tete CLIQUABLE qui deplie/replie la liste
 * (demande du 20/07 : la carte devait etre cliquable et depliable).
 * L'etat est memorise localement pour que l'enseignante retrouve son accueil
 * comme elle l'a laisse.
 */
export default function OutilsIaSection({ outils, children }: {
  outils: OutilIa[]
  children?: React.ReactNode
}) {
  const [ouvert, setOuvert] = useState(true)

  useEffect(() => {
    const memo = window.localStorage.getItem(CLE_STOCKAGE)
    if (memo !== null) setOuvert(memo === '1')
  }, [])

  function basculer() {
    setOuvert(o => {
      window.localStorage.setItem(CLE_STOCKAGE, o ? '0' : '1')
      return !o
    })
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
      <button type="button" onClick={basculer} aria-expanded={ouvert}
        className="flex items-center gap-2 w-full text-left rounded-lg -m-1 p-1 hover:bg-violet-100/60 transition-colors">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600 text-white">
          <Wrench size={16} aria-hidden="true" />
        </span>
        <h2 className="font-semibold text-slate-800">Mes outils IA</h2>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          {ouvert ? 'Replier' : `${outils.length} outils`}
          {ouvert
            ? <ChevronUp size={16} className="text-violet-600" aria-hidden="true" />
            : <ChevronDown size={16} className="text-violet-600" aria-hidden="true" />}
        </span>
      </button>

      {ouvert && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            {outils.map(o => {
              const Icone = ICONES[o.icon]
              return (
                <Link key={o.href} href={o.href}
                  className="carte-i group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-100 text-violet-700 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5">
                    <Icone size={22} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{o.titre}</div>
                    <div className="text-sm text-slate-500">{o.sous}</div>
                  </div>
                  <ArrowRight size={18} className="ml-auto text-violet-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
          {children && <div className="mt-5 pt-4 border-t border-violet-100">{children}</div>}
        </>
      )}
    </section>
  )
}
