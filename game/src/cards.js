// The card catalogue for Ember Sigils: every card type, what it costs and what it does.
// One job: the cards themselves. The rules that resolve them live in state.js.
//
// Card kinds: attack (damage, shield absorbs first), shield (gain shield), heal (restore
// life), ember (gain ember this turn), draw (draw cards). Every card also has an element;
// playing a card of the same element as the card played just before it this turn
// "resonates": +2 to its damage, shield or heal.
import { DECK_SIZE } from './config.js';
import { shuffle } from './random.js';

export const KIND_ATTACK = 'attack';
export const KIND_SHIELD = 'shield';
export const KIND_HEAL = 'heal';
export const KIND_EMBER = 'ember';
export const KIND_DRAW = 'draw';

export const CARD_TYPES = [
  { id: 'bolt', name: 'Ember Bolt', element: 'flame', cost: 1, kind: KIND_ATTACK, value: 3, text: 'Deal 3 damage.' },
  { id: 'lash', name: 'Flame Lash', element: 'flame', cost: 2, kind: KIND_ATTACK, value: 5, text: 'Deal 5 damage.' },
  { id: 'kindling', name: 'Kindling', element: 'flame', cost: 1, kind: KIND_EMBER, value: 2, text: 'Gain 2 ember. Draw 1 on resonance.' },
  { id: 'surge', name: 'Ember Surge', element: 'flame', cost: 3, kind: KIND_ATTACK, value: 6, text: 'Deal 6 damage.' },
  { id: 'tidewall', name: 'Tidewall', element: 'tide', cost: 1, kind: KIND_SHIELD, value: 4, text: 'Gain 4 shield.' },
  { id: 'current', name: 'Deep Current', element: 'tide', cost: 2, kind: KIND_SHIELD, value: 5, text: 'Gain 5 shield. Draw 1.' },
  { id: 'undertow', name: 'Undertow', element: 'tide', cost: 2, kind: KIND_ATTACK, value: 4, text: 'Deal 4 damage. +2 shield.' },
  { id: 'thorn', name: 'Thorn Whip', element: 'leaf', cost: 2, kind: KIND_ATTACK, value: 4, text: 'Deal 4 damage. Heal 2.' },
  { id: 'bloom', name: 'Bloom', element: 'leaf', cost: 1, kind: KIND_HEAL, value: 3, text: 'Heal 3 life.' },
  { id: 'grove', name: 'Grove Song', element: 'leaf', cost: 2, kind: KIND_DRAW, value: 2, text: 'Draw 2 cards. Heal 1.' },
  { id: 'bulwark', name: 'Stone Bulwark', element: 'stone', cost: 2, kind: KIND_SHIELD, value: 7, text: 'Gain 7 shield.' },
  { id: 'quake', name: 'Quake Slam', element: 'stone', cost: 3, kind: KIND_ATTACK, value: 6, text: 'Deal 6 damage. +3 vs shield.' },
  { id: 'keystone', name: 'Keystone', element: 'stone', cost: 1, kind: KIND_EMBER, value: 1, text: 'Gain 1 ember, 2 shield.' },
];

export function cardTypeById(id) {
  return CARD_TYPES.find((type) => type.id === id);
}

/** One fresh card instance (a unique uid so the renderer can track it). */
let nextUid = 1;
export function makeCard(typeId) {
  const type = cardTypeById(typeId);
  return { uid: nextUid, ...type };
}

/** A 24-card deck: two copies of each type, shuffled with the seeded generator. */
export function buildDeck(random) {
  const ids = [];
  for (const type of CARD_TYPES) {
    ids.push(type.id, type.id);
  }
  while (ids.length > DECK_SIZE) ids.pop();
  return shuffle(ids.map((id) => makeCard(id)), random);
}

/** Short label for the log, e.g. "Ember Bolt (3)". */
export function cardLabel(card) {
  return `${card.name} (${card.value})`;
}
