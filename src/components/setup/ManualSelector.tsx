'use client'
import { useState, useRef } from 'react'
import { MANUELS } from '@/data/manuels'
import type { ProgressionSemaine } from '@/data/manuels'

function generateCsvTemplate(): string {
  const header = 'semaine;graphemes;pages;mots_exemple'
  const rows = Array.from({ length: 36 }, (_, i) => `${i + 1};;;`)
  return '﻿' + [header, ...rows].join('\n')
}

function parseCsv(text: string): ProgressionSemaine[] | null {
  const clean = text.replace(/^﻿/, '')
  const lines = clean.trim().split(/\r?\n/)
  if (lines.length < 2) return null

  const sep = lines[0].includes(';') ? ';' : ','
  const result: ProgressionSemaine[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep)
    const semaine = parseInt(cols[0])
    if (isNaN(semaine)) continue
    result.push({
      numero: semaine,
      graphemes: cols[1]?.trim() ? cols[1].trim().split(/\s+/).filter(Boolean) : [],
      pages: cols[2]?.trim() ?? '',
      mots_exemple: cols[3]?.trim() ? cols[3].trim().split(/\s+/).filter(Boolean) : [],
    })
  }

  result.sort((a, b) => a.numero - b.numero)
  return Array.from({ length: 36 }, (_, i) =>
    result.find(s => s.numero === i + 1) ?? { numero: i + 1, graphemes: [], pages: '', mots_exemple: [] }
  )
}

type PdfResult = {
  progression: ProgressionSemaine[]
  filledWeeks: number
  textPreview: string
}

export default function ManualSelector({
  onSelect,
}: {
  onSelect: (id: string, customProgression?: ProgressionSemaine[]) => void
}) {
  const [showImport, setShowImport] = useState(false)
  const [importMode, setImportMode] = useState<'pdf' | 'csv'>('pdf')
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ProgressionSemaine[] | null>(null)
  const [pdfResult, setPdfResult] = useState<PdfResult | null>(null)
  const [loading, setLoading] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    const csv = generateCsvTemplate()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'modele-progression.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = parseCsv(ev.target?.result as string)
      if (!result || result.every(s => s.graphemes.length === 0)) {
        setError('Fichier invalide ou vide. Vérifiez le format.')
        setParsed(null)
      } else {
        setError(null)
        setParsed(result)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handlePdfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setPdfResult(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await fetch('/api/parse-manuel-pdf', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la lecture du PDF')
      } else {
        setPdfResult(data as PdfResult)
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  function resetImport() {
    setShowImport(false); setError(null); setParsed(null); setPdfResult(null); setLoading(false)
    if (csvRef.current) csvRef.current.value = ''
    if (pdfRef.current) pdfRef.current.value = ''
  }

  function switchMode(mode: 'pdf' | 'csv') {
    setImportMode(mode); setError(null); setParsed(null); setPdfResult(null)
    if (csvRef.current) csvRef.current.value = ''
    if (pdfRef.current) pdfRef.current.value = ''
  }

  const csvFilledWeeks = parsed?.filter(s => s.graphemes.length > 0).length ?? 0

  return (
    <div className="space-y-4">
      <p className="text-gray-600">Quel manuel de lecture utilisez-vous cette année ?</p>
      <div className="grid gap-3">
        {MANUELS.map(manuel => (
          <button key={manuel.id} onClick={() => onSelect(manuel.id)}
            className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
            <div>
              <div className="font-semibold text-gray-800">{manuel.nom}</div>
              <div className="text-sm text-gray-500">{manuel.editeur}</div>
            </div>
            <span className="text-blue-500">→</span>
          </button>
        ))}
      </div>

      <div className="border-t pt-4">
        {!showImport ? (
          <button onClick={() => setShowImport(true)}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors text-left">
            <div className="font-semibold text-gray-700">Mon manuel n'est pas dans la liste</div>
            <div className="text-sm text-gray-500">Importer ma progression (PDF ou CSV)</div>
          </button>
        ) : (
          <div className="border-2 border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50">
            <div className="font-semibold text-gray-800">Importer votre progression</div>

            {/* Sélecteur de mode */}
            <div className="flex gap-2">
              {(['pdf', 'csv'] as const).map(mode => (
                <button key={mode} onClick={() => switchMode(mode)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                    importMode === mode
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}>
                  {mode === 'pdf' ? 'PDF (manuel numérique)' : 'CSV (tableur)'}
                </button>
              ))}
            </div>

            {/* Mode PDF */}
            {importMode === 'pdf' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Importez le PDF numérique de votre manuel. La progression est détectée automatiquement.
                </p>
                <p className="text-xs text-gray-500">
                  Fonctionne uniquement avec les PDF numériques (texte sélectionnable), pas les PDF scannés.
                </p>
                <input
                  ref={pdfRef} type="file" accept=".pdf"
                  onChange={handlePdfFile} disabled={loading}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer disabled:opacity-50"
                />
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    Extraction du texte en cours…
                  </div>
                )}
                {pdfResult && pdfResult.filledWeeks > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-green-700 bg-green-50 rounded-lg p-2">
                      ✓ {pdfResult.filledWeeks} semaine{pdfResult.filledWeeks > 1 ? 's' : ''} détectée{pdfResult.filledWeeks > 1 ? 's' : ''}
                    </div>
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                      ⚠ La détection automatique est approximative. Vérifiez la progression dans le planning avant de l'utiliser en classe.
                    </p>
                    <button
                      onClick={() => onSelect('custom', pdfResult.progression)}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                      Utiliser cette progression →
                    </button>
                  </div>
                )}
                {pdfResult && pdfResult.filledWeeks === 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600">
                      Aucune semaine détectée dans ce PDF. Le format de ce manuel n'est pas reconnu automatiquement.
                    </p>
                    {pdfResult.textPreview && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Texte extrait (aperçu) :</p>
                        <pre className="text-xs bg-white border rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-gray-700">
                          {pdfResult.textPreview}
                        </pre>
                      </div>
                    )}
                    <p className="text-xs text-gray-600">
                      Utilisez le modèle CSV en cliquant sur l'onglet <strong>CSV (tableur)</strong> ci-dessus pour saisir la progression manuellement.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Mode CSV */}
            {importMode === 'csv' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Téléchargez le modèle, remplissez-le avec les graphèmes de votre manuel, puis importez-le.
                </p>
                <p className="text-xs text-gray-500">
                  Colonne <strong>graphemes</strong> : séparés par des espaces (ex : <code>an am en em</code>)<br />
                  Colonne <strong>mots_exemple</strong> : séparés par des espaces (ex : <code>enfant dent</code>)
                </p>
                <button onClick={downloadTemplate}
                  className="text-sm text-blue-600 underline hover:text-blue-800">
                  ↓ Télécharger le modèle CSV
                </button>
                <input
                  ref={csvRef} type="file" accept=".csv,.txt"
                  onChange={handleCsvFile}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
                />
                {csvFilledWeeks > 0 && (
                  <>
                    <div className="text-sm text-green-700 bg-green-50 rounded-lg p-2">
                      ✓ {csvFilledWeeks} semaine{csvFilledWeeks > 1 ? 's' : ''} importée{csvFilledWeeks > 1 ? 's' : ''}
                    </div>
                    <button
                      onClick={() => onSelect('custom', parsed!)}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                      Utiliser cette progression →
                    </button>
                  </>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button onClick={resetImport} className="text-sm text-gray-500 hover:text-gray-700">
              ← Retour
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
