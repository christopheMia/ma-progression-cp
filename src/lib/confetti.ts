'use client'

/** Petite célébration confettis, sans dépendance externe. */
export function celebrate() {
  if (typeof document === 'undefined') return
  const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#ec4899']
  const container = document.createElement('div')
  container.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
  document.body.appendChild(container)

  for (let i = 0; i < 90; i++) {
    const piece = document.createElement('div')
    const size = 6 + Math.random() * 8
    const left = Math.random() * 100
    const delay = Math.random() * 0.4
    const duration = 1.6 + Math.random() * 1.6
    piece.style.cssText = [
      'position:absolute',
      'top:-12px',
      `left:${left}%`,
      `width:${size}px`,
      `height:${size}px`,
      `background:${colors[i % colors.length]}`,
      `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
      'opacity:0.9',
      `animation:confetti-fall ${duration}s ${delay}s ease-in forwards`,
    ].join(';')
    container.appendChild(piece)
  }

  setTimeout(() => container.remove(), 3600)
}
