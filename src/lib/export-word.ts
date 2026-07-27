import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
} from 'docx'
import { saveAs } from 'file-saver'
import { JourJournal } from '@/types'
import { heureSansSecondes } from '@/lib/horaires'

function makeBorder() {
  return { style: BorderStyle.SINGLE, size: 1, color: '999999' }
}

function makeCell(text: string, bold = false): TableCell {
  return new TableCell({
    borders: {
      top: makeBorder(),
      bottom: makeBorder(),
      left: makeBorder(),
      right: makeBorder(),
    },
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20 })] })],
  })
}

/** Génère le document Word en mémoire (Blob .docx), réutilisable pour le téléchargement ou l'envoi vers Google Docs. */
export async function genererBlobWord(journal: JourJournal[], numeroSemaine: number): Promise<Blob> {
  const sections: (Paragraph | Table)[] = [
    new Paragraph({
      text: `Cahier journal — Semaine ${numeroSemaine}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ]

  for (const jour of journal) {
    sections.push(
      new Paragraph({
        text: jour.jour.charAt(0).toUpperCase() + jour.jour.slice(1),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    )

    const headerRow = new TableRow({
      children: [
        makeCell('Horaires', true),
        makeCell('Matière', true),
        makeCell('Déroulement', true),
      ],
      tableHeader: true,
    })

    const dataRows = jour.seances.map(
      seance =>
        new TableRow({
          children: [
            makeCell(
              `${heureSansSecondes(seance.heure_debut)} à ${heureSansSecondes(seance.heure_fin)}`,
            ),
            makeCell(seance.matiere),
            makeCell(seance.type === 'routine' ? '' : seance.deroulement),
          ],
        })
    )

    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
      })
    )
  }

  const doc = new Document({
    sections: [{ children: sections }],
  })

  return Packer.toBlob(doc)
}

export async function exporterJournalWord(journal: JourJournal[], numeroSemaine: number): Promise<void> {
  const blob = await genererBlobWord(journal, numeroSemaine)
  saveAs(blob, `cahier-journal-semaine-${numeroSemaine}.docx`)
}

/** Export Word du suivi des élèves, avec les observations et le bilan. */
export async function exporterSuiviWord(opts: {
  numeroSemaine: number
  observations: string[]
  lignes: Array<{
    prenom: string
    /** Le niveau abrégé (NA, PA, A, D), ou null quand rien n'est renseigné. */
    niveaux: Array<string | null>
    progres: string
    bilan: string
    commentaire: string
  }>
}): Promise<void> {
  const { numeroSemaine, observations, lignes } = opts

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeCell('Élève', true),
      ...observations.map(observation => makeCell(observation, true)),
      makeCell('Progrès', true),
      makeCell('Bilan', true),
      makeCell('Commentaire', true),
    ],
  })

  const dataRows = lignes.map(l =>
    new TableRow({
      children: [
        makeCell(l.prenom, true),
        ...l.niveaux.map(niveau => makeCell(niveau ?? '')),
        makeCell(l.progres),
        makeCell(l.bilan),
        makeCell(l.commentaire),
      ],
    })
  )

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: `Suivi des élèves — Semaine ${numeroSemaine}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `suivi-eleves-semaine-${numeroSemaine}.docx`)
}
