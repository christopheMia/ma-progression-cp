import { usageMoisCourant } from '@/lib/actions/ia-usage'
import { estimerCoutEuros, PLAFOND_EUROS } from '@/lib/ia/cout'

export default async function BudgetIaIndicator() {
  const { input, output } = await usageMoisCourant()
  const euros = estimerCoutEuros(input, output)
  const pct = Math.min(100, Math.round((euros / PLAFOND_EUROS) * 100))
  const proche = euros >= PLAFOND_EUROS * 0.8
  return (
    <div className="text-xs text-gray-500">
      <div className="flex justify-between mb-1">
        <span>Budget IA estimé ce mois</span>
        <span className={proche ? 'text-orange-600 font-semibold' : ''}>~{euros.toFixed(2)} € / {PLAFOND_EUROS} €</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${proche ? 'bg-orange-500' : 'bg-violet-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Estimation indicative (pas le solde réel Anthropic).</p>
    </div>
  )
}
