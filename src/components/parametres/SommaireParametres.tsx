'use client'
import { EVENEMENT_SECTIONS, type DetailEvenementSections } from '@/components/parametres/SectionRepliable'

/**
 * Sommaire cliquable en tête de la page Paramètres (demande de Christophe du
 * 17/10/2026 : « il faut scroller pour arriver au bon endroit, c'est long »).
 *
 * Un clic ouvre la section visée si elle était réduite, puis le lien `#id`
 * fait défiler jusqu'à elle. L'ouverture passe par un événement et non par
 * l'URL : recliquer la même entrée ne change pas l'ancre, donc `hashchange` ne
 * se déclencherait pas.
 */
export default function SommaireParametres({ sections }: {
  sections: { id: string; titre: string }[]
}) {
  function envoyer(detail: DetailEvenementSections) {
    window.dispatchEvent(new CustomEvent(EVENEMENT_SECTIONS, { detail }))
  }

  return (
    <nav aria-label="Sommaire des paramètres" className="bg-white border rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-bold text-gray-700">Aller directement à</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => envoyer({ toutes: 'reduire' })}
            className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/70"
          >
            Tout réduire
          </button>
          <button
            type="button"
            onClick={() => envoyer({ toutes: 'ouvrir' })}
            className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/70"
          >
            Tout ouvrir
          </button>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {sections.map(section => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={() => envoyer({ id: section.id })}
              className="inline-block rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/70"
            >
              {section.titre}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
