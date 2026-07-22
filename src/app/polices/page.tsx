import { Nunito, Lexend, Poppins, Fredoka, Quicksand } from 'next/font/google'

// Page de comparaison des typographies. Toutes les polices candidates sont
// chargees et affichees cote a cote sur le MEME contenu d'exemple, pour choisir
// en un coup d'oeil (et sans se battre avec le cache mobile : tout est sur une
// seule page chargee d'un coup). Page utilitaire, hors parcours normal.

const nunito = Nunito({ subsets: ['latin'] })
const lexend = Lexend({ subsets: ['latin'] })
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'] })
const fredoka = Fredoka({ subsets: ['latin'] })
const quicksand = Quicksand({ subsets: ['latin'] })

const POLICES = [
  { n: 1, nom: 'Nunito', style: nunito.style, desc: 'Arrondie, chaleureuse, le classique des applis scolaires.' },
  { n: 2, nom: 'Lexend', style: lexend.style, desc: 'Conçue pour faciliter la lecture. Nette et espacée.' },
  { n: 3, nom: 'Poppins', style: poppins.style, desc: 'Géométrique, moderne, avec du caractère.' },
  { n: 4, nom: 'Fredoka', style: fredoka.style, desc: 'Ronde et douce, esprit très enfantin / CP.' },
  { n: 5, nom: 'Quicksand', style: quicksand.style, desc: 'Géométrique arrondie, légère et élégante.' },
]

export default function PolicesPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-violet-800">Choisis ta typographie</h1>
        <p className="text-sm text-gray-600 mt-1">
          Voici le même contenu dans plusieurs polices. Regarde celle que tu préfères,
          puis dis-moi son numéro, je la mets partout dans l&apos;appli.
        </p>
      </div>

      {POLICES.map(p => (
        <section key={p.n} style={p.style}
          className="bg-white border-2 border-violet-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <span className="text-lg font-bold text-violet-700">{p.n}. {p.nom}</span>
          </div>
          <p className="text-xs text-gray-400 mb-4" style={{ fontFamily: 'system-ui, sans-serif' }}>{p.desc}</p>

          {/* Echantillon : titres, texte, liste et bouton, comme dans l'appli. */}
          <h2 className="text-xl font-bold text-gray-900">Ma Progression CP</h2>
          <h3 className="text-base font-semibold text-violet-700 mt-2">Semaine 3 · Période 1</h3>
          <p className="text-sm text-gray-700 mt-1">
            Cette semaine, on travaille les graphèmes et les premiers nombres. L&apos;IA lit ta
            méthode et prépare ton cahier journal.
          </p>
          <ul className="text-sm text-gray-700 mt-2 space-y-0.5">
            <li>• Français : les sons a, i, o</li>
            <li>• Maths : les nombres jusqu&apos;à 10</li>
          </ul>
          <button className="mt-4 bg-violet-700 text-white rounded-xl px-4 py-2 font-semibold">
            Générer ma journée
          </button>
        </section>
      ))}

      <p className="text-center text-sm text-gray-500 pt-2">
        Dis-moi le numéro de celle que tu préfères 👆
      </p>
    </div>
  )
}
