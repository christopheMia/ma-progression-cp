'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, CalendarDays, Plus, Save } from 'lucide-react'
import IaImport from '@/components/setup/IaImport'
import Bouton from '@/components/ui/Bouton'
import { enregistrerProgressionMatiere } from '@/lib/actions/progression-matiere'
import { enregistrerProgressionPeriode } from '@/lib/actions/progression-periode'
import { createMethode, updateSuiviActif, lierCreneaux } from '@/lib/actions/methodes'
import NomMethodeEditor from '@/components/parametres/NomMethodeEditor'
import type { Methode } from '@/types'
import type { ProgressionSemaine } from '@/data/manuels'

type CreneauInfo = { id: string; matiere: string; jour: string; methode_id: string | null }

export default function MethodesEditor({
  prenom,
  methodes,
  creneaux,
  resumes,
}: {
  prenom?: string
  methodes: Methode[]
  creneaux: CreneauInfo[]
  resumes?: Record<string, { semaines: number; notions: number }>
}) {
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [lienOuvert, setLienOuvert] = useState<string | null>(null)
  const [nouveauNom, setNouveauNom] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Sélection des créneaux (state local avant sauvegarde)
  const [creneauxSelectionnes, setCreneauxSelectionnes] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {}
    for (const m of methodes) {
      init[m.id] = new Set(creneaux.filter(c => c.methode_id === m.id).map(c => c.id))
    }
    return init
  })

  function getSelectionMethode(methodeId: string): Set<string> {
    return creneauxSelectionnes[methodeId] ?? new Set(creneaux.filter(c => c.methode_id === methodeId).map(c => c.id))
  }

  function toggleCreneau(methodeId: string, creneauId: string) {
    setCreneauxSelectionnes(prev => {
      const current = new Set(prev[methodeId] ?? creneaux.filter(c => c.methode_id === methodeId).map(c => c.id))
      if (current.has(creneauId)) current.delete(creneauId)
      else current.add(creneauId)
      return { ...prev, [methodeId]: current }
    })
  }

  async function saveImport(
    methodeId: string,
    matiere: string,
    progression: ProgressionSemaine[],
    periode?: number,
    nomManuel?: string,
  ) {
    // Import d'un planning de periode : on recale sur les semaines de cette
    // periode et on ne touche pas aux autres periodes deja saisies.
    if (periode) {
      const { premiereSemaine, derniereSemaine } =
        await enregistrerProgressionPeriode(matiere, periode, progression, nomManuel)
      setMessage(`${matiere} · période ${periode} enregistrée (semaines ${premiereSemaine} à ${derniereSemaine}) ✓`)
    } else {
      await enregistrerProgressionMatiere(matiere, progression, nomManuel)
      setMessage(`${matiere} enregistré ✓`)
    }
    setOuverte(null)
    router.refresh()
  }

  function saveLien(methodeId: string) {
    startTransition(async () => {
      await lierCreneaux(methodeId, Array.from(getSelectionMethode(methodeId)))
      setMessage('Créneaux liés ✓')
      setLienOuvert(null)
      router.refresh()
    })
  }

  function toggleSuivi(methodeId: string, current: boolean) {
    startTransition(async () => {
      await updateSuiviActif(methodeId, !current)
      router.refresh()
    })
  }

  async function ajouterMethode() {
    const nom = nouveauNom.trim()
    if (!nom) return
    await createMethode(nom)
    setNouveauNom('')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 bg-violet-50 border border-violet-100 rounded-lg p-3 leading-relaxed">
        Ici tu importes chaque méthode séparément (Français, Maths, Anglais…).
        Pour chaque matière, tu peux <strong>cocher la case « Suivre les acquis »</strong> si
        tu veux noter les progrès des élèves dans cette matière (cela fait apparaître les étoiles ★ dans le suivi).
        Réimporter une matière ne touche jamais les autres.
      </p>
      {message && <p className="text-sm text-green-600">{message}</p>}

      {methodes.map(m => {
        const selection = getSelectionMethode(m.id)
        const creneauxLies = creneaux.filter(c => selection.has(c.id))
        const labelMethode = m.matiere === 'francais' ? 'Français' : m.matiere === 'maths' ? 'Maths' : m.matiere.charAt(0).toUpperCase() + m.matiere.slice(1)

        return (
          <div key={m.id} className="border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-700">{labelMethode}</span>
                {/* Nom du manuel importe, modifiable sur place : sans lui, on ne
                    sait pas d'ou vient la progression affichee (retour du 20/07). */}
                <NomMethodeEditor methodeId={m.id} nom={m.manuel} />
                {resumes?.[m.id] && resumes[m.id].semaines > 0 ? (
                  <span className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                    📊 {resumes[m.id].semaines} semaine{resumes[m.id].semaines > 1 ? 's' : ''} · {resumes[m.id].notions} notion{resumes[m.id].notions > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Pas encore importée</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={m.suivi_actif}
                    onChange={() => toggleSuivi(m.id, m.suivi_actif)}
                    className="accent-violet-600"
                  />
                  📊 Suivre les acquis des élèves <span className="text-gray-400">(affiche les étoiles ★)</span>
                </label>
                <Bouton type="button" variant="neutre" size="sm" icon={CalendarDays}
                  onClick={() => setLienOuvert(lienOuvert === m.id ? null : m.id)}
                  className="text-xs">
                  {creneauxLies.length > 0 ? `${creneauxLies.length} créneau${creneauxLies.length > 1 ? 'x' : ''} de la semaine` : 'Choisir les créneaux de la semaine'}
                </Bouton>
                <Bouton type="button" variant="contour" size="sm" icon={Bot}
                  onClick={() => { setMessage(null); setOuverte(ouverte === m.id ? null : m.id) }}
                  className="text-sm">
                  {ouverte === m.id ? 'Fermer' : 'Importer ou corriger la méthode'}
                </Bouton>
              </div>
            </div>

            {lienOuvert === m.id && (
              <div className="border-t pt-2 space-y-2">
                <p className="text-xs text-gray-500">Coche les créneaux de ton EDT alimentés par cette méthode :</p>
                <div className="grid grid-cols-2 gap-1">
                  {creneaux.map(c => (
                    <label key={c.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selection.has(c.id)}
                        onChange={() => toggleCreneau(m.id, c.id)}
                        className="accent-violet-600"
                      />
                      <span className="text-gray-700">{c.jour} — {c.matiere}</span>
                    </label>
                  ))}
                  {creneaux.length === 0 && (
                    <p className="text-xs text-gray-400 col-span-2">Aucun créneau dans l’emploi du temps.</p>
                  )}
                </div>
                <Bouton type="button" variant="secondaire" size="sm" icon={Save}
                  onClick={() => saveLien(m.id)}
                  loading={isPending}>
                  Enregistrer les créneaux liés
                </Bouton>
              </div>
            )}

            {ouverte === m.id && (
              <div className="mt-2">
                <IaImport prenom={prenom} matiereFixe={m.matiere}
                  onSave={(matiere, prog, periode, nom) => saveImport(m.id, matiere, prog, periode, nom)} />
              </div>
            )}
          </div>
        )
      })}

      <div className="border border-dashed border-violet-300 rounded-xl p-3 space-y-2">
        <p className="text-sm font-medium text-gray-700">➕ Ajouter une nouvelle matière</p>
        <p className="text-xs text-gray-400">Écris le nom d’une matière (Anglais, Sciences, EMC…) puis clique « Ajouter ».</p>
        <div className="flex gap-2">
          <input
            value={nouveauNom}
            onChange={e => setNouveauNom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ajouterMethode()}
            placeholder="Ex : Anglais, EMC, Sciences…"
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white"
          />
          <Bouton type="button" variant="contour" size="sm" icon={Plus}
            onClick={ajouterMethode}
            disabled={!nouveauNom.trim()}
            className="text-sm">
            Ajouter
          </Bouton>
        </div>
      </div>
    </div>
  )
}
