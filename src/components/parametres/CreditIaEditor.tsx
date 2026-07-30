'use client'
import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { enregistrerSoldeReleve } from '@/lib/actions/ia-usage'
import Bouton from '@/components/ui/Bouton'

/**
 * Saisie du solde reel releve sur la console Anthropic.
 *
 * L application ne peut pas lire ce chiffre toute seule : l API de couts
 * d Anthropic n existe que pour les comptes organisation. Elle sait additionner
 * ses propres appels, mais elle ne voit pas ce qui se passe en dehors d elle.
 * Ce releve est donc le point d ancrage : a chaque saisie, la derive accumulee
 * repart de zero.
 */
export default function CreditIaEditor({
  soldeInitial,
  releveAt,
  consommeDepuis,
}: {
  soldeInitial: number | null
  releveAt: string | null
  consommeDepuis: number
}) {
  const [montant, setMontant] = useState(soldeInitial === null ? '' : String(soldeInitial))
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  function enregistrer() {
    setMessage(null)
    const valeur = Number(montant.replace(',', '.'))
    if (!Number.isFinite(valeur) || valeur < 0) {
      setMessage({ ok: false, texte: 'Entre un montant en dollars, par exemple 1.66' })
      return
    }
    startTransition(async () => {
      const res = await enregistrerSoldeReleve(valeur)
      setMessage(res.ok
        ? { ok: true, texte: 'Relevé enregistré' }
        : { ok: false, texte: res.erreur })
    })
  }

  const dateReleve = releveAt
    ? new Date(releveAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        L&apos;application estime ce qu&apos;elle consomme, mais elle ne peut pas lire ton solde
        réel chez Anthropic. Va le relever sur{' '}
        <a
          href="https://console.anthropic.com/settings/billing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 underline"
        >
          la console Anthropic
        </a>
        {' '}et note-le ici. La jauge repartira de ce chiffre.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <input
            value={montant}
            onChange={e => setMontant(e.target.value)}
            inputMode="decimal"
            placeholder="1.66"
            aria-label="Solde restant en dollars"
            className="border border-gray-200 rounded-lg p-2 pr-7 w-28 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-violet-400 outline-none"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
        </div>
        <Bouton variant="secondaire" size="sm" onClick={enregistrer} loading={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer le relevé'}
        </Bouton>
        {message && !isPending && (
          <span className={`text-sm inline-flex items-center gap-1 ${message.ok ? 'text-emerald-600' : 'text-orange-600'}`}>
            {message.ok && <Check size={15} aria-hidden="true" />} {message.texte}
          </span>
        )}
      </div>

      {dateReleve && (
        <p className="text-xs text-gray-400">
          Dernier relevé le {dateReleve} : {soldeInitial?.toFixed(2)} $.
          L&apos;application a compté {consommeDepuis.toFixed(2)} $ depuis.
        </p>
      )}
    </div>
  )
}
