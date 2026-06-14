'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

const LINKS = [
  { href: '/accueil', label: 'Accueil' },
  { href: '/planning', label: 'Planning' },
  { href: '/parametres', label: 'Paramètres' },
  { href: '/aide', label: 'Aide' },
]

export default function HeaderNav({ hasClass }: { hasClass: boolean }) {
  const pathname = usePathname()
  const visibles = hasClass ? LINKS : LINKS.filter(l => l.href === '/aide')

  return (
    <nav className="flex items-center gap-1 text-sm">
      {!hasClass && (
        <Link href="/setup"
          className="px-3 py-1.5 rounded-lg font-semibold text-rose-600 bg-white hover:bg-white/90 transition-colors">
          Configurer ma classe
        </Link>
      )}
      {visibles.map(l => {
        const active = pathname === l.href
        return (
          <Link key={l.href} href={l.href}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              active
                ? 'bg-white text-rose-600 font-medium'
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
