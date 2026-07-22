'use client'
import { useEffect, useRef, useState } from 'react'
import { couleurMatiere, couleurAffichee, COULEURS_FAMILLE } from '@/data/trame-edt'
import { construireGrille, creneauxDeLaLigne, type LigneGrille } from '@/lib/edt-grille'

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number)
  const tot = h * 60 + m + mins
  return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const
const LABELS: Record<string, string> = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi' }
const LABELS_COURTS: Record<string, string> = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven' }
const MATIERES = ['Appropriation des graphèmes', 'Écriture', 'Phonologie', 'Vocabulaire', 'Lecture-écriture', 'Lecture compréhension', "Production d'écrits", 'Chut je lis', 'Calcul mental', 'Mathématiques', 'Histoire géographie', 'Sciences et technologie', 'Arts visuels', 'EPS', 'Anglais', 'EMC']

export type Creneau = {
  jour: string; heure_debut: string; heure_fin: string
  matiere: string; couleur: string | null; couleur_texte: string | null
  texte_gras: boolean; texte_italique: boolean; texte_souligne: boolean
  type: 'cours' | 'routine'
  visible_journal: boolean
}

/** Identité d'un créneau : il n'a pas d'id, la clé (jour, horaires) suffit. */
const idc = (c: CreneauMin) => `${c.jour}|${c.heure_debut}|${c.heure_fin}`
type CreneauMin = { jour: string; heure_debut: string; heure_fin: string }

export default function TimetableGrid({ initial, onSave, onChange, saving, finishLabel }: {
  initial: Creneau[]
  onSave: (creneaux: Creneau[]) => void
  /** Notifie le parent a chaque edition, pour qu'il garde un brouillon de l'EDT
   *  meme si l'enseignante quitte l'etape puis y revient. */
  onChange?: (creneaux: Creneau[]) => void
  saving: boolean
  finishLabel: string
}) {
  const [creneaux, setCreneaux] = useState<Creneau[]>(initial)

  // Remonte le brouillon au parent des qu'il change (hors premier rendu, pour
  // ne pas re-notifier la valeur initiale telle quelle).
  const premierRendu = useRef(true)
  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return }
    onChange?.(creneaux)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creneaux])
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
  // Lignes = intervalles entre frontières horaires, et chaque séance rendue une
  // seule fois via `rowSpan`. Voir `src/lib/edt-grille.ts` pour le pourquoi.
  const { lignes, cases } = construireGrille(creneaux, cols)

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

  // Les actions ci-dessous portent sur une LIGNE de la grille. Une ligne étant
  // désormais un intervalle entre deux frontières horaires, elle concerne tous
  // les créneaux qui la chevauchent. Pour les lignes uniformes (récréation,
  // cantine, accueil : mêmes horaires sur les quatre jours), c'est exactement
  // l'ancien comportement.
  function toggleRoutine(ligne: LigneGrille) {
    modifier(prev => {
      const concernes = creneauxDeLaLigne(prev, ligne)
      if (!concernes.length) return prev
      const isRoutine = concernes.some(c => c.type === 'routine')
      const cibles = new Set(concernes.map(idc))
      return prev.map(c => cibles.has(idc(c))
        ? {
            ...c,
            type: isRoutine ? 'cours' as const : 'routine' as const,
            couleur: isRoutine ? couleurMatiere(c.matiere) : COULEURS_FAMILLE.routine,
          }
        : c)
    })
  }

  function supprimerLigne(ligne: LigneGrille) {
    modifier(prev => {
      const cibles = new Set(creneauxDeLaLigne(prev, ligne).map(idc))
      if (!cibles.size) return prev
      return prev.filter(c => !cibles.has(idc(c)))
    })
  }

  function toggleVisible(ligne: LigneGrille) {
    modifier(prev => {
      const concernes = creneauxDeLaLigne(prev, ligne)
      if (!concernes.length) return prev
      const isVisible = concernes.some(c => c.visible_journal !== false)
      const cibles = new Set(concernes.map(idc))
      return prev.map(c => cibles.has(idc(c)) ? { ...c, visible_journal: !isVisible } : c)
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

  /**
   * Horaires d'UNE séance. Ils s'éditaient auparavant par ligne, ce qui
   * supposait qu'une ligne corresponde à une seule séance sur tous les jours.
   * Ce n'est plus vrai depuis la fusion des cellules : chaque séance porte
   * désormais ses propres horaires, ce qui est aussi le vrai modèle de données.
   *
   * Deux garde-fous, impossibles à exprimer dans l'ancien modèle : un intervalle
   * doit rester non vide, et une séance ne peut pas en chevaucher une autre le
   * même jour.
   */
  function setHoraireSeance(src: Creneau, field: 'heure_debut' | 'heure_fin', value: string) {
    modifier(prev => {
      const nDebut = field === 'heure_debut' ? value : src.heure_debut
      const nFin = field === 'heure_fin' ? value : src.heure_fin
      if (!value || nDebut >= nFin) return prev
      const collision = prev.some(c =>
        c.jour === src.jour && idc(c) !== idc(src) &&
        c.heure_debut < nFin && c.heure_fin > nDebut)
      if (collision) return prev
      return prev.map(c => idc(c) === idc(src) ? { ...c, [field]: value } : c)
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
      <div className="rounded-xl border border-violet-100 bg-white p-1.5 sm:p-3">
        <table className="w-full table-fixed border-collapse text-[0.62rem] sm:text-xs">
          <colgroup>
            <col className="w-[3.1rem] sm:w-[4.6rem]" />
            {cols.map(j => <col key={j} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="border border-violet-100 bg-violet-100 p-1 text-center font-semibold text-violet-900">h</th>
              {cols.map(j => (
                <th key={j} className="border border-violet-100 bg-violet-100 p-1 text-center font-semibold text-violet-900 sm:p-2">
                  <span className="hidden sm:inline">{LABELS[j]}</span>
                  <span className="sm:hidden">{LABELS_COURTS[j]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, iLigne) => {
              const { debut, fin } = ligne
              const surLigne = creneauxDeLaLigne(creneaux, ligne)
              const isRoutine = surLigne.some(c => c.type === 'routine')
              const isMasque = surLigne.some(c => c.visible_journal === false)
              return (
                <tr key={`${debut}-${fin}`}>
                  <td className="relative border border-violet-100 bg-violet-50/70 p-1 text-center text-[0.56rem] text-slate-500 sm:text-[0.68rem]">
                    <div className="font-medium tabular-nums text-slate-700">{debut}</div>
                    <div className="tabular-nums text-slate-400">{fin}</div>
                    <details className="group/options no-print relative mt-0.5">
                      <summary className="mx-auto flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded text-violet-500 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-500"
                        aria-label={`Options de la tranche ${debut} à ${fin}`} title="Options de la tranche">
                        <span aria-hidden="true">•••</span>
                      </summary>
                      <div className="absolute left-0 top-full z-30 mt-1 w-36 rounded-lg border border-violet-200 bg-white p-1.5 text-left shadow-lg">
                        <button type="button" onClick={() => toggleRoutine(ligne)} className="block w-full rounded px-2 py-1 text-left text-[0.68rem] text-violet-700 hover:bg-violet-50">
                          {isRoutine ? 'Remettre en cours' : 'Marquer comme routine'}
                        </button>
                        <button type="button" onClick={() => toggleVisible(ligne)} className="block w-full rounded px-2 py-1 text-left text-[0.68rem] text-violet-700 hover:bg-violet-50">
                          {isMasque ? 'Afficher dans le journal' : 'Masquer dans le journal'}
                        </button>
                        <button type="button" onClick={() => supprimerLigne(ligne)} className="block w-full rounded px-2 py-1 text-left text-[0.68rem] text-red-600 hover:bg-red-50">
                          Supprimer la tranche
                        </button>
                      </div>
                    </details>
                  </td>
                  {cols.map((jour, iJour) => {
                    const etatCase = cases[iLigne][iJour]
                    // Case occupée par une séance commencée plus haut : c'est son
                    // rowSpan qui la remplit, il ne faut émettre aucun <td>.
                    if (etatCase.etat === 'couverte') return null

                    const c = etatCase.etat === 'seance' ? etatCase.creneau : undefined
                    const span = etatCase.etat === 'seance' ? etatCase.span : 1
                    // Les actions portent sur les horaires PROPRES de la séance,
                    // qui ne sont plus ceux de la ligne dès qu'elle en couvre plusieurs.
                    const cDebut = c?.heure_debut ?? debut
                    const cFin = c?.heure_fin ?? fin
                    const cle = cleCase(jour, cDebut, cFin)
                    const ouvert = styleOuvert === cle
                    return (
                      <td key={jour} rowSpan={span > 1 ? span : undefined}
                        className="group relative border border-violet-100 p-1 align-middle break-words hyphens-auto sm:p-1.5"
                        style={{ backgroundColor: (c ? couleurAffichee(c) : null) ?? undefined }}>
                        <div className="relative min-h-8 pr-4 sm:min-h-9 sm:pr-5">
                          <span className={`pointer-events-none block leading-tight ${c ? 'text-slate-900' : 'text-center text-violet-400'}`}
                            style={{
                              color: c?.couleur_texte ?? undefined,
                              fontWeight: c?.texte_gras ? 700 : undefined,
                              fontStyle: c?.texte_italique ? 'italic' : undefined,
                              textDecoration: c?.texte_souligne ? 'underline' : undefined,
                            }}>
                            {c?.matiere || '+'}
                          </span>
                          {c && span > 1 && (
                            <span className="pointer-events-none mt-0.5 block text-[0.52rem] leading-tight text-slate-600/70 sm:text-[0.62rem]">
                              {cDebut} - {cFin}
                            </span>
                          )}
                          <select
                            value={c?.matiere ?? ''}
                            onChange={e => setMatiere(jour, cDebut, cFin, e.target.value)}
                            aria-label={`${LABELS[jour]} ${cDebut}-${cFin}`}
                            title="Changer la matière"
                            className="absolute inset-y-0 left-0 z-10 w-[calc(100%-1rem)] cursor-pointer opacity-0 focus-visible:opacity-100 focus-visible:bg-white focus-visible:text-[0.65rem] sm:w-[calc(100%-1.25rem)]">
                            <option value="">Case vide</option>
                            {Array.from(new Set([...MATIERES, c?.matiere].filter(Boolean) as string[])).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          {c && (
                            <button type="button"
                              onClick={() => setStyleOuvert(ouvert ? null : cle)}
                              aria-expanded={ouvert}
                              title="Mise en forme de la case"
                              aria-label={`Mise en forme ${LABELS[jour]} ${cDebut}`}
                              className={`absolute right-0 top-0 z-20 rounded p-0.5 text-[10px] leading-none transition-opacity focus-visible:outline-2 focus-visible:outline-violet-600 ${
                                ouvert
                                  ? 'bg-violet-200 opacity-100'
                                  : 'opacity-40 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-80'
                              }`}>
                              ✏️
                            </button>
                          )}
                        </div>
                        {c && ouvert && (
                          <div className="absolute right-1 top-full z-40 mt-1 w-44 space-y-1 rounded-lg border border-violet-200 bg-white p-2 shadow-lg">
                            <div className="flex items-center gap-1">
                              <input type="time" value={c.heure_debut}
                                title="Début de la séance" aria-label={`Début ${LABELS[jour]} ${cDebut}`}
                                onChange={e => setHoraireSeance(c, 'heure_debut', e.target.value)}
                                className="w-[4.5rem] border rounded p-0.5 text-[11px] text-gray-900 bg-white" />
                              <input type="time" value={c.heure_fin}
                                title="Fin de la séance" aria-label={`Fin ${LABELS[jour]} ${cDebut}`}
                                onChange={e => setHoraireSeance(c, 'heure_fin', e.target.value)}
                                className="w-[4.5rem] border rounded p-0.5 text-[11px] text-gray-900 bg-white" />
                            </div>
                            <div className="flex items-center gap-1">
                            <input type="color" title="Couleur du fond" aria-label={`Couleur du fond ${LABELS[jour]} ${cDebut}`}
                              value={couleurAffichee(c) ?? '#ffffff'} onChange={e => setCouleur(jour, cDebut, cFin, 'couleur', e.target.value)}
                              className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                            <input type="color" title="Couleur du texte" aria-label={`Couleur du texte ${LABELS[jour]} ${cDebut}`}
                              value={c.couleur_texte ?? '#111827'} onChange={e => setCouleur(jour, cDebut, cFin, 'couleur_texte', e.target.value)}
                              className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                            <button type="button" title="Gras" onClick={() => toggleStyle(jour, cDebut, cFin, 'texte_gras')}
                              className={`text-[11px] leading-none px-1 rounded font-bold ${c.texte_gras ? 'bg-violet-200 text-violet-900' : 'text-gray-600 hover:bg-gray-100'}`}>B</button>
                            <button type="button" title="Italique" onClick={() => toggleStyle(jour, cDebut, cFin, 'texte_italique')}
                              className={`text-[11px] leading-none px-1 rounded italic ${c.texte_italique ? 'bg-violet-200 text-violet-900' : 'text-gray-600 hover:bg-gray-100'}`}>i</button>
                            <button type="button" title="Souligné" onClick={() => toggleStyle(jour, cDebut, cFin, 'texte_souligne')}
                              className={`text-[11px] leading-none px-1 rounded underline ${c.texte_souligne ? 'bg-violet-200 text-violet-900' : 'text-gray-600 hover:bg-gray-100'}`}>U</button>
                            {c.matiere && (
                              <button type="button" title={`Appliquer ce style à toutes les cases « ${c.matiere} »`}
                                onClick={() => appliquerMemeMatiere(c)}
                                className="text-[11px] leading-none px-1 rounded text-violet-600 hover:bg-violet-100">🖌️</button>
                            )}
                            </div>
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
      <button type="button" onClick={ajouterLigne}
        className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600">
        + Ajouter une tranche horaire
      </button>

      <button onClick={() => onSave(creneaux)} disabled={saving}
        className="w-full bg-green-600 text-white rounded-xl p-4 font-semibold hover:bg-green-700 disabled:opacity-50">
        {saving ? 'Enregistrement…' : finishLabel}
      </button>
    </div>
  )
}
