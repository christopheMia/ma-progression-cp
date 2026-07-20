import { usageMoisCourant } from '@/lib/actions/ia-usage'
import { estimerCoutEuros, PLAFOND_EUROS } from '@/lib/ia/cout'

/**
 * Jauge de consommation IA du mois.
 *
 * Retour du 20/07 : "je suis pas sur que la jauge fonctionne bien". Le calcul
 * etait correct, mais l'usage reel (~0,26 € sur 8 €) remplissait 3 % d'une barre
 * de 6 px : quelques pixels, donc invisible. On ne pouvait pas distinguer
 * "presque rien consomme" de "cassee".
 *
 * Corrections : barre plus haute, remplissage avec une largeur minimale visible
 * des qu'il y a la moindre consommation, et affichage du nombre de tokens pour
 * prouver que la mesure est bien vivante.
 */
export default async function BudgetIaIndicator() {
  const { input, output } = await usageMoisCourant()
  const euros = estimerCoutEuros(input, output)
  const pct = Math.min(100, (euros / PLAFOND_EUROS) * 100)
  const proche = euros >= PLAFOND_EUROS * 0.8
  const aConsomme = input + output > 0
  // Des qu'il y a de la consommation, on garde au moins 3 % de largeur : sinon
  // une petite valeur donne une barre vide, impossible a distinguer d'un bug.
  const largeur = aConsomme ? Math.max(3, pct) : 0

  const nf = new Intl.NumberFormat('fr-FR')

  return (
    <div className="text-xs text-slate-600">
      <div className="flex justify-between items-baseline mb-1.5 gap-2">
        <span className="font-medium text-slate-700">Budget IA estimé ce mois</span>
        <span className={proche ? 'text-orange-600 font-semibold' : 'font-semibold text-slate-800'}>
          {euros.toFixed(2)} € <span className="font-normal text-slate-500">/ {PLAFOND_EUROS} €</span>
        </span>
      </div>

      <div className="h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
        <div
          className={`h-full rounded-full transition-all ${proche ? 'bg-orange-500' : 'bg-violet-500'}`}
          style={{ width: `${largeur}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Budget IA consommé ce mois"
        />
      </div>

      <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
        {aConsomme ? (
          <>
            {Math.round(pct)} % utilisé · {nf.format(input)} mots lus et {nf.format(output)} mots écrits par l&apos;IA ce mois-ci.
          </>
        ) : (
          <>Aucune utilisation de l&apos;IA ce mois-ci pour l&apos;instant.</>
        )}
        <br />
        Estimation indicative, ce n&apos;est pas le solde réel facturé.
      </p>
    </div>
  )
}
