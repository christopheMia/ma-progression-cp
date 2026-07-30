import Link from 'next/link'
import { soldeIA } from '@/lib/actions/ia-usage'

/**
 * Ce qu il reste de credit IA.
 *
 * Affiche en DOLLARS, comme la console Anthropic : la jauge et le site de
 * reference doivent parler la meme unite, sinon on compare deux chiffres qui
 * ne veulent pas dire la meme chose.
 *
 * Tant qu aucun releve n a ete saisi, l application n affiche pas de solde :
 * elle ne peut pas le deviner (l API de couts est reservee aux comptes
 * organisation). Elle montre alors ce qu elle a compte, et invite a saisir le
 * point de depart. Mieux vaut un chiffre absent qu un chiffre faux.
 */
export default async function BudgetIaIndicator() {
  const { consommeUsd, restantUsd, releveAt, soldeReleveUsd } = await soldeIA()

  const dateReleve = releveAt
    ? new Date(releveAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : null

  if (restantUsd === null || soldeReleveUsd === null) {
    return (
      <div className="text-xs text-slate-600">
        <div className="font-medium text-slate-700 mb-1">Crédit IA</div>
        <p className="text-[11px] text-slate-500 leading-snug">
          {consommeUsd > 0
            ? <>Environ {consommeUsd.toFixed(2)} $ consommés depuis le début du suivi. </>
            : <>Aucune consommation enregistrée pour l&apos;instant. </>}
          Pour voir le crédit restant,{' '}
          <Link href="/parametres#credit-ia" className="text-violet-600 underline">
            indique ton solde
          </Link>{' '}
          relevé sur la console Anthropic.
        </p>
      </div>
    )
  }

  const pct = soldeReleveUsd > 0
    ? Math.min(100, Math.max(0, (restantUsd / soldeReleveUsd) * 100))
    : 0
  const faible = restantUsd <= soldeReleveUsd * 0.2 || restantUsd <= 1
  const epuise = restantUsd <= 0

  return (
    <div className="text-xs text-slate-600">
      <div className="flex justify-between items-baseline mb-1.5 gap-2">
        <span className="font-medium text-slate-700">Crédit IA restant (estimé)</span>
        <span className={faible ? 'text-orange-600 font-semibold' : 'font-semibold text-slate-800'}>
          {Math.max(0, restantUsd).toFixed(2)} $
          <span className="font-normal text-slate-500"> / {soldeReleveUsd.toFixed(2)} $</span>
        </span>
      </div>

      <div className="h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
        <div
          className={`h-full rounded-full transition-all ${faible ? 'bg-orange-500' : 'bg-violet-500'}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Crédit IA restant"
        />
      </div>

      <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
        {epuise
          ? <>Crédit épuisé d&apos;après l&apos;estimation. </>
          : <>Environ {consommeUsd.toFixed(2)} $ consommés depuis ton relevé{dateReleve ? ` du ${dateReleve}` : ''}. </>}
        <Link href="/parametres#credit-ia" className="text-violet-600 underline">
          Mettre à jour le relevé
        </Link>
        <br />
        Estimation calculée par l&apos;application, à recaler de temps en temps sur la console Anthropic.
      </p>
    </div>
  )
}
