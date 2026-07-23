'use client'
import Link from 'next/link'
import { Loader2, type LucideIcon } from 'lucide-react'
import { forwardRef } from 'react'

/**
 * Bouton unique de l'app : une seule source de verite pour la forme, les etats
 * et le mouvement. Change ici = change partout. Cree le 2026-07-23 pour remplacer
 * la vingtaine de boutons stylees a la main (chacune un peu differente).
 *
 * Hierarchie validee avec Christophe :
 *  - principal  : action reine d'un ecran (degrade violet + reflet qui balaie).
 *                 A n'utiliser qu'une fois par ecran.
 *  - secondaire : actions courantes (violet plein sobre).
 *  - contour    : action tertiaire (Annuler, alternative).
 *  - fantome    : action discrete (liens d'action, retours).
 *  - danger     : action destructive (Reinitialiser, Supprimer).
 *
 * Passer `href` rend un <Link> Next (meme allure), sinon un <button>.
 */
export type VarianteBouton = 'principal' | 'secondaire' | 'contour' | 'neutre' | 'fantome' | 'danger'
export type TailleBouton = 'sm' | 'md' | 'lg'

const BASE =
  'group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden font-semibold rounded-xl select-none ' +
  'transition-[transform,box-shadow,background-color,color,border-color] duration-200 ' +
  '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/60 ' +
  'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]'

const VARIANTES: Record<VarianteBouton, string> = {
  principal:
    'text-white bg-gradient-to-r from-violet-600 to-purple-600 shadow-sm ' +
    'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/30 active:translate-y-0',
  secondaire: 'text-white bg-violet-600 hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/25',
  contour: 'text-violet-700 border border-violet-300 bg-white hover:bg-violet-50 hover:border-violet-400',
  neutre: 'text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400',
  fantome: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'text-white bg-red-600 hover:bg-red-700 hover:shadow-md hover:shadow-red-500/25',
}

const TAILLES: Record<TailleBouton, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'px-5 py-2.5',
  lg: 'px-6 py-3 text-base',
}

type PropsCommunes = {
  variant?: VarianteBouton
  size?: TailleBouton
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  className?: string
  children?: React.ReactNode
}

// Contenu interne partage entre le rendu <button> et le rendu <Link>.
function Contenu({ variant, icon: Icon, iconRight: IconRight, loading, children }: {
  variant: VarianteBouton
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  children?: React.ReactNode
}) {
  return (
    <>
      {/* Reflet qui balaie : reserve au bouton principal. */}
      {variant === 'principal' && (
        <span aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full rounded-xl overflow-hidden
            bg-gradient-to-r from-transparent via-white/25 to-transparent
            transition-transform duration-500 group-hover/btn:translate-x-full" />
      )}
      {loading
        ? <Loader2 size={18} className="relative animate-spin" aria-hidden="true" />
        : Icon && <Icon size={18} className="relative" aria-hidden="true" />}
      {children != null && <span className="relative inline-flex items-center gap-2">{children}</span>}
      {!loading && IconRight && <IconRight size={18} className="relative" aria-hidden="true" />}
    </>
  )
}

type PropsBouton = PropsCommunes &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof PropsCommunes> & { href?: undefined }

type PropsLien = PropsCommunes &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof PropsCommunes> & { href: string }

export type BoutonProps = PropsBouton | PropsLien

const Bouton = forwardRef<HTMLButtonElement | HTMLAnchorElement, BoutonProps>(function Bouton(props, ref) {
  const { variant = 'secondaire', size = 'md', icon, iconRight, loading, className = '', children, ...reste } = props
  const classes = `${BASE} ${VARIANTES[variant]} ${TAILLES[size]} ${className}`

  if ('href' in props && props.href !== undefined) {
    const { href, ...rest } = reste as React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
    return (
      <Link href={href} ref={ref as React.Ref<HTMLAnchorElement>} className={classes} {...rest}>
        <Contenu variant={variant} icon={icon} iconRight={iconRight} loading={loading}>{children}</Contenu>
      </Link>
    )
  }

  const btnProps = reste as React.ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} className={classes} {...btnProps}
      type={btnProps.type ?? 'button'} disabled={btnProps.disabled || loading}
      aria-busy={loading || undefined}>
      <Contenu variant={variant} icon={icon} iconRight={iconRight} loading={loading}>{children}</Contenu>
    </button>
  )
})

export default Bouton
