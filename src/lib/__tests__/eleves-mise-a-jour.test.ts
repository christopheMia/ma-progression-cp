import { planifierMiseAJourEleves } from '../eleves-mise-a-jour'

/**
 * LE DÉFAUT QUE CES TESTS FERMENT, trouvé le 9 septembre 2026.
 *
 * L'identité d'un élève se faisait par son PRÉNOM. Corriger une faute de frappe
 * revenait donc à supprimer un enfant et à en créer un autre : tout son suivi
 * (observations, acquisitions, appréciations) disparaissait, en silence, alors
 * que la maîtresse croyait juste corriger une lettre.
 *
 * L'identité se fait maintenant par l'identifiant. Le prénom redevient ce qu'il
 * aurait toujours dû être : une étiquette qu'on peut corriger.
 */

const anna = { id: 'id-anna', prenom: 'Anna' }
const bob = { id: 'id-bob', prenom: 'Bob' }

describe('planifierMiseAJourEleves', () => {
  it('corrige un prénom sans supprimer l’élève', () => {
    const plan = planifierMiseAJourEleves([anna], [{ id: 'id-anna', prenom: 'Ana' }])
    expect(plan.aRenommer).toEqual([{ id: 'id-anna', prenom: 'Ana' }])
    expect(plan.aSupprimer).toEqual([])
    expect(plan.aInserer).toEqual([])
  })

  it('ne renomme pas un élève dont le prénom n’a pas bougé', () => {
    const plan = planifierMiseAJourEleves([anna, bob], [{ id: 'id-anna', prenom: 'Anna' }, { id: 'id-bob', prenom: 'Bob' }])
    expect(plan.aRenommer).toEqual([])
  })

  it('insère un élève arrivé sans identifiant', () => {
    const plan = planifierMiseAJourEleves([anna], [{ id: 'id-anna', prenom: 'Anna' }, { prenom: 'Chloé' }])
    expect(plan.aInserer).toEqual([{ prenom: 'Chloé', ordre: 1 }])
    expect(plan.aSupprimer).toEqual([])
  })

  it('supprime celui qui a été retiré de la liste', () => {
    const plan = planifierMiseAJourEleves([anna, bob], [{ id: 'id-anna', prenom: 'Anna' }])
    expect(plan.aSupprimer).toEqual(['id-bob'])
  })

  // Le cas exact qui détruisait le suivi : une lettre change, rien d'autre.
  it('ne supprime RIEN quand on corrige seulement une faute de frappe', () => {
    const plan = planifierMiseAJourEleves([anna, bob], [{ id: 'id-anna', prenom: 'Annaïs' }, { id: 'id-bob', prenom: 'Bob' }])
    expect(plan.aSupprimer).toEqual([])
    expect(plan.aInserer).toEqual([])
  })

  it('enregistre la place de chacun dans l’ordre saisi', () => {
    const plan = planifierMiseAJourEleves([anna, bob], [{ id: 'id-bob', prenom: 'Bob' }, { id: 'id-anna', prenom: 'Anna' }])
    expect(plan.aReordonner).toEqual([{ id: 'id-bob', ordre: 0 }, { id: 'id-anna', ordre: 1 }])
  })

  // Deux enfants peuvent porter le même prénom dans une classe. C'est
  // précisément ce que l'identité par prénom rendait impossible.
  it('accepte deux élèves qui portent le même prénom', () => {
    const lea1 = { id: 'id-1', prenom: 'Léa' }
    const lea2 = { id: 'id-2', prenom: 'Léa' }
    const plan = planifierMiseAJourEleves([lea1, lea2], [{ id: 'id-1', prenom: 'Léa' }, { id: 'id-2', prenom: 'Léa B.' }])
    expect(plan.aSupprimer).toEqual([])
    expect(plan.aRenommer).toEqual([{ id: 'id-2', prenom: 'Léa B.' }])
  })

  // Garde-fou : un identifiant qu'on ne connaît pas ne doit pas faire écrire
  // n'importe où dans la base. On le traite comme un nouvel élève.
  it('traite un identifiant inconnu comme un nouvel élève', () => {
    const plan = planifierMiseAJourEleves([anna], [{ id: 'id-anna', prenom: 'Anna' }, { id: 'id-fantome', prenom: 'Zoé' }])
    expect(plan.aInserer).toEqual([{ prenom: 'Zoé', ordre: 1 }])
    expect(plan.aRenommer).toEqual([])
  })

  // Garde-fou : si la même ligne arrive deux fois, on ne la traite qu'une fois,
  // sinon le deuxième passage écraserait le premier.
  it('ignore un identifiant répété', () => {
    const plan = planifierMiseAJourEleves([anna], [{ id: 'id-anna', prenom: 'Anna' }, { id: 'id-anna', prenom: 'Autre' }])
    expect(plan.aRenommer).toEqual([])
    expect(plan.aInserer).toEqual([])
  })

  it('ignore les prénoms vides et les espaces autour', () => {
    const plan = planifierMiseAJourEleves([], [{ prenom: '  Zoé  ' }, { prenom: '   ' }, { prenom: '' }])
    expect(plan.aInserer).toEqual([{ prenom: 'Zoé', ordre: 0 }])
  })

  // Vider la liste entière est un geste lourd. Le plan le dit, mais il le dit
  // clairement, pour que l'appelant puisse prévenir avant d'agir.
  it('signale quand la liste devient vide alors qu’elle ne l’était pas', () => {
    const plan = planifierMiseAJourEleves([anna, bob], [])
    expect(plan.aSupprimer).toEqual(['id-anna', 'id-bob'])
    expect(plan.videTout).toBe(true)
  })

  it('ne signale pas un vidage quand la classe était déjà vide', () => {
    expect(planifierMiseAJourEleves([], []).videTout).toBe(false)
  })
})
