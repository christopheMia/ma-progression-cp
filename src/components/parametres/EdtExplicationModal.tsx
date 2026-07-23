'use client'
import { useEffect } from 'react'
import { Sparkles, AlertTriangle } from 'lucide-react'
import { expliquerGenerationEdt, formatDuree } from '@/lib/edt-generator'
import Bouton from '@/components/ui/Bouton'

/**
 * Fenetre d'explication affichee AVANT de generer l'emploi du temps.
 * L'enseignante remplace son EDT existant : elle doit pouvoir verifier
 * exactement sur quoi la generation se fonde (volumes officiels, cadre de
 * journee, regles de placement) avant de valider.
 *
 * Tout le contenu est derive de `expliquerGenerationEdt()`, donc du code du
 * generateur lui-meme : l'explication ne peut pas mentir sur le comportement.
 */
export default function EdtExplicationModal({ onConfirm, onCancel, isPending }: {
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  const info = expliquerGenerationEdt(true)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, isPending])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Fermer" onClick={() => !isPending && onCancel()}
        className="absolute inset-0 bg-slate-900/50" />

      <div role="dialog" aria-modal="true" aria-labelledby="titre-explication-edt"
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <header className="sticky top-0 bg-violet-600 text-white px-5 py-3 flex items-center gap-2">
          <Sparkles size={18} aria-hidden="true" />
          <h2 id="titre-explication-edt" className="font-semibold">
            Comment ton emploi du temps va être construit
          </h2>
        </header>

        <div className="p-5 space-y-6 text-sm text-slate-700 text-left">
          <section>
            <h3 className="font-semibold text-slate-900 mb-2">Les volumes horaires</h3>
            <p className="text-slate-600 mb-3">
              Le point de départ est le programme officiel. La colonne « retenu » est ce qui
              sera réellement placé dans ta grille, une fois les récréations et les rituels déduits.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-violet-50 text-left text-violet-900">
                    <th className="p-2 font-semibold">Matière</th>
                    <th className="p-2 font-semibold whitespace-nowrap">Officiel / semaine</th>
                    <th className="p-2 font-semibold whitespace-nowrap">Retenu / semaine</th>
                  </tr>
                </thead>
                <tbody>
                  {info.volumes.map(v => (
                    <tr key={v.matiere} className="border-t border-slate-100">
                      <td className="p-2">{v.matiere}</td>
                      <td className="p-2 text-slate-500 whitespace-nowrap">
                        {v.officiel === null ? '—' : formatDuree(v.officiel)}
                      </td>
                      <td className="p-2 font-medium text-slate-900 whitespace-nowrap">
                        {formatDuree(v.retenu)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900 mb-2">Le cadre de la journée</h3>
            <p className="text-slate-600 mb-2">
              Journée type de {info.journee.debut} à {info.journee.fin}. Ces moments sont posés
              d&apos;office et ne comptent pas comme du temps d&apos;enseignement :
            </p>
            <ul className="space-y-1">
              {info.cadre.map(c => (
                <li key={c.libelle} className="flex gap-2">
                  <span className="text-violet-600" aria-hidden="true">•</span>
                  <span><strong className="text-slate-900">{c.horaire}</strong> · {c.libelle}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900 mb-2">Les règles appliquées</h3>
            <ul className="space-y-1.5">
              {info.regles.map(r => (
                <li key={r} className="flex gap-2">
                  <span className="text-violet-600" aria-hidden="true">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900 flex items-start gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>La génération <strong>remplace</strong> ton emploi du temps actuel. Tu pourras
              ensuite tout modifier à la main.</span>
          </p>
        </div>

        <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-2">
          <Bouton type="button" variant="neutre" size="sm" onClick={onCancel} disabled={isPending}>
            Annuler
          </Bouton>
          <Bouton type="button" variant="secondaire" size="sm" onClick={onConfirm} loading={isPending}>
            {isPending ? 'Génération…' : 'J’ai compris, générer'}
          </Bouton>
        </footer>
      </div>
    </div>
  )
}
