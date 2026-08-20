# Graph Report - ma-progression-cp  (2026-08-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2958 nodes · 5672 edges · 192 communities (143 shown, 49 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1c22245`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 67
- Community 68
- Community 69
- Community 70
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 85
- Community 87
- Community 88
- Community 89
- Community 90
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 194
- Community 196
- Community 197

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 63 edges
2. `TabApi` - 34 edges
3. `Bouton` - 34 edges
4. `BackgroundV1` - 31 edges
5. `BackgroundV4` - 29 edges
6. `Resultat` - 29 edges
7. `BackgroundV3` - 28 edges
8. `BackgroundV2` - 28 edges
9. `TimetableGrid()` - 23 edges
10. `corrigerPrioriteMatin()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `ResultatMaterialisation` --references--> `ProgressionSemaine`  [EXTRACTED]
  src/lib/progression-sources.ts → src/data/manuels/index.ts
- `generer()` --calls--> `genererOuChargerJournal()`  [EXTRACTED]
  src/components/semaine/CahierJournalEditor.tsx → src/lib/actions/journal.ts
- `SemainePage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(app)/semaine/[id]/page.tsx → src/lib/supabase/server.ts
- `updateNote()` --calls--> `createClient()`  [EXTRACTED]
  src/lib/actions/semaine.ts → src/lib/supabase/server.ts
- `valider()` --calls--> `updateEmploiDuTemps()`  [EXTRACTED]
  src/components/parametres/ImporterEdtButton.tsx → src/lib/actions/parametres.ts

## Import Cycles
- None detected.

## Communities (192 total, 49 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (30): calculatePadding(), callbackForWiringEventsAndInjectingOurCssStylesOnWebPageWindows(), computeStyleTests(), Context(), contextMenuSuppressor(), default(), define(), defineIteratorMethods() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (30): calculatePadding(), callbackForWiringEventsAndInjectingOurCssStylesOnWebPageWindows(), computeStyleTests(), Context(), contextMenuSuppressor(), default(), define(), defineIteratorMethods() (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (21): borders(), callbackForWiringEventsAndInjectingOurCssStylesOnWebPageWindows(), computeStyleTests(), Context(), contextMenuSuppressor(), define(), defineIteratorMethods(), dimensions() (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (20): calculatePadding(), callbackForWiringEventsAndInjectingOurCssStylesOnWebPageWindows(), computeStyleTests(), Context(), contextMenuSuppressor(), define(), defineIteratorMethods(), expectSync() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (20): calculatePadding(), callbackForWiringEventsAndInjectingOurCssStylesOnWebPageWindows(), computeStyleTests(), Context(), contextMenuSuppressor(), define(), defineIteratorMethods(), expectSync() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (43): AccueilPage(), PlanningPage(), CahierJournalCard(), SemaineLien, ICONES, OutilIa, OutilsIaSection(), BudgetIaIndicator() (+35 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (40): calculateOrdinalPositionAmongSameTagSiblings(), collectAllFramesAndSubFramesToArray(), elementIsVisibleByCssSelector(), ExtractInnerText(), extractTextFromOuterHtml(), generateCssSelectorString(), getAttributeSetAll(), getAttributeValue() (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (39): calculateOrdinalPositionAmongSameTagSiblings(), collectAllFramesAndSubFramesToArray(), elementIsVisibleByCssSelector(), ExtractInnerText(), extractTextFromOuterHtml(), generateCssSelectorString(), getAttributeSetAll(), getAttributeValue() (+31 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (29): ajouter(), refresh, source, CreneauInfo, LIBELLES_TYPE, Message, MethodesEditor(), ajouter() (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (28): chaines(), estRole(), maxDuration, POST(), TourConversation, toursValides(), maxDuration, POST() (+20 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (28): edtDepuisQuotas(), GRILLE_VIDE, SetupPage(), handleFinish(), mockSourcesPage, TRAME_INITIALE, versCreneaux(), WizardData (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.05
Nodes (61): BlocMatiere(), rediger(), ChampFormulation(), FORMULATION_VIDE, cleAppreciation(), clePosition(), CompetenceBilan, Eleve (+53 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (22): EdtExplicationModal(), Bloc, budgetHebdomadaire(), CADRE, choisirDuree(), DUREE_MIN_SEANCE, dureeMaxSeance(), ExplicationEdt (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (33): aDuContenu(), AnalyseAjoutSource, calculerEmpreinteSource(), canonicaliser(), comparerChaineBinaire(), comparerSources(), copierSemaine(), estDateIso() (+25 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (15): CommunicatorToNativeHost, connect(), Frame, fulfilled(), initializeConnectedPort(), NegotiationFailedError, onConnect(), onDisconnect() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (32): calculateOrdinalPositionAmongSameTagSiblings(), collectAllFramesAndSubFramesToArray(), elementIsVisibleByCssSelector(), ExtractInnerText(), extractTextFromOuterHtml(), getAttributeValue(), getChildrenArray(), getElement() (+24 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (32): calculateOrdinalPositionAmongSameTagSiblings(), collectAllFramesAndSubFramesToArray(), elementIsVisibleByCssSelector(), ExtractInnerText(), extractTextFromOuterHtml(), getAttributeValue(), getChildrenArray(), getElement() (+24 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (21): CompetencesPage(), LABEL_MATIERE, AppLayout(), LivretPage(), HomePage(), ProgrammePage(), Competence, LIBELLE_MATIERE (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.06
Nodes (47): SemainePage(), AncreAuChargement(), AncreMemorisee, consommer(), MemoireAncre(), surClic(), memoriser(), reinitialiserPourTests() (+39 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (28): calculateOrdinalPositionAmongSameTagSiblings(), elementIsVisibleByCssSelector(), ensureVisible(), ExtractInnerText(), getAttributeValue(), getChildrenArray(), getCrossFrameSizzleCssSelectorForElementAsString(), getElement() (+20 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (28): BandeauCalage(), BandeauCalageProps, enumerer(), PHRASES, CALAGE, RentreeEditor(), enregistrer(), RentreeDatePicker() (+20 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (28): background, service_worker, content_security_policy, extension_pages, default_locale, description, host_permissions, icons (+20 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (11): CommunicatorToBackgroundScript, connect(), fulfilled(), initializeConnectedPort(), Logger, onConnect(), onDisconnect(), onMessageReceived() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (11): CommunicatorToBackgroundScript, connect(), fulfilled(), initializeConnectedPort(), Logger, onConnect(), onDisconnect(), onMessageReceived() (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (17): AssistantFlottant(), replacer(), suivreGlissement(), Onglet, AMORCES, ChatAssistant(), ChatAssistantProps, TourConversation (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.08
Nodes (26): adoptValue(), Animation(), boxModelAdjustment(), buildFragment(), buildParams(), camelCase(), cloneCopyEvent(), createFxNow() (+18 more)

### Community 30 - "Community 30"
Cohesion: 0.17
Nodes (17): ImporterEdtButton(), analyser(), valider(), mockExtraire, REPONSE_EDT, estFormatAncien(), extraireTexteBureautique(), extraireTexteDocx() (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (34): ParametresPage(), EmploiDuTempsGrille(), recharger(), GenererEdtButton(), run(), PrenomEnseignantEditor(), enregistrer(), RealignerSemainesButton() (+26 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (24): DemoButton(), lancer(), ChatTurn, MANUELS, ProgressionManuel, ProgressionSemaine, LECTURE_PIANO, chargerClasseDemo() (+16 more)

### Community 33 - "Community 33"
Cohesion: 0.12
Nodes (19): deroulementInitial(), genererCahierJournal(), itemsDuJour(), JOURS_ORDRE, numeroJourItem(), progressionPourCreneau(), LUNDI, PROGRESSION (+11 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (5): error(), ExtractionResult, extractRecordsImpl(), hideOrShowParentElementForDesignTime(), Logger

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (16): computeFrameTotalOffsetRelativeToTopLevelWindowOfBrowser(), elementContainsTextEditorKeywords(), getAncestorList(), getArrayWithFrameSubSelectors(), getAttributesValues(), getElementFromPoint(), getExtendedTagOfTargetElementByjQueryElement(), getFocusedElement() (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.13
Nodes (15): COURTS, CreneauLecture, EdtGrilleLecture(), JOURS, LABELS, CreneauApercu, EdtApercu(), CaseGrille (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (21): @anthropic-ai/sdk, date-fns, docx, mammoth, next, dependencies, @anthropic-ai/sdk, date-fns (+13 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (14): computeFrameTotalOffsetRelativeToTopLevelWindowOfBrowser(), elementContainsTextEditorKeywords(), extractRecords(), getAncestorList(), getAttributesValues(), getExtendedTagOfTargetElementByjQueryElement(), getHtmlTableContentsAs2Darray(), getJElementFromDomContext() (+6 more)

### Community 42 - "Community 42"
Cohesion: 0.11
Nodes (14): computeFrameTotalOffsetRelativeToTopLevelWindowOfBrowser(), elementContainsTextEditorKeywords(), extractRecords(), getAncestorList(), getAttributesValues(), getExtendedTagOfTargetElementByjQueryElement(), getHtmlTableContentsAs2Darray(), getJElementFromDomContext() (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.11
Nodes (14): computeFrameTotalOffsetRelativeToTopLevelWindowOfBrowser(), elementContainsTextEditorKeywords(), getAncestorList(), getAncestorsOfElement(), getAttributesValues(), getExtendedTagOfTargetElementByjQueryElement(), getHtmlTableContentsAs2Darray(), getJElementFromDomContext() (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (14): computeFrameTotalOffsetRelativeToTopLevelWindowOfBrowser(), elementContainsTextEditorKeywords(), getAncestorList(), getAncestorsOfElement(), getAttributesValues(), getExtendedTagOfTargetElementByjQueryElement(), getHtmlTableContentsAs2Darray(), getJElementFromDomContext() (+6 more)

### Community 45 - "Community 45"
Cohesion: 0.10
Nodes (21): jest, jest-environment-jsdom, devDependencies, jest, jest-environment-jsdom, @tailwindcss/postcss, @testing-library/react, @types/jest (+13 more)

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (15): chaineNormalisee(), confianceNormalisee(), maxDuration, normaliserMetaImport(), AUTO_IMPORT_JSON_SCHEMA, AvertissementImport, avertissementsImport(), BaseCalageImport (+7 more)

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (17): enregistrer(), corrigerPrioriteMatin(), CreneauPrioriteMatin, DeplacementMatin, duree(), echangerPlacements(), estLeMatin(), estTempsFixe() (+9 more)

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (5): error(), ExtractionResult, extractRecordsImpl(), hideOrShowParentElementForDesignTime(), Logger

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (18): extractTextFromHtml(), HTML2Numerical(), htmlDecode(), htmlEncode(), normalizeAutomationTextString(), numEncode(), NumericalToHTML(), registerAttrMatchesCaseInsensitively() (+10 more)

### Community 52 - "Community 52"
Cohesion: 0.11
Nodes (18): extractTextFromHtml(), HTML2Numerical(), htmlDecode(), htmlEncode(), normalizeAutomationTextString(), numEncode(), NumericalToHTML(), registerAttrMatchesCaseInsensitively() (+10 more)

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (17): construireSemainesParPeriode(), estObjet(), executerAjoutSourceProgression(), executerRetraitSourceProgression(), MethodeSourceOperation, MethodeSourcesDependances, ParametresAjoutSource, ParametresRetraitSource (+9 more)

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (18): boxModelAdjustment(), buildFragment(), buildParams(), cloneCopyEvent(), curCSS(), disableScript(), DOMEval(), domManip() (+10 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (18): boxModelAdjustment(), buildFragment(), buildParams(), cloneCopyEvent(), curCSS(), disableScript(), DOMEval(), domManip() (+10 more)

### Community 56 - "Community 56"
Cohesion: 0.12
Nodes (18): boxModelAdjustment(), buildFragment(), buildParams(), cloneCopyEvent(), curCSS(), disableScript(), DOMEval(), domManip() (+10 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (26): aContenuPeriodes(), aContenuSemaines(), AnalyseSource, chaine(), estNumeroPeriode(), estObjet(), estTypeDocument(), explicationsValidation() (+18 more)

### Community 59 - "Community 59"
Cohesion: 0.13
Nodes (17): boxModelAdjustment(), buildFragment(), buildParams(), cloneCopyEvent(), curCSS(), disableScript(), DOMEval(), domManip() (+9 more)

### Community 60 - "Community 60"
Cohesion: 0.24
Nodes (16): idc(), TimetableGrid(), ajouterLigne(), annuler(), appliquerMemeMatiere(), compterMemeMatiere(), modifier(), onKey() (+8 more)

### Community 61 - "Community 61"
Cohesion: 0.13
Nodes (11): actualFireEventAndIfApplicableHighlightElementAndEmulateKeystroke(), applyAnchorWorkaround(), elementNotFoundReply(), emulateEventFiringWithGivenJQuery(), focus(), getCrossFrameJqueryElementParent(), getElementRectangleInfo(), Json (+3 more)

### Community 62 - "Community 62"
Cohesion: 0.17
Nodes (12): analyserAvecCalage(), analyserTexte(), mockCalculerEmpreinte, mockExtractPdfText, mockExtraireBureautique, REPONSE_MANUEL, reponseJson(), assemblerLigne() (+4 more)

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (11): LABELS, libelleMatiere(), PeriodesPage(), PrintButton(), imprimerElement(), imprimerPage(), agregerParPeriode(), BlocPeriode (+3 more)

### Community 64 - "Community 64"
Cohesion: 0.07
Nodes (22): CarteC(), ConnexionPage(), handleSubmit(), InscriptionPage(), handleSubmit(), HeaderNav(), LINKS, LogoutButton() (+14 more)

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (12): detailType(), LABEL_TYPE, nombreDocuments(), ProgressionsSetup(), ajouterSource(), ProgressionsSetupProps, mockSourceGenerale, mockSourceMaths (+4 more)

### Community 67 - "Community 67"
Cohesion: 0.24
Nodes (13): enregistrerUsageIA(), moisCourant(), SoldeIA, coutUsd(), entier(), LigneCout, sommeCoutDepuis(), tarif() (+5 more)

### Community 68 - "Community 68"
Cohesion: 0.17
Nodes (4): checkScriptVersion(), ExtractionResult, Logger, onMessageReceived()

### Community 69 - "Community 69"
Cohesion: 0.15
Nodes (15): AsyncIterator(), callInvokeWithMethodAndArg(), invoke(), doneResult(), fulfilled(), Identity(), makeInvokeMethod(), maybeInvokeDelegate() (+7 more)

### Community 70 - "Community 70"
Cohesion: 0.15
Nodes (15): AsyncIterator(), callInvokeWithMethodAndArg(), invoke(), doneResult(), fulfilled(), Identity(), makeInvokeMethod(), maybeInvokeDelegate() (+7 more)

### Community 72 - "Community 72"
Cohesion: 0.23
Nodes (12): couleurAffichee(), couleurMatiere(), COULEURS_FAMILLE, CreneauTrame, Famille, familleMatiere(), JOURS_TRAME, LIGNES (+4 more)

### Community 73 - "Community 73"
Cohesion: 0.35
Nodes (9): ajouterCritereObservation(), definirNiveauCritere(), modifierCritereObservation(), semaineAutorisee(), supprimerCritereObservation(), utilisateurConnecte(), cleObservation(), normaliserLibelleCritere() (+1 more)

### Community 74 - "Community 74"
Cohesion: 0.15
Nodes (18): libelleSemaine(), lignes(), MOIS, premierNumeroDisponible(), semaineEstVide(), SourceContentPreview(), SourceContentPreviewProps, classeCourante() (+10 more)

### Community 75 - "Community 75"
Cohesion: 0.17
Nodes (8): actualFireEventAndIfApplicableHighlightElementAndEmulateKeystroke(), applyAnchorWorkaround(), emulateEventFiringWithGivenJQuery(), focus(), getElementRectangleInfo(), Json, trace(), triggerNativeEvent()

### Community 76 - "Community 76"
Cohesion: 0.17
Nodes (8): actualFireEventAndIfApplicableHighlightElementAndEmulateKeystroke(), applyAnchorWorkaround(), emulateEventFiringWithGivenJQuery(), focus(), getElementRectangleInfo(), Json, trace(), triggerNativeEvent()

### Community 77 - "Community 77"
Cohesion: 0.17
Nodes (8): actualFireEventAndIfApplicableHighlightElementAndEmulateKeystroke(), applyAnchorWorkaround(), emulateEventFiringWithGivenJQuery(), focus(), getElementRectangleInfo(), Json, trace(), triggerNativeEvent()

### Community 78 - "Community 78"
Cohesion: 0.37
Nodes (9): AdresseSeance, journal, contexteJournal(), genererOuChargerJournal(), lireJournal(), regenererJournal(), sauvegarderJournal(), validerContenuJournal() (+1 more)

### Community 79 - "Community 79"
Cohesion: 0.27
Nodes (10): GoogleDocsButton(), ouvrir(), initTokenClient(), Window, exporterJournalWord(), exporterSuiviWord(), genererBlobWord(), makeBorder() (+2 more)

### Community 80 - "Community 80"
Cohesion: 0.17
Nodes (8): CAS_11H, addMinutes(), Creneau, CreneauMin, JOURS, LABELS, LABELS_COURTS, MATIERES

### Community 81 - "Community 81"
Cohesion: 0.20
Nodes (12): AsyncIterator(), callInvokeWithMethodAndArg(), invoke(), doneResult(), Identity(), makeInvokeMethod(), maybeInvokeDelegate(), resolve() (+4 more)

### Community 82 - "Community 82"
Cohesion: 0.20
Nodes (12): AsyncIterator(), callInvokeWithMethodAndArg(), invoke(), doneResult(), Identity(), makeInvokeMethod(), maybeInvokeDelegate(), resolve() (+4 more)

### Community 83 - "Community 83"
Cohesion: 0.20
Nodes (12): AsyncIterator(), callInvokeWithMethodAndArg(), invoke(), doneResult(), Identity(), makeInvokeMethod(), maybeInvokeDelegate(), resolve() (+4 more)

### Community 85 - "Community 85"
Cohesion: 0.27
Nodes (8): ElevesEditor(), ajouter(), enregistrer(), onPaste(), StudentListEditor(), ajouter(), onPaste(), decouperPrenoms()

### Community 87 - "Community 87"
Cohesion: 0.18
Nodes (10): normalizeAutomationTextString(), registerAttrMatchesCaseInsensitively(), registerContains(), registerMatchBasedOnExtendedTags(), registerRegex(), registerSimpleTextEqualsIgnoreCase(), registerTextEndsWith(), registerTextEquals() (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.18
Nodes (10): normalizeAutomationTextString(), registerAttrMatchesCaseInsensitively(), registerContains(), registerMatchBasedOnExtendedTags(), registerRegex(), registerSimpleTextEqualsIgnoreCase(), registerTextEndsWith(), registerTextEquals() (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.18
Nodes (10): normalizeAutomationTextString(), registerAttrMatchesCaseInsensitively(), registerContains(), registerMatchBasedOnExtendedTags(), registerRegex(), registerSimpleTextEqualsIgnoreCase(), registerTextEndsWith(), registerTextEquals() (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (9): arr(), arrN(), EDM, EDT, FR, JOURS, LIGNES, MA (+1 more)

### Community 93 - "Community 93"
Cohesion: 0.25
Nodes (7): labelMatiere(), SourceImportEdt, SYSTEM_BILAN, systemImport(), systemImportAutomatique(), userImport(), userImportDocument()

### Community 94 - "Community 94"
Cohesion: 0.22
Nodes (10): addCombinator(), condense(), createPositionalPseudo(), elementMatcher(), markFunction(), matcherFromTokens(), setMatcher(), Sizzle() (+2 more)

### Community 95 - "Community 95"
Cohesion: 0.24
Nodes (10): collectAllFramesAndSubFramesToArray(), extractTextFromHtml(), extractTextFromOuterHtml(), HTML2Numerical(), htmlDecode(), htmlEncode(), numEncode(), NumericalToHTML() (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.22
Nodes (10): addCombinator(), condense(), createPositionalPseudo(), elementMatcher(), markFunction(), matcherFromTokens(), setMatcher(), Sizzle() (+2 more)

### Community 97 - "Community 97"
Cohesion: 0.22
Nodes (10): addCombinator(), condense(), createPositionalPseudo(), elementMatcher(), markFunction(), matcherFromTokens(), setMatcher(), Sizzle() (+2 more)

### Community 98 - "Community 98"
Cohesion: 0.22
Nodes (10): addCombinator(), condense(), createPositionalPseudo(), elementMatcher(), markFunction(), matcherFromTokens(), setMatcher(), Sizzle() (+2 more)

### Community 99 - "Community 99"
Cohesion: 0.22
Nodes (10): addCombinator(), condense(), createPositionalPseudo(), elementMatcher(), markFunction(), matcherFromTokens(), setMatcher(), Sizzle() (+2 more)

### Community 100 - "Community 100"
Cohesion: 0.20
Nodes (8): bodoni, fredoka, lexend, nunito, playfair, POLICES, poppins, quicksand

### Community 102 - "Community 102"
Cohesion: 0.25
Nodes (3): ElementChangeObserver, getIndexOrIdFromFrame(), IframeCache

### Community 103 - "Community 103"
Cohesion: 0.22
Nodes (9): adoptValue(), Animation(), camelCase(), createFxNow(), createTween(), done(), fcamelCase(), inArray() (+1 more)

### Community 104 - "Community 104"
Cohesion: 0.25
Nodes (3): ElementChangeObserver, getIndexOrIdFromFrame(), IframeCache

### Community 105 - "Community 105"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, start, test, version

### Community 106 - "Community 106"
Cohesion: 0.22
Nodes (4): GRILLE, mockCreate, mockEnregistrerUsageIA, mockUtilisateurCourant

### Community 108 - "Community 108"
Cohesion: 0.31
Nodes (7): CahierJournalEditor(), afficherSauvegarde(), enregistrerEdition(), generer(), handleExportWord(), regenerer(), supprimerSeance()

### Community 109 - "Community 109"
Cohesion: 0.39
Nodes (7): JOURS, minutesDepuisMinuit(), modifierSeanceJournal(), supprimerSeanceJournal(), validerSeance(), verifierAdresse(), journal

### Community 110 - "Community 110"
Cohesion: 0.47
Nodes (7): fusionnerListes(), fusionnerParNumero(), nettoyerSemainesBrutes(), normalizeProgression(), numerosSemainesFiables(), PROGRESSION_JSON_SCHEMA, toStringArray()

### Community 111 - "Community 111"
Cohesion: 0.36
Nodes (7): aTexte(), domaineDe(), itemsDepuisSeances(), jourValide(), PREFIXE_JOUR, seancesDepuisItems(), SeanceProgression

### Community 112 - "Community 112"
Cohesion: 0.25
Nodes (8): adoptValue(), Animation(), camelCase(), createFxNow(), createTween(), done(), fcamelCase(), Tween()

### Community 113 - "Community 113"
Cohesion: 0.25
Nodes (8): adoptValue(), Animation(), camelCase(), createFxNow(), createTween(), done(), fcamelCase(), Tween()

### Community 114 - "Community 114"
Cohesion: 0.29
Nodes (8): extractTextFromHtml(), HTML2Numerical(), htmlDecode(), htmlEncode(), numEncode(), NumericalToHTML(), swapArrayVals(), XSSEncode()

### Community 115 - "Community 115"
Cohesion: 0.25
Nodes (8): adoptValue(), Animation(), camelCase(), createFxNow(), createTween(), done(), fcamelCase(), Tween()

### Community 116 - "Community 116"
Cohesion: 0.29
Nodes (8): extractTextFromHtml(), HTML2Numerical(), htmlDecode(), htmlEncode(), numEncode(), NumericalToHTML(), swapArrayVals(), XSSEncode()

### Community 117 - "Community 117"
Cohesion: 0.25
Nodes (6): dancingScript, geistMono, metadata, playfair, quicksand, viewport

### Community 118 - "Community 118"
Cohesion: 0.43
Nodes (6): CreneauImporte, EDT_JSON_SCHEMA, JOURS_VALIDES, normaliserEdtImporte(), normaliserEtCorrigerEdtImporte(), normaliserHeure()

### Community 119 - "Community 119"
Cohesion: 0.38
Nodes (3): error(), ExtractionResult, extractRecords()

### Community 120 - "Community 120"
Cohesion: 0.17
Nodes (8): actualFireEventAndIfApplicableHighlightElementAndEmulateKeystroke(), applyAnchorWorkaround(), emulateEventFiringWithGivenJQuery(), focus(), getElementRectangleInfo(), Json, trace(), triggerNativeEvent()

### Community 122 - "Community 122"
Cohesion: 0.38
Nodes (5): config, proxy(), getUser, prechargementConnecte(), requete()

### Community 123 - "Community 123"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 124 - "Community 124"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 125 - "Community 125"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 126 - "Community 126"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 127 - "Community 127"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 128 - "Community 128"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 129 - "Community 129"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 130 - "Community 130"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 131 - "Community 131"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 132 - "Community 132"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 133 - "Community 133"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 134 - "Community 134"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 135 - "Community 135"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 136 - "Community 136"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 137 - "Community 137"
Cohesion: 0.33
Nodes (5): description, manifest_version, name, update_url, version

### Community 138 - "Community 138"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 139 - "Community 139"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 140 - "Community 140"
Cohesion: 0.33
Nodes (5): description, key, manifest_version, name, version

### Community 141 - "Community 141"
Cohesion: 0.33
Nodes (3): mockCreate, mockEnregistrerUsageIA, mockUtilisateurCourant

### Community 142 - "Community 142"
Cohesion: 0.40
Nodes (4): manifest_version, name, preload_data_format, version

### Community 143 - "Community 143"
Cohesion: 0.40
Nodes (3): LIBELLE_NIVEAU, NiveauLSU, ReglesLSU

### Community 144 - "Community 144"
Cohesion: 0.50
Nodes (3): manifest_version, name, version

### Community 145 - "Community 145"
Cohesion: 0.50
Nodes (3): manifest_version, name, version

### Community 146 - "Community 146"
Cohesion: 0.50
Nodes (3): manifest_version, name, version

### Community 147 - "Community 147"
Cohesion: 0.50
Nodes (3): manifest_version, name, version

### Community 148 - "Community 148"
Cohesion: 0.50
Nodes (3): manifest_version, name, version

### Community 149 - "Community 149"
Cohesion: 0.50
Nodes (3): manifest_version, name, version

### Community 150 - "Community 150"
Cohesion: 0.50
Nodes (3): manifest_version, name, version

### Community 151 - "Community 151"
Cohesion: 0.50
Nodes (3): manifest_version, name, version

### Community 154 - "Community 154"
Cohesion: 0.50
Nodes (3): AUCUN_RELEVE, mockSoldeIA, mockUtilisateurCourant

## Knowledge Gaps
- **426 isolated node(s):** `TourConversation`, `ChatTurn`, `BandeauCalageProps`, `WizardData`, `CreneauCreationClasse` (+421 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 19` to `Community 32`, `Community 64`, `Community 67`, `Community 5`, `Community 8`, `Community 73`, `Community 74`, `Community 11`, `Community 12`, `Community 78`, `Community 20`, `Community 31`, `Community 63`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Bouton` connect `Community 64` to `Community 32`, `Community 65`, `Community 5`, `Community 8`, `Community 74`, `Community 11`, `Community 13`, `Community 78`, `Community 79`, `Community 80`, `Community 85`, `Community 22`, `Community 58`, `Community 28`, `Community 63`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `ProgressionSemaine` connect `Community 32` to `Community 33`, `Community 10`, `Community 74`, `Community 110`, `Community 14`, `Community 22`, `Community 58`, `Community 31`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `TourConversation`, `ChatTurn`, `BandeauCalageProps` to the rest of the system?**
  _426 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.021184320266889073 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.021184320266889073 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.02586206896551724 - nodes in this community are weakly interconnected._