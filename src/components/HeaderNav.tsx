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
          className="px-3 py-1.5 rounded-lg font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
          Configurer ma classe
        </Link>
      )}
      {visibles.map(l => {
        const active = pathname === l.href
        return (
          <Link key={l.href} href={l.href}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              active
                ? 'text-indigo-600 bg-indigo-50 font-medium'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}>
            {l.label}
          </Link>
        )
      })}
      <LogoutButton />
    </nav>
  )
}
