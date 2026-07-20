'use client'
import { useEffect, useState } from 'react'
import { couleurMatiere } from '@/data/trame-edt'

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number)
  const tot = h * 60 + m + mins
  return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const
const LABELS: Record<string, string> = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi' }
const MATIERES = ['Appropriation des graphèmes', 'Écriture', 'Phonologie', 'Vocabulaire', 'Lecture-écriture', 'Lecture compréhension', "Production d'écrits", 'Chut je lis', 'Calcul mental', 'Mathématiques', 'Histoire géographie', 'Sciences et technologie', 'Arts visuels', 'EPS', 'Anglais', 'EMC']

export type Creneau = {
  jour: string; heure_debut: string; heure_fin: string
  matiere: string; couleur: string | null; couleur_texte: string | null
  texte_gras: boolean; texte_italique: boolean; texte_souligne: boolean
  type: 'cours' | 'routine'
  visible_journal: boolean
}

/** Tranches horaires distinctes, triées par heure de début. */
function tranches(creneaux: Creneau[]): Array<{ debut: string; fin: string }> {
  const seen = new Map<string, { debut: string; fin: string }>()
  for (const c of creneaux) seen.set(`${c.heure_debut}-${c.heure_fin}`, { debut: c.heure_debut, fin: c.heure_fin })
  return [...seen.values()].sort((a, b) => a.debut.localeCompare(b.debut))
}

export default function TimetableGrid({ initial, onSave, saving, finishLabel }: {
  initial: Creneau[]
  onSave: (creneaux: Creneau[]) => void
  saving: boolean
  finishLabel: string
}) {
  const [creneaux, setCreneaux] = useState<Creneau[]>(initial)
  // Cle de la seule case dont le menu de mise en forme est deroule (crayon).
  // Les controles de style restent masques partout ailleurs : la grille doit
  // rester lisible, la mise en forme est une option, pas le sujet principal.
  const [styleOuvert, setStyleOuvert] = useState<string | null>(null)
  const cleCase = (jour: string, debut: string, fin: string) => `${jour}|${debut}|${fin}`

  // Historique pour l'annulation (Ctrl+Z). La grille est petite, on garde donc
  // simplement des copies completes plutot que des diffs : c'est incassable et
  // le cout memoire est negligeable. Profondeur bornee pour ne pas grossir sans fin.
  const [historique, setHistorique] = useState<Creneau[][]>([])
  const PROFONDEUR_MAX = 30

  /**
   * Point de passage UNIQUE de toutes les modifications de la grille : on
   * empile l'etat precedent avant d'appliquer. Si la mise a jour ne change
   * rien (cas rejetes, ex. collision d'horaires), on n'empile pas, sinon
   * l'utilisateur devrait appuyer plusieurs fois sur annuler sans effet visible.
   */
  function modifier(maj: (prev: Creneau[]) => Creneau[]) {
    const suivant = maj(creneaux)
    if (suivant === creneaux) return
    setHistorique(h => [...h, creneaux].slice(-PROFONDEUR_MAX))
    setCreneaux(suivant)
  }

  function annuler() {
    if (!historique.length) return
    setCreneaux(historique[historique.length - 1])
    setHistorique(historique.slice(0, -1))
    setStyleOuvert(null)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        annuler()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const joursPresents = JOURS.filter(j => creneaux.some(c => c.jour === j))
  const cols = joursPresents.length ? joursPresents : ['lundi', 'mardi', 'jeudi', 'vendredi']
  const lignes = tranches(creneaux)

  function cellule(jour: string, debut: string, fin: string) {
    return creneaux.find(c => c.jour === jour && c.heure_debut === debut && c.heure_fin === fin)
  }

  function setMatiere(jour: string, debut: string, fin: string, matiere: string) {
    modifier(prev => {
      const idx = prev.findIndex(c => c.jour === jour && c.heure_debut === debut && c.heure_fin === fin)
      if (matiere === '') return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev
      const couleur = couleurMatiere(matiere)
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, matiere, couleur } : c)
      return [...prev, { jour, heure_debut: debut, heure_fin: fin, matiere, couleur, couleur_texte: null, texte_gras: false, texte_italique: false, texte_souligne: false, type: 'cours', visible_journal: true }]
    })
  }

  function setCouleur(jour: string, debut: string, fin: string, field: 'couleur' | 'couleur_texte', value: string) {
    modifier(prev => prev.map(c =>
      c.jour === jour && c.heure_debut === debut && c.heure_fin === fin ? { ...c, [field]: value } : c))
  }

  function toggleStyle(jour: string, debut: string, fin: string, field: 'texte_gras' | 'texte_italique' | 'texte_souligne') {
    modifier(prev => prev.map(c =>
      c.jour === jour && c.heure_debut === debut && c.heure_fin === fin ? { ...c, [field]: !c[field] } : c))
  }

  /** Applique le fond, la couleur de texte et la mise en forme d'une case à
   *  TOUTES les cases de la même matière (gain de temps demandé par l'enseignant). */
  function appliquerMemeMatiere(src: Creneau) {
    modifier(prev => prev.map(c =>
      c.matiere && c.matiere === src.matiere
        ? { ...c, couleur: src.couleur, couleur_texte: src.couleur_texte, texte_gras: src.texte_gras, texte_italique: src.texte_italique, texte_souligne: src.texte_souligne }
        : c))
  }

  function toggleRoutine(debut: string, fin: string) {
    modifier(prev => {
      const isRoutine = prev.some(c => c.heure_debut === debut && c.heure_fin === fin && c.type === 'routine')
      return prev.map(c => c.heure_debut === debut && c.heure_fin === fin
        ? { ...c, type: isRoutine ? 'cours' : 'routine', couleur: isRoutine ? couleurMatiere(c.matiere) : '#f3f4f6' }
        : c)
    })
  }

  function supprimerLigne(debut: string, fin: string) {
    modifier(prev => prev.filter(c => !(c.heure_debut === debut && c.heure_fin === fin)))
  }

  function toggleVisible(debut: string, fin: string) {
    modifier(prev => {
      const isVisible = prev.some(
        c => c.heure_debut === debut && c.heure_fin === fin && c.visible_journal !== false
      )
      return prev.map(c =>
        c.heure_debut === debut && c.heure_fin === fin
          ? { ...c, visible_journal: !isVisible }
          : c
      )
    })
  }

  function ajouterLigne() {
    modifier(prev => {
      const lastFin = prev.reduce((max, c) => (c.heure_fin > max ? c.heure_fin : max), '08:00')
      const debut = lastFin, fin = addMinutes(lastFin, 30)
      if (prev.some(c => c.heure_debut === debut && c.heure_fin === fin)) return prev
      return [...prev, ...cols.map(jour => ({ jour, heure_debut: debut, heure_fin: fin, matiere: '', couleur: null, couleur_texte: null, texte_gras: false, texte_italique: false, texte_souligne: false, type: 'cours' as const, visible_journal: true }))]
    })
  }

  function setHoraire(debutOld: string, finOld: string, field: 'heure_debut' | 'heure_fin', value: string) {
    modifier(prev => {
      const newDebut = field === 'heure_debut' ? value : debutOld
      const newFin = field === 'heure_fin' ? value : finOld
      // Rejette une édition qui ferait coïncider cette tranche avec une AUTRE tranche existante
      // (sinon deux jeux de créneaux partagent la même clé horaire → corruption silencieuse).
      const collision = prev.some(c =>
        !(c.heure_debut === debutOld && c.heure_fin === finOld) &&
        c.heure_debut === newDebut && c.heure_fin === newFin)
      if (collision) return prev
      return prev.map(c =>
        c.heure_debut === debutOld && c.heure_fin === finOld ? { ...c, [field]: value } : c)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-gray-400">
          Clique sur une case pour changer la matière, sur le ✏️ pour la mettre en forme (couleurs, gras…).
          Les lignes grises (accueil, récréation…) ne reçoivent pas de déroulement dans le cahier journal.
        </p>
        <button type="button" onClick={annuler} disabled={!historique.length}
          title="Annuler la dernière modification (Ctrl+Z)"
          className="shrink-0 flex items-center gap-1 text-xs border border-violet-300 text-violet-700 rounded-lg px-2.5 py-1 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
          <span aria-hidden="true">↩</span>
          Annuler
          {historique.length > 0 && <span className="text-violet-400">({historique.length})</span>}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr>
              <th className="border border-violet-100 bg-violet-100 p-2 text-gray-700">Horaires</th>
              {cols.map(j => <th key={j} className="border border-violet-100 bg-violet-100 p-2 text-gray-700">{LABELS[j]}</th>)}
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ debut, fin }) => {
              const isRoutine = creneaux.some(c => c.heure_debut === debut && c.heure_fin === fin && c.type === 'routine')
              return (
                <tr key={`${debut}-${fin}`}>
                  <td className="border border-violet-100 bg-violet-50 p-1 whitespace-nowrap text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <input type="time" value={debut} onChange={e => setHoraire(debut, fin, 'heure_debut', e.target.value)} className="w-20 border rounded p-0.5 text-gray-900 bg-white" />
                      <input type="time" value={fin} onChange={e => setHoraire(debut, fin, 'heure_fin', e.target.value)} className="w-20 border rounded p-0.5 text-gray-900 bg-white" />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => toggleRoutine(debut, fin)} className="text-[10px] text-violet-500 hover:underline">{isRoutine ? '↩ cours' : 'routine'}</button>
                      <button onClick={() => toggleVisible(debut, fin)}
                        className={`text-[10px] hover:underline ${
                          creneaux.some(c => c.heure_debut === debut && c.heure_fin === fin && c.visible_journal === false)
                            ? 'text-gray-400' : 'text-violet-500'
                        }`}>
                        {creneaux.some(c => c.heure_debut === debut && c.heure_fin === fin && c.visible_journal === false)
                          ? '👁️ masqué' : '👁️ visible'}
                      </button>
                      <button onClick={() => supprimerLigne(debut, fin)} className="text-[10px] text-red-400 hover:underline">supprimer</button>
                    </div>
                  </td>
                  {cols.map(jour => {
                    const c = cellule(jour, debut, fin)
                    const cle = cleCase(jour, debut, fin)
                    const ouvert = styleOuvert === cle
                    return (
                      <td key={jour} className="border border-violet-100 p-1 align-top group" style={{ backgroundColor: c?.couleur ?? undefined }}>
                        <div className="flex items-center gap-0.5">
                          <select
                            value={c?.matiere ?? ''}
                            onChange={e => setMatiere(jour, debut, fin, e.target.value)}
                            aria-label={`${LABELS[jour]} ${debut}-${fin}`}
                            style={{
                              color: c?.couleur_texte ?? undefined,
                              fontWeight: c?.texte_gras ? 700 : undefined,
                              fontStyle: c?.texte_italique ? 'italic' : undefined,
                              textDecoration: c?.texte_souligne ? 'underline' : undefined,
                            }}
                            className="min-w-0 flex-1 bg-transparent text-gray-900 text-xs p-1 outline-none">
                            <option value="">—</option>
                            {Array.from(new Set([...MATIERES, c?.matiere].filter(Boolean) as string[])).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          {c && (
                            <button type="button"
                              onClick={() => setStyleOuvert(ouvert ? null : cle)}
                              aria-expanded={ouvert}
                              title="Mise en forme de la case"
                              aria-label={`Mise en forme ${LABELS[jour]} ${debut}`}
                              className={`shrink-0 rounded px-1 text-[11px] leading-none transition-opacity ${
                                ouvert
                                  ? 'bg-violet-200 opacity-100'
                                  : 'opacity-40 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-80'
                              }`}>
                              ✏️
                            </button>
                          )}
                        </div>
                        {c && ouvert && (
                          <div className="flex items-center gap-1 mt-1 bg-white rounded-lg border border-violet-200 shadow-sm px-1 py-0.5 w-fit">
                            <input type="color" title="Couleur du fond" aria-label={`Couleur du fond ${LABELS[jour]} ${debut}`}
                              value={c.couleur ?? '#ffffff'} onChange={e => setCouleur(jour, debut, fin, 'couleur', e.target.value)}
                              className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                            <input type="color" title="Couleur du texte" aria-label={`Couleur du texte ${LABELS[jour]} ${debut}`}
                              value={c.couleur_texte ?? '#111827'} onChange={e => setCouleur(jour, debut, fin, 'couleur_texte', e.target.value)}
                              className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                            <button type="button" title="Gras" onClick={() => toggleStyle(jour, debut, fin, 'texte_gras')}
                              className={`text-[11px] leading-none px-1 rounded font-bold ${c.texte_gras ? 'bg-violet-200 text-violet-900' : 'text-gray-600 hover:bg-gray-100'}`}>B</button>
                            <button type="button" title="Italique" onClick={() => toggleStyle(jour, debut, fin, 'texte_italique')}
                              className={`text-[11px] leading-none px-1 rounded italic ${c.texte_italique ? 'bg-violet-200 text-violet-900' : 'text-gray-600 hover:bg-gray-100'}`}>i</button>
                            <button type="button" title="Souligné" onClick={() => toggleStyle(jour, debut, fin, 'texte_souligne')}
                              className={`text-[11px] leading-none px-1 rounded underline ${c.texte_souligne ? 'bg-violet-200 text-violet-900' : 'text-gray-600 hover:bg-gray-100'}`}>U</button>
                            {c.matiere && (
                              <button type="button" title={`Appliquer ce style à toutes les cases « ${c.matiere} »`}
                                onClick={() => appliquerMemeMatiere(c)}
                                className="text-[11px] leading-none px-1 rounded text-violet-600 hover:bg-violet-100">🖌️</button>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <button onClick={ajouterLigne} className="text-sm text-violet-600 hover:underline">+ Ajouter une tranche horaire</button>

      <button onClick={() => onSave(creneaux)} disabled={saving}
        className="w-full bg-green-600 text-white rounded-xl p-4 font-semibold hover:bg-green-700 disabled:opacity-50">
        {saving ? 'Enregistrement…' : finishLabel}
      </button>
    </div>
  )
}
