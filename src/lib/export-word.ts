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
        makeCell('Horaire', true),
        makeCell('Matière', true),
        makeCell('Objectif', true),
        makeCell('Activité', true),
        makeCell('Matériel', true),
      ],
      tableHeader: true,
    })

    const dataRows = jour.seances.map(
      seance =>
        new TableRow({
          children: [
            makeCell(`${seance.heure_debut}–${seance.heure_fin}`),
            makeCell(seance.matiere),
            makeCell(seance.objectif),
            makeCell(seance.activite),
            makeCell(seance.materiel),
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

/** Export Word du suivi des élèves (graphèmes acquis + bilan + commentaire). */
export async function exporterSuiviWord(opts: {
  numeroSemaine: number
  graphemes: string[]
  lignes: Array<{ prenom: string; acquis: boolean[]; progres: string; bilan: string; commentaire: string }>
}): Promise<void> {
  const { numeroSemaine, graphemes, lignes } = opts

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeCell('Élève', true),
      ...graphemes.map(g => makeCell(`"${g}"`, true)),
      makeCell('Progrès', true),
      makeCell('Bilan', true),
      makeCell('Commentaire', true),
    ],
  })

  const dataRows = lignes.map(l =>
    new TableRow({
      children: [
        makeCell(l.prenom, true),
        ...l.acquis.map(a => makeCell(a ? '✓' : '–')),
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
