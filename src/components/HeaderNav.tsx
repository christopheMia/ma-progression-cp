'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  // Le menu complet reste toujours visible (Parametres inclus) : l'utilisateur
  // n'est jamais bloque et peut naviguer librement, meme avant d'avoir configure.
  return (
    <nav className="flex items-center gap-1 text-sm">
      {!hasClass && (
        <Link href="/setup"
          className="px-3 py-1.5 rounded-lg font-semibold text-violet-600 bg-white hover:bg-white/90 transition-colors">
          Configurer ma classe
        </Link>
      )}
      {LINKS.map(l => {
        const active = pathname === l.href
        return (
          <Link key={l.href} href={l.href} title={l.aide}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              active
                ? 'bg-white text-violet-600 font-medium'
                : 'text-white/85 hover:bg-white/15 hover:text-white'
            }`}>
            {l.label}
          </Link>
        )
      })}
      <LogoutButton />
    </nav>
  )
}
