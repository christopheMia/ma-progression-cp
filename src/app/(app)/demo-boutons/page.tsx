'use client'
/**
 * Page de DEMO (temporaire) : comparer des styles de survol pour les cartes et
 * boutons de l'accueil. A supprimer une fois le style choisi. Rien d'autre dans
 * l'app ne pointe vers cette route.
 */
import { useRef } from 'react'
import {
  CalendarDays, Clock, Plus, Compass, ArrowRight, Sparkles, BookOpen, Trash2,
} from 'lucide-react'
import Bouton from '@/components/ui/Bouton'

// ---- easings (register produit : pas de bounce/elastic) -------------------
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)' // ease-out-quint

function Section({ titre, desc, children }: { titre: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{titre}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
      </div>
      {children}
    </section>
  )
}

// =====================  CARTES  =============================================

// A — Elevation douce : la carte se souleve, l'ombre grandit, la tuile d'icone
// se remplit de violet. Sobre, tres "produit".
function CarteA() {
  return (
    <div className="group relative flex flex-col rounded-2xl bg-white border border-slate-200 p-5 cursor-pointer
      transition-[transform,box-shadow,border-color] duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]
      hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10 hover:border-violet-300">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 text-violet-700
        transition-colors duration-200 group-hover:bg-violet-600 group-hover:text-white">
        <CalendarDays size={24} aria-hidden="true" />
      </div>
      <div className="font-semibold text-slate-900 mt-3">Planning annuel</div>
      <div className="text-sm text-slate-500">Voir les 36 semaines</div>
    </div>
  )
}

// B — Accent qui glisse : barre violette qui grandit en haut, icone qui monte,
// fleche qui apparait. Guide l'oeil vers l'action.
function CarteB() {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 cursor-pointer
      transition-[box-shadow,border-color] duration-200 hover:shadow-md hover:border-violet-200">
      <span className="absolute inset-x-0 top-0 h-1 bg-violet-500 origin-left scale-x-0
        transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 text-violet-700
        transition-transform duration-200 group-hover:-translate-y-0.5">
        <Clock size={24} aria-hidden="true" />
      </div>
      <div className="font-semibold text-slate-900 mt-3 flex items-center gap-1">
        Emploi du temps
        <ArrowRight size={16} className="text-violet-500 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
      </div>
      <div className="text-sm text-slate-500">Tes journées, créneau par créneau</div>
    </div>
  )
}

// C — Projecteur : une lueur violette suit le curseur dans la carte.
// L'effet "moderne" par excellence, reste discret.
function CarteC() {
  const ref = useRef<HTMLDivElement>(null)
  function move(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <div ref={ref} onMouseMove={move}
      className="spotlight group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 cursor-pointer
        transition-[box-shadow,border-color] duration-200 hover:border-violet-300 hover:shadow-md">
      <span aria-hidden="true"
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: 'radial-gradient(220px circle at var(--mx) var(--my), rgba(124,58,237,0.14), transparent 70%)' }} />
      <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 text-violet-700">
        <Plus size={24} aria-hidden="true" />
      </div>
      <div className="relative font-semibold text-slate-900 mt-3">Ajoute tes matières</div>
      <div className="relative text-sm text-slate-500">Maths, Anglais, Questionner le monde…</div>
    </div>
  )
}

// D — Remplissage : le violet monte du bas, le contenu passe en blanc.
// Le plus affirme, tres lisible, pour les cartes qu'on veut mettre en avant.
function CarteD() {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 cursor-pointer
      transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/20">
      <span aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-violet-600 to-violet-500 origin-bottom scale-y-0
          transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100" />
      <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 text-violet-700
        transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white">
        <Compass size={24} aria-hidden="true" />
      </div>
      <div className="relative font-semibold text-slate-900 mt-3 transition-colors duration-300 group-hover:text-white">Configuration initiale</div>
      <div className="relative text-sm text-slate-500 transition-colors duration-300 group-hover:text-white/80">Méthode, rentrée, élèves, emploi du temps</div>
    </div>
  )
}

// =====================  BOUTONS  ===========================================

function BoutonsRangee() {
  return (
    <div className="space-y-6">
      {/* Les 5 variantes de la hierarchie */}
      <div className="flex flex-wrap items-center gap-4">
        <Bouton variant="principal" icon={Sparkles}>Configurer ma classe</Bouton>
        <Bouton variant="secondaire" icon={BookOpen}>Ouvrir la fiche</Bouton>
        <Bouton variant="contour" iconRight={ArrowRight}>Voir le planning</Bouton>
        <Bouton variant="fantome">Annuler</Bouton>
        <Bouton variant="danger" icon={Trash2}>Réinitialiser</Bouton>
      </div>

      {/* Tailles */}
      <div className="flex flex-wrap items-center gap-4">
        <Bouton variant="secondaire" size="sm">Petit</Bouton>
        <Bouton variant="secondaire" size="md">Moyen</Bouton>
        <Bouton variant="secondaire" size="lg">Grand</Bouton>
      </div>

      {/* Etats */}
      <div className="flex flex-wrap items-center gap-4">
        <Bouton variant="principal" loading>Enregistrement…</Bouton>
        <Bouton variant="secondaire" disabled>Désactivé</Bouton>
        <Bouton variant="secondaire" href="/accueil" icon={ArrowRight}>En tant que lien</Bouton>
      </div>
    </div>
  )
}

export default function DemoBoutonsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 py-4">
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .group *, .group { transition: none !important; }
          .spotlight span { display: none; }
        }
      `}</style>

      <header>
        <h1 className="text-2xl font-bold text-slate-900">Styles de survol — démo</h1>
        <p className="text-slate-500 mt-1">
          Passe la souris sur chaque carte et chaque bouton. Dis-moi la lettre / le
          numéro que tu préfères (ou un mélange), je l&apos;applique à l&apos;accueil.
        </p>
      </header>

      <Section titre="Cartes — 4 styles" desc="Le survol de la souris déclenche l'effet. A = sobre, D = le plus affirmé.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><div className="text-xs font-semibold uppercase tracking-wide text-violet-600">A · Élévation douce</div><CarteA /></div>
          <div className="space-y-2"><div className="text-xs font-semibold uppercase tracking-wide text-violet-600">B · Accent qui glisse</div><CarteB /></div>
          <div className="space-y-2"><div className="text-xs font-semibold uppercase tracking-wide text-violet-600">C · Projecteur (suit le curseur)</div><CarteC /></div>
          <div className="space-y-2"><div className="text-xs font-semibold uppercase tracking-wide text-violet-600">D · Remplissage</div><CarteD /></div>
        </div>
      </Section>

      <Section titre="Boutons — la hiérarchie (composant <Bouton>)" desc="1 composant, 5 variantes, 3 tailles, états chargement/désactivé/lien. Survol + clic.">
        <BoutonsRangee />
      </Section>
    </div>
  )
}
