export type EdmSemaine = {
  numero: number
  theme: string
  sous_theme: string
  competences: string
  domaine: 'le_temps' | 'l_espace' | 'le_vivant' | 'la_matiere' | 'la_societe'
}

export const EDM_PROGRESSION_CP: EdmSemaine[] = [
  { numero: 1, theme: 'Moi', sous_theme: 'Mon corps', competences: 'Identifier les parties du corps. Se repérer dans l\'espace proche.', domaine: 'l_espace' },
  { numero: 2, theme: 'Moi', sous_theme: 'Mes sens', competences: 'Utiliser ses sens pour explorer son environnement.', domaine: 'le_vivant' },
  { numero: 3, theme: 'L\'école', sous_theme: 'Se repérer dans l\'école', competences: 'Se repérer dans un espace connu. Lire un plan simple.', domaine: 'l_espace' },
  { numero: 4, theme: 'Le temps', sous_theme: 'La journée et la semaine', competences: 'Ordonner des événements. Utiliser un calendrier de classe.', domaine: 'le_temps' },
  { numero: 5, theme: 'Le temps', sous_theme: 'Les saisons — automne', competences: 'Reconnaître les saisons. Observer les changements dans la nature.', domaine: 'le_temps' },
  { numero: 6, theme: 'Le vivant', sous_theme: 'Les animaux — les animaux familiers', competences: 'Distinguer animaux sauvages et domestiques. Décrire leurs caractéristiques.', domaine: 'le_vivant' },
  { numero: 7, theme: 'Le vivant', sous_theme: 'Les plantes — observer une graine', competences: 'Observer la germination. Comprendre les besoins d\'une plante.', domaine: 'le_vivant' },
  { numero: 8, theme: 'La matière', sous_theme: 'Les matériaux', competences: 'Identifier les matériaux (bois, métal, plastique). Classer des objets.', domaine: 'la_matiere' },
  { numero: 9, theme: 'La matière', sous_theme: 'L\'eau — les états', competences: 'Observer les états de l\'eau (solide, liquide). Faire des expériences simples.', domaine: 'la_matiere' },
  { numero: 10, theme: 'La société', sous_theme: 'Ma famille', competences: 'Décrire sa famille. Comprendre les liens familiaux.', domaine: 'la_societe' },
  { numero: 11, theme: 'La société', sous_theme: 'Les règles de vie', competences: 'Comprendre l\'importance des règles. Distinguer droits et devoirs.', domaine: 'la_societe' },
  { numero: 12, theme: 'L\'espace', sous_theme: 'Mon quartier / mon village', competences: 'Se repérer dans l\'espace local. Utiliser des repères spatiaux.', domaine: 'l_espace' },
  { numero: 13, theme: 'Le vivant', sous_theme: 'Les animaux — en hiver', competences: 'Découvrir l\'hibernation. Observer l\'adaptation des animaux aux saisons.', domaine: 'le_vivant' },
  { numero: 14, theme: 'Le temps', sous_theme: 'Passé / présent / futur', competences: 'Situer des événements dans le temps. Utiliser un axe chronologique simple.', domaine: 'le_temps' },
  { numero: 15, theme: 'La matière', sous_theme: 'La lumière et les ombres', competences: 'Observer la formation des ombres. Comprendre que la lumière se propage en ligne droite.', domaine: 'la_matiere' },
  { numero: 16, theme: 'Le vivant', sous_theme: 'Mon alimentation', competences: 'Identifier les aliments. Comprendre l\'équilibre alimentaire.', domaine: 'le_vivant' },
  { numero: 17, theme: 'La société', sous_theme: 'Les métiers', competences: 'Découvrir différents métiers. Comprendre la notion de travail.', domaine: 'la_societe' },
  { numero: 18, theme: 'Le vivant', sous_theme: 'La santé et l\'hygiène', competences: 'Comprendre les gestes d\'hygiène. Connaître les règles de sécurité simples.', domaine: 'le_vivant' },
  { numero: 19, theme: 'Le temps', sous_theme: 'Les saisons — hiver', competences: 'Observer les caractéristiques de l\'hiver. Comparer les saisons.', domaine: 'le_temps' },
  { numero: 20, theme: 'L\'espace', sous_theme: 'La France — paysages', competences: 'Identifier différents types de paysages (mer, montagne, plaine). Localiser sur une carte simple.', domaine: 'l_espace' },
  { numero: 21, theme: 'La société', sous_theme: 'Les transports', competences: 'Découvrir les différents moyens de transport. Comprendre leur utilité.', domaine: 'la_societe' },
  { numero: 22, theme: 'Le vivant', sous_theme: 'Les plantes — le printemps', competences: 'Observer la croissance des plantes. Comprendre la photosynthèse de manière simple.', domaine: 'le_vivant' },
  { numero: 23, theme: 'Le temps', sous_theme: 'Les saisons — printemps', competences: 'Observer les changements du printemps. Reconnaître les plantes qui fleurissent.', domaine: 'le_temps' },
  { numero: 24, theme: 'La matière', sous_theme: 'Les mélanges', competences: 'Distinguer mélanges homogènes et hétérogènes. Réaliser des expériences simples.', domaine: 'la_matiere' },
  { numero: 25, theme: 'La société', sous_theme: 'La vie en société — les lois', competences: 'Découvrir les institutions de base. Comprendre les règles de la vie en commun.', domaine: 'la_societe' },
  { numero: 26, theme: 'L\'espace', sous_theme: 'L\'Europe — introduction', competences: 'Situer la France en Europe. Découvrir quelques pays voisins.', domaine: 'l_espace' },
  { numero: 27, theme: 'Le vivant', sous_theme: 'Les animaux — cycle de vie', competences: 'Comprendre le cycle de vie d\'un animal (oeuf → adulte). Observer des métamorphoses.', domaine: 'le_vivant' },
  { numero: 28, theme: 'La matière', sous_theme: 'Les objets techniques', competences: 'Identifier des outils et machines simples. Comprendre leur fonctionnement de base.', domaine: 'la_matiere' },
  { numero: 29, theme: 'Le temps', sous_theme: 'Les traces du passé', competences: 'Comprendre que le passé laisse des traces. Observer des documents anciens.', domaine: 'le_temps' },
  { numero: 30, theme: 'L\'espace', sous_theme: 'Ville et campagne', competences: 'Comparer la ville et la campagne. Identifier les activités humaines selon les espaces.', domaine: 'l_espace' },
  { numero: 31, theme: 'Le vivant', sous_theme: 'L\'environnement', competences: 'Comprendre l\'importance de protéger l\'environnement. Découvrir les gestes éco-responsables.', domaine: 'le_vivant' },
  { numero: 32, theme: 'Le temps', sous_theme: 'Les saisons — été', competences: 'Reconnaître les caractéristiques de l\'été. Faire le bilan des 4 saisons.', domaine: 'le_temps' },
  { numero: 33, theme: 'La société', sous_theme: 'Les fêtes et traditions', competences: 'Découvrir les fêtes du calendrier. Comprendre les traditions culturelles.', domaine: 'la_societe' },
  { numero: 34, theme: 'La matière', sous_theme: 'L\'air', competences: 'Comprendre que l\'air existe et a des propriétés. Faire des expériences avec l\'air.', domaine: 'la_matiere' },
  { numero: 35, theme: 'Révision', sous_theme: 'Le vivant — bilan', competences: 'Réviser les notions sur le vivant : animaux, plantes, corps humain, santé.', domaine: 'le_vivant' },
  { numero: 36, theme: 'Révision', sous_theme: 'L\'espace et le temps — bilan', competences: 'Réviser les notions de repérage dans le temps et l\'espace.', domaine: 'le_temps' },
]
