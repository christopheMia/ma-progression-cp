'use client'
import { useEffect, useState } from 'react'
import { Bot, Save, Send } from 'lucide-react'
import type { ProgressionSemaine } from '@/data/manuels'
import Bouton from '@/components/ui/Bouton'
import { extractPdfText } from '@/lib/ia/pdf-client'
import { getPeriodesDisponibles, type PeriodeDispo } from '@/lib/actions/progression-periode'
import { previsualiserProgrammation } from '@/lib/actions/progression-programmation'
import type { PeriodeProgrammation } from '@/lib/repartition-periode'
import type { TypeDocumentImport } from '@/lib/ia/schema-import-auto'

type ChatTurn = { role: 'user' | 'assistant'; content: string }

export default function IaImport({
  prenom,
  matiereFixe,
  onSelect,
  onSave,
}: {
  prenom?: string
  matiereFixe?: string
  onSelect?: (id: string, progression: ProgressionSemaine[]) => void
  /** `periode` n'est renseigne que pour un import "planning de periode" : il
   *  indique sur quelle periode recaler les semaines (sans toucher aux autres). */
  onSave?: (
    matiere: string,
    progression: ProgressionSemaine[],
    periode?: number,
    nomManuel?: string,
  ) => Promise<void> | void
}) {
  const [texte, setTexte] = useState('')
  const [matiere, setMatiere] = useState<string>(matiereFixe ?? '')
  const [progression, setProgression] = useState<ProgressionSemaine[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatTurn[]>([])
  const [message, setMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  // L'enseignante ne choisit plus le format avant l'import : l'IA reconnait le
  // document et le composant n'affiche ensuite que l'option utile.
  const [typeDocument, setTypeDocument] = useState<TypeDocumentImport | null>(null)
  // Nom du manuel importe : sans lui, l'enseignante ne sait plus QUELLE methode
  // elle a importee (retour du 20/07). Prerempli depuis le nom du fichier PDF,
  // qui contient presque toujours le nom de la methode, puis modifiable.
  const [nomManuel, setNomManuel] = useState('')
  // Periodes reelles de la classe (calees sur son calendrier), pour savoir sur
  // quelles semaines recaler un planning importe. L'IA numerote toujours 1..N.
  const [periodes, setPeriodes] = useState<PeriodeDispo[]>([])
  const [periode, setPeriode] = useState<number | null>(null)

  useEffect(() => {
    if (typeDocument !== 'periode' || !onSave || periodes.length) return
    getPeriodesDisponibles().then(liste => {
      setPeriodes(liste)
      setPeriode(p => p ?? liste[0]?.numero ?? null)
    }).catch(() => setPeriodes([]))
  }, [typeDocument, onSave, periodes.length])

  async function lancerImport(form: FormData) {
    form.append('matiere', matiere)
    setError(null); setLoading(true); setProgression(null); setTypeDocument(null)
    try {
      const res = await fetch('/api/ia-manuel', { method: 'POST', body: form })
      const raw = await res.text()
      let data: {
        progression?: ProgressionSemaine[]
        periodes?: PeriodeProgrammation[]
        type_document?: TypeDocumentImport
        error?: string
      } | null = null
      try { data = JSON.parse(raw) } catch { data = null }

      // Une programmation annuelle arrive par periode : c'est le serveur qui
      // l'etale ensuite sur les vraies semaines de la classe, avant l'apercu.
      if (res.ok && data?.type_document === 'programmation' && data.periodes) {
        setTypeDocument('programmation')
        const { semaines, periodesIgnorees } = await previsualiserProgrammation(data.periodes)
        setProgression(semaines)
        const oubli = periodesIgnorees.length
          ? ` Attention : la période ${periodesIgnorees.join(', ')} n'a pas de semaine calée, son contenu n'a pas été placé.`
          : ''
        setChat([{ role: 'assistant', content:
          `J'ai lu ta programmation annuelle et je l'ai répartie sur ${semaines.length} semaines.${oubli} Dis-moi si quelque chose ne va pas 😊` }])
        return
      }

      if (!res.ok || !data || !data.progression || !data.type_document) {
        setError(`Erreur ${res.status} : ${data?.error ?? (raw.slice(0, 150) || 'réponse vide')}`)
      } else {
        setTypeDocument(data.type_document)
        setProgression(data.progression)
        setChat([{ role: 'assistant', content: prenom
          ? `Bonjour ${prenom} ! J'ai préparé ta progression : ${data.progression.length} semaines. Dis-moi si quelque chose ne va pas 😊`
          : `J'ai préparé ta progression : ${data.progression.length} semaines.` }])
      }
    } catch (e) {
      setError(`Erreur réseau : ${e instanceof Error ? e.message : String(e)}`)
    } finally { setLoading(false) }
  }

  async function importPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setError(null); setLoading(true); setProgression(null)
    try {
      const liste = Array.from(files)
      const total = liste.reduce((n, f) => n + f.size, 0)

      // Prerempli le nom de la methode depuis le fichier ("taoki-p1.pdf" ->
      // "Taoki p1"), sans jamais ecraser une saisie de l'utilisatrice.
      if (!nomManuel.trim() && liste[0]) {
        const brut = liste[0].name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
        if (brut) setNomManuel(brut.charAt(0).toUpperCase() + brut.slice(1))
      }

      // Voie HAUTE FIDÉLITÉ : on envoie les PDF tels quels, l'IA lit alors la
      // mise en page (tableaux, lignes, colonnes) et non un texte aplati.
      // Plafond ≈ limite du corps de requête serverless Vercel (~4,5 Mo).
      if (total <= 4 * 1024 * 1024) {
        const form = new FormData()
        for (const file of liste) form.append('pdf', file)
        await lancerImport(form)
        return
      }

      // Repli pour les gros PDF : extraction du texte DANS le navigateur, en
      // conservant la structure des tableaux (colonnes séparées par « | »).
      const textes: string[] = []
      for (const file of liste) {
        textes.push(await extractPdfText(file))
      }
      const combine = textes.join('\n\n--- fichier suivant ---\n\n')
      if (combine.trim().length < 20) {
        setError('Ce PDF ne contient pas de texte sélectionnable (PDF scanné ?). Collez plutôt le sommaire en texte.')
        setLoading(false)
        return
      }
      const form = new FormData(); form.append('texte', combine)
      await lancerImport(form)
    } catch (err) {
      setError(`Lecture du PDF impossible : ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  function importTexte() {
    if (texte.trim().length < 20) { setError('Collez le sommaire (texte un peu plus long).'); return }
    const form = new FormData(); form.append('texte', texte); lancerImport(form)
  }

  async function valider() {
    if (!progression) return
    if (onSave) {
      setSaving(true)
      try {
        await onSave(
          matiere,
          progression,
          typeDocument === 'periode' ? (periode ?? undefined) : undefined,
          nomManuel.trim() || undefined,
        )
      } finally { setSaving(false) }
    } else if (onSelect) {
      onSelect('custom', progression)
    }
  }

  async function envoyerCorrection() {
    const msg = message.trim(); if (!msg || !progression) return
    setMessage(''); setChatLoading(true)
    setChat(c => [...c, { role: 'user', content: msg }])
    try {
      const res = await fetch('/api/ia-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progression, message: msg, prenom, historique: chat }),
      })
      const data = await res.json()
      if (!res.ok) setChat(c => [...c, { role: 'assistant', content: data.error ?? 'Erreur' }])
      else { setProgression(data.progression); setChat(c => [...c, { role: 'assistant', content: data.reponse }]) }
    } catch { setChat(c => [...c, { role: 'assistant', content: 'Erreur réseau.' }]) }
    finally { setChatLoading(false) }
  }

  const totalNotions = progression?.reduce((n, s) => n + s.items.length, 0) ?? 0
  const labelTypeDocument: Record<TypeDocumentImport, string> = {
    manuel: 'manuel ou sommaire',
    periode: 'planning de période',
    programmation: 'programmation annuelle',
  }
  const periodeRequise = Boolean(onSave && typeDocument === 'periode' && !periode)

  return (
    <div className="space-y-4">
      {!progression && (
        <div className="space-y-3">
          {!matiereFixe && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quelle matière importes-tu ?</label>
              <input
                value={matiere}
                onChange={e => setMatiere(e.target.value)}
                disabled={loading}
                placeholder="Ex : Anglais, EMC, Sciences…"
                className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </div>
          )}
          <div>
            <label htmlFor="nom-methode" className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la méthode
            </label>
            <input
              id="nom-methode"
              value={nomManuel}
              onChange={e => setNomManuel(e.target.value)}
              disabled={loading}
              placeholder="Ex : Taoki, Pilotis, Méthode de Singapour…"
              className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              Il s&apos;affichera partout dans l&apos;appli pour que tu saches toujours d&apos;où vient ta progression.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Dépose ton manuel, son sommaire, un planning de période ou une programmation annuelle.
            L&apos;IA reconnaît le document et prépare automatiquement la bonne progression.
          </p>
          <input type="file" accept=".pdf" multiple onChange={importPdf} disabled={loading}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-violet-700 hover:file:bg-violet-100 file:cursor-pointer disabled:opacity-50" />
          <p className="text-xs text-gray-500">
            Tu peux déposer plusieurs PDF (ex : les pages de programmation). Inutile d&apos;envoyer le manuel entier.
            L&apos;IA lit maintenant les <strong>tableaux</strong> en respectant les lignes et les colonnes.
          </p>
          <textarea value={texte} onChange={e => setTexte(e.target.value)} disabled={loading}
            placeholder="…ou colle ici le texte du document"
            className="w-full h-28 border-2 border-slate-300 rounded-lg p-3 text-sm text-gray-900 bg-white shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          <Bouton type="button" variant="principal" icon={Bot} loading={loading}
            className="w-full" onClick={importTexte}>
            Analyser avec l&apos;IA
          </Bouton>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {progression && (
        <div className="space-y-4">
          <p className="text-sm text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
            {progression.length} semaines · {totalNotions} éléments répartis{matiere ? ` (${matiere})` : ''}
          </p>

          {typeDocument && (
            <p className="text-sm text-slate-700">
              Document reconnu : <strong>{labelTypeDocument[typeDocument]}</strong>
            </p>
          )}

          {typeDocument === 'periode' && onSave && (
            periodes.length > 0 ? (
              <div>
                <label htmlFor="choix-periode" className="block text-sm font-medium text-gray-700 mb-1">
                  Sur quelle période veux-tu placer ce planning ?
                </label>
                <select id="choix-periode" value={periode ?? ''} disabled={saving}
                  onChange={e => setPeriode(Number(e.target.value))}
                  className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  {periodes.map(p => (
                    <option key={p.numero} value={p.numero}>
                      {p.nom}, semaines {p.premiereSemaine} à {p.premiereSemaine + p.nbSemaines - 1}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Les autres périodes ne seront pas modifiées.
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Ce planning ne peut pas encore être enregistré : tes semaines ne sont rattachées à aucune période.
                Utilise « Caler sur le calendrier » dans les paramètres, puis relance l&apos;import.
              </p>
            )
          )}

          {/* Tableau éditable */}
          <div className="max-h-72 overflow-y-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 sticky top-0">
                <tr className="text-left text-violet-800">
                  <th className="px-2 py-1 w-12">Sem.</th><th className="px-2 py-1">Éléments</th>
                  <th className="px-2 py-1">Pages</th><th className="px-2 py-1">Mots</th>
                </tr>
              </thead>
              <tbody>
                {progression.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1 text-gray-500">{s.numero}</td>
                    <td className="px-2 py-1">
                      <input value={s.items.join(' ')} onChange={e => {
                        const v = e.target.value.split(/\s+/).filter(Boolean)
                        setProgression(p => p!.map((x, j) => j === i ? { ...x, items: v } : x))
                      }} className="w-full bg-white text-gray-900 rounded px-1.5 py-1 border border-slate-300 outline-none focus:border-violet-500" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={s.pages} onChange={e =>
                        setProgression(p => p!.map((x, j) => j === i ? { ...x, pages: e.target.value } : x))
                      } className="w-full bg-white text-gray-900 rounded px-1.5 py-1 border border-slate-300 outline-none focus:border-violet-500" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={s.mots_exemple.join(' ')} onChange={e => {
                        const v = e.target.value.split(/\s+/).filter(Boolean)
                        setProgression(p => p!.map((x, j) => j === i ? { ...x, mots_exemple: v } : x))
                      }} className="w-full bg-white text-gray-900 rounded px-1.5 py-1 border border-slate-300 outline-none focus:border-violet-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Boîte de dialogue */}
          <div className="border-2 border-violet-200 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 py-2 text-sm font-semibold">
              💜 Votre assistant progression
            </div>
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto bg-violet-50/40">
              {chat.map((t, i) => (
                <div key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
                  <span className={`inline-block rounded-2xl px-3 py-1.5 text-sm ${
                    t.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white border text-gray-800'}`}>
                    {t.role === 'assistant' && '🤖 '}{t.content}
                  </span>
                </div>
              ))}
              {chatLoading && <p className="text-xs text-violet-700">✍️ l’assistant réfléchit…</p>}
            </div>
            <div className="flex gap-2 p-2 border-t bg-white">
              <input value={message} onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && envoyerCorrection()}
                placeholder="Écrivez votre correction ici…"
                className="flex-1 border-2 border-slate-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              <Bouton type="button" variant="secondaire" size="sm" icon={Send}
                loading={chatLoading} aria-label="Envoyer la correction"
                onClick={envoyerCorrection} />
            </div>
          </div>

          <Bouton type="button" variant="principal" icon={Save} loading={saving}
            disabled={periodeRequise} className="w-full" onClick={valider}>
            {onSave ? 'Enregistrer cette méthode' : 'Utiliser cette progression'}
          </Bouton>
        </div>
      )}
    </div>
  )
}
