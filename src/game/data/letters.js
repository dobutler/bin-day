// letters.js
// A council letter = display prose + patch operations on the ruleset +
// the day the change takes effect. The gap between arrivesDay and
// effectiveDay is the player's grace period to read and adapt.
//
// Patch operations (applied by rules.js):
//   { op: 'set',    path: 'bins.green.subscription', value: {...} }
//   { op: 'add',    path: 'bins.caddy.accepts',      value: 'food' }
//   { op: 'remove', path: 'bins.blue.accepts',       value: 'glass' }
//   { op: 'remove', path: 'bins.green.accepts' }              // delete key
//
// Explicit ops rather than a deep merge, so the letter UI can render
// "what changed" straight from the ops list.
//
// Demo pacing: days are deliberately close together so a player meets all
// four regulation changes inside a short session. Space them out for a
// longer game.
//
// Bin names in the prose are templated — {black}, {blue}, {green}, {caddy}
// resolve to whatever colour the player chose for that function, so a letter
// about recycling says "purple bin" if that is what they picked.

export const letters = [
  {
    id: 'garden-waste-charge',
    arrivesDay: 8,
    effectiveDay: 14,
    subject: 'Exciting changes to your garden waste service',
    body:
      'Dear Resident,\n\n' +
      'From the date shown above, the collection of garden waste will ' +
      'become a chargeable, opt-in service. To continue receiving ' +
      '{green} collections for garden waste, please purchase an annual ' +
      'subscription (£60). Food waste will continue to be collected as ' +
      'normal.\n\n' +
      'We thank you for helping us deliver a cleaner, greener district.',
    ops: [
      {
        op: 'set',
        path: 'bins.green.subscription',
        value: { costPerYear: 60, subscribed: false, appliesTo: 'garden' },
      },
    ],
  },

  {
    id: 'food-caddy-rollout',
    arrivesDay: 18,
    effectiveDay: 24,
    subject: 'Introducing your new weekly food waste collection',
    body:
      'Dear Resident,\n\n' +
      'As part of our commitment to recycling targets, food waste must ' +
      'now be presented separately in the food caddy provided. Food waste ' +
      'placed in the {green} or {black} will be treated as contamination. ' +
      'The {caddy} is collected every week.\n\n' +
      'Your {caddy} will be delivered shortly. Please do not use it to ' +
      'store items other than food waste.',
    ops: [
      { op: 'set', path: 'bins.caddy.active', value: true },
      { op: 'add', path: 'bins.caddy.accepts', value: 'food' },
      { op: 'remove', path: 'bins.green.accepts', value: 'food' },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 0, weekday: 2, bins: ['caddy'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 1, weekday: 3, bins: ['caddy'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 2, weekday: 2, bins: ['caddy'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 3, weekday: 1, bins: ['caddy'] } },
    ],
  },

  {
    id: 'glass-banked',
    arrivesDay: 30,
    effectiveDay: 36,
    subject: 'Important information about glass recycling',
    body:
      'Dear Resident,\n\n' +
      'Following a review of our processing facilities, glass can no ' +
      'longer be accepted in the {blue}. Glass should be taken to your ' +
      'nearest bottle bank. Glass found in the {blue} may result in your ' +
      'recycling being rejected.\n\n' +
      'A list of bottle bank locations is available on our website.',
    ops: [{ op: 'remove', path: 'bins.blue.accepts', value: 'glass' }],
  },

  {
    id: 'festive-shift',
    arrivesDay: 44,
    effectiveDay: 50,
    subject: 'Revised collection days over the festive period',
    body:
      'Dear Resident,\n\n' +
      'Collections falling in the festive period will take place one day ' +
      'later than usual. Normal service will resume in the new year. ' +
      'Please present your bins by 7am on the revised day.',
    ops: [
      {
        op: 'add',
        path: 'rota.holidayShifts',
        value: { fromDay: 50, toDay: 64, shiftDays: 1 },
      },
    ],
  },

  // ---- flavour only: no rules change, just correspondence ----
  {
    id: 'satisfaction-survey',
    arrivesDay: 12,
    effectiveDay: 12,
    subject: 'Tell us how we are doing',
    body:
      'Dear Resident,\n\n' +
      'We are committed to continuous improvement. Please take fifteen ' +
      'minutes to complete our waste satisfaction survey.\n\n' +
      'Question 1 of 40: On a scale of one to ten, how would you rate the ' +
      'colour of your {black}?',
    ops: [],
  },
  {
    id: 'league-table',
    arrivesDay: 22,
    effectiveDay: 22,
    subject: 'Your street recycling performance',
    body:
      'Dear Resident,\n\n' +
      'Your road recycles 41% of its household waste. Neighbouring roads ' +
      'achieve 44%. We are not saying this is anybody in particular. We are ' +
      'simply sharing the figures.\n\n' +
      'A leaflet is enclosed. The leaflet is not recyclable.',
    ops: [],
  },
  {
    id: 'depot-restructure',
    arrivesDay: 38,
    effectiveDay: 38,
    subject: 'Improvements to your waste service',
    body:
      'Dear Resident,\n\n' +
      'Following a service review, waste collection will be delivered by a ' +
      'new operating partner from next month. Residents should notice no ' +
      'difference whatsoever.\n\n' +
      'Your collection day, crew, and vehicle remain unchanged. The name on ' +
      'the vehicle will change.',
    ops: [],
  },

  // ---- further regulation changes ----
  {
    id: 'flatten-your-card',
    arrivesDay: 50,
    effectiveDay: 56,
    subject: 'Cardboard preparation requirements',
    body:
      'Dear Resident,\n\n' +
      'Cardboard must now be flattened before it is placed in the {blue}. ' +
      'Unflattened boxes reduce vehicle capacity and will be treated as ' +
      'contamination.\n\n' +
      'We appreciate that this requires a small amount of additional effort ' +
      'on your part.',
    ops: [{ op: 'set', path: 'conduct.flattenedCardOnly', value: true }],
  },
  {
    id: 'glass-returns',
    arrivesDay: 62,
    effectiveDay: 68,
    subject: 'An update on glass recycling',
    body:
      'Dear Resident,\n\n' +
      'Following representations from residents, and a change of processing ' +
      'contractor, glass can once again be accepted in the {blue}.\n\n' +
      'We thank residents for their patience during the period in which it ' +
      'could not, and for their patience during the period before that, in ' +
      'which it could.',
    ops: [{ op: 'add', path: 'bins.blue.accepts', value: 'glass' }],
  },
  {
    id: 'route-optimisation',
    arrivesDay: 74,
    effectiveDay: 80,
    subject: 'Your collection day is changing',
    body:
      'Dear Resident,\n\n' +
      'As part of a route optimisation exercise, your collection day will ' +
      'move from Wednesday to Monday. Please present your bins by 7am on ' +
      'the new day.\n\n' +
      'We are confident this will cause minimal disruption.',
    ops: [
      { op: 'remove', path: 'rota.collections', value: { weekInCycle: 0, weekday: 2, bins: ['black', 'green'] } },
      { op: 'remove', path: 'rota.collections', value: { weekInCycle: 2, weekday: 2, bins: ['black', 'green'] } },
      { op: 'remove', path: 'rota.collections', value: { weekInCycle: 1, weekday: 3, bins: ['blue'] } },
      { op: 'remove', path: 'rota.collections', value: { weekInCycle: 3, weekday: 1, bins: ['blue'] } },
      { op: 'remove', path: 'rota.collections', value: { weekInCycle: 0, weekday: 2, bins: ['caddy'] } },
      { op: 'remove', path: 'rota.collections', value: { weekInCycle: 1, weekday: 3, bins: ['caddy'] } },
      { op: 'remove', path: 'rota.collections', value: { weekInCycle: 2, weekday: 2, bins: ['caddy'] } },
      { op: 'remove', path: 'rota.collections', value: { weekInCycle: 3, weekday: 1, bins: ['caddy'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 0, weekday: 0, bins: ['black', 'green'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 2, weekday: 0, bins: ['black', 'green'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 1, weekday: 0, bins: ['blue'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 3, weekday: 0, bins: ['blue'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 0, weekday: 0, bins: ['caddy'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 1, weekday: 0, bins: ['caddy'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 2, weekday: 0, bins: ['caddy'] } },
      { op: 'add', path: 'rota.collections', value: { weekInCycle: 3, weekday: 0, bins: ['caddy'] } },
    ],
  },
];
