import {
  colonneVersIndex,
  decoderEntites,
  grilleVersTexte,
  htmlVersTexte,
  lireChainesPartagees,
  lireFeuilleXlsx,
} from '../bureautique'

describe('colonneVersIndex', () => {
  test('convertit les references de colonne d un tableur', () => {
    expect(colonneVersIndex('A')).toBe(0)
    expect(colonneVersIndex('B')).toBe(1)
    expect(colonneVersIndex('Z')).toBe(25)
    expect(colonneVersIndex('AA')).toBe(26)
    expect(colonneVersIndex('AB')).toBe(27)
  })
})

describe('decoderEntites', () => {
  test('decode les entites nommees et numeriques', () => {
    expect(decoderEntites('Lecture &amp; ecriture')).toBe('Lecture & ecriture')
    expect(decoderEntites('&lt;tableau&gt;')).toBe('<tableau>')
    expect(decoderEntites('l&apos;eleve')).toBe("l'eleve")
    expect(decoderEntites('&#233;cole')).toBe('école')
    expect(decoderEntites('&#xE9;cole')).toBe('école')
  })

  test('ne double-decode pas une entite echappee', () => {
    expect(decoderEntites('&amp;lt;')).toBe('&lt;')
  })
})

describe('lireChainesPartagees', () => {
  test('lit la table des chaines d un classeur', () => {
    const xml = '<sst><si><t>Lundi</t></si><si><t>Mardi</t></si></sst>'
    expect(lireChainesPartagees(xml)).toEqual(['Lundi', 'Mardi'])
  })

  test('recolle une chaine coupee par une mise en forme', () => {
    // Un seul mot en gras au milieu d une cellule suffit a produire ce XML.
    const xml = '<sst><si><r><t>Chut </t></r><r><t>je lis</t></r></si></sst>'
    expect(lireChainesPartagees(xml)).toEqual(['Chut je lis'])
  })
})

describe('lireFeuilleXlsx', () => {
  const chaines = ['Lundi', 'Mardi', 'Rituels']

  test('place chaque cellule a sa colonne', () => {
    const xml = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
    </sheetData></worksheet>`
    expect(lireFeuilleXlsx(xml, chaines)).toEqual([['Lundi', 'Mardi']])
  })

  test('une cellule vide absente du XML ne decale pas la colonne suivante', () => {
    // Le piege central du format : B1 n existe pas, mais C1 doit rester en 3e
    // position, sinon tout un emploi du temps se decale d une colonne.
    const xml = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>2</v></c></row>
    </sheetData></worksheet>`
    expect(lireFeuilleXlsx(xml, chaines)).toEqual([['Lundi', '', 'Rituels']])
  })

  test('lit les nombres, qui n ont pas d attribut de type', () => {
    const xml = '<worksheet><sheetData><row r="1"><c r="A1"><v>42</v></c></row></sheetData></worksheet>'
    expect(lireFeuilleXlsx(xml, chaines)).toEqual([['42']])
  })

  test('lit une chaine ecrite en clair dans la cellule', () => {
    const xml = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="inlineStr"><is><t>Phonologie</t></is></c></row>
    </sheetData></worksheet>`
    expect(lireFeuilleXlsx(xml, chaines)).toEqual([['Phonologie']])
  })

  test('une ligne absente devient une ligne vide, sans decaler les suivantes', () => {
    const xml = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c></row>
      <row r="3"><c r="A3" t="s"><v>1</v></c></row>
    </sheetData></worksheet>`
    expect(lireFeuilleXlsx(xml, chaines)).toEqual([['Lundi'], [], ['Mardi']])
  })

  test('une feuille vide ne fait pas planter la lecture', () => {
    expect(lireFeuilleXlsx('<worksheet><sheetData/></worksheet>', [])).toEqual([])
  })
})

describe('grilleVersTexte', () => {
  test('rend une ligne par ligne, cellules separees', () => {
    expect(grilleVersTexte([['Lundi', 'Mardi'], ['Rituels', 'Calcul']]))
      .toBe('Lundi | Mardi\nRituels | Calcul')
  })

  test('garde une cellule vide au milieu, coupe celles de la fin', () => {
    // Une case libre au milieu d un emploi du temps est une information ;
    // trois cellules vides en fin de ligne ne sont que des tokens perdus.
    expect(grilleVersTexte([['Lundi', '', 'Jeudi', '', '']]))
      .toBe('Lundi |  | Jeudi')
  })

  test('supprime les lignes entierement vides', () => {
    expect(grilleVersTexte([['Lundi'], ['', ''], ['Mardi']])).toBe('Lundi\nMardi')
  })

  test('normalise les espaces et les retours a la ligne dans une cellule', () => {
    expect(grilleVersTexte([['  Chut\n  je lis  ']])).toBe('Chut je lis')
  })
})

describe('htmlVersTexte', () => {
  test('garde la structure d un tableau Word', () => {
    // C est tout l interet du format Word : le tableau est deja structure,
    // il n y a aucune geometrie a reconstruire comme pour un PDF.
    const html = '<table><tr><td>Semaine 1</td><td>Le son [a]</td></tr>'
      + '<tr><td>Semaine 2</td><td>Le son [i]</td></tr></table>'
    expect(htmlVersTexte(html)).toBe('Semaine 1 | Le son [a]\nSemaine 2 | Le son [i]')
  })

  test('gere les cellules d en-tete au meme titre que les autres', () => {
    const html = '<table><tr><th>Jour</th><th>Matiere</th></tr><tr><td>Lundi</td><td>Maths</td></tr></table>'
    expect(htmlVersTexte(html)).toBe('Jour | Matiere\nLundi | Maths')
  })

  test('rend un paragraphe par ligne', () => {
    expect(htmlVersTexte('<p>Periode 1</p><p>Periode 2</p>')).toBe('Periode 1\nPeriode 2')
  })

  test('melange texte et tableaux en gardant l ordre', () => {
    const html = '<p>Progression</p><table><tr><td>S1</td><td>[a]</td></tr></table><p>Fin</p>'
    expect(htmlVersTexte(html)).toBe('Progression\nS1 | [a]\nFin')
  })

  test('retire les balises de mise en forme sans coller les mots', () => {
    expect(htmlVersTexte('<p>Le son <strong>[a]</strong> et <em>[i]</em></p>'))
      .toBe('Le son [a] et [i]')
  })

  test('decode les entites du texte', () => {
    expect(htmlVersTexte('<p>Lecture &amp; ecriture</p>')).toBe('Lecture & ecriture')
  })

  test('un document vide ne produit rien', () => {
    expect(htmlVersTexte('')).toBe('')
  })
})
