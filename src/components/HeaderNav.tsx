'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X, Sparkles } from 'lucide-react'
import LogoutButton from './LogoutButton'

// Les bulles (title) expliquent chaque entree au survol : elles remplacent les
// cartes "Parametres" et "Aide" retirees de l'accueil (retour du 20/07, elles
// faisaient doublon avec ce menu).
const LINKS = [
  { href: '/accueil', label: 'Accueil', aide: 'Ta page de démarrage : semaine en cours, raccourcis et outils IA' },
  { href: '/planning', label: 'Planning', aide: 'Toutes les semaines de l’année, période par période' },
  { href: '/parametres', label: 'Paramètres', aide: 'Tes élèves, ton emploi du temps, tes méthodes et la date de rentrée' },
  { href: '/aide', label: 'Aide', aide: 'Le mode d’emploi de l’application' },
]

export default function HeaderNav({ hasClass }: { hasClass: boolean }) {
  const pathname = usePathname()
  // Sur telephone, les 4 entrees + la deconnexion ne tiennent pas sur la largeur
  // de l'ecran : certaines devenaient inatteignables (signale le 20/07). On
  // bascule donc sur un menu deroulant sous le seuil `sm`.
  const [ouvert, setOuvert] = useState(false)

  // Toute navigation referme le menu, sinon il reste ouvert par-dessus la page
  // qu'on vient d'ouvrir.
  useEffect(() => { setOuvert(false) }, [pathname])

  useEffect(() => {
    if (!ouvert) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOuvert(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ouvert])

  const classeLien = (actif: boolean) =>
    `px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 ${
      actif ? 'bg-white/20 text-white font-semibold' : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`

  return (
    <>
      {/* ── Ecran large : tout est visible ─────────────────────────────────── */}
      <nav className="hidden sm:flex items-center gap-1 text-sm">
        {!hasClass && (
          <Link href="/setup"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-violet-700 bg-white shadow-sm transition-transform duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40">
            <Sparkles size={16} aria-hidden="true" />
            Configurer ma classe
          </Link>
        )}
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} title={l.aide} className={classeLien(pathname === l.href)}>
            {l.label}
          </Link>
        ))}
        <LogoutButton />
      </nav>

      {/* ── Mobile : bouton menu + panneau deroulant ───────────────────────── */}
      <div className="sm:hidden">
        <button type="button" onClick={() => setOuvert(o => !o)}
          aria-expanded={ouvert} aria-controls="menu-mobile" aria-label="Menu"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30">
          {ouvert ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span className="text-sm">Menu</span>
        </button>

        {ouvert && (
          <>
            {/* Voile : un clic n'importe ou referme le menu. */}
            <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setOuvert(false)}
              className="fixed inset-0 top-14 z-30 bg-slate-900/20" />

            <nav id="menu-mobile"
              className="absolute right-2 top-full mt-1 z-40 w-60 rounded-xl bg-white shadow-xl border border-slate-200 p-2 flex flex-col gap-0.5 text-sm">
              {!hasClass && (
                <Link href="/setup"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                  <Sparkles size={16} aria-hidden="true" />
                  Configurer ma classe
                </Link>
              )}
              {LINKS.map(l => {
                const actif = pathname === l.href
                return (
                  <Link key={l.href} href={l.href}
                    className={`rounded-lg px-3 py-2 transition-colors ${
                      actif ? 'bg-violet-100 text-violet-800 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                    }`}>
                    <span className="block">{l.label}</span>
                    <span className="block text-xs text-slate-500">{l.aide}</span>
                  </Link>
                )
              })}
              <div className="border-t border-slate-100 mt-1 pt-1 text-slate-700 [&_button]:w-full [&_button]:text-left [&_button]:ml-0 [&_button]:text-slate-700 [&_button]:hover:bg-slate-100">
                <LogoutButton />
              </div>
            </nav>
          </>
        )}
      </div>
    </>
  )
}
