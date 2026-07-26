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

export const letters = [
  {
    id: 'garden-waste-charge',
    arrivesDay: 8,
    effectiveDay: 14,
    subject: 'Exciting changes to your garden waste service',
    body:
      'Dear Resident,\n\n' +
      'From the date shown above, the collection of garden waste will ' +
      'become a chargeable, opt-in service. To continue receiving green ' +
      'bin collections for garden waste, please purchase an annual ' +
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
      'placed in the green or black bin will be treated as contamination. ' +
      'The caddy is collected every week.\n\n' +
      'Your caddy will be delivered shortly. Please do not use it to ' +
      'store items other than food waste.',
    ops: [
      { op: 'set', path: 'bins.caddy.active', value: true },
      { op: 'add', path: 'bins.caddy.accepts', value: 'food' },
      { op: 'remove', path: 'bins.green.accepts', value: 'food' },
      {
        op: 'add',
        path: 'rota.collections',
        value: { weekInCycle: 0, weekday: 2, bins: ['caddy'] },
      },
      {
        op: 'add',
        path: 'rota.collections',
        value: { weekInCycle: 1, weekday: 2, bins: ['caddy'] },
      },
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
      'longer be accepted in the blue bin. Glass should be taken to your ' +
      'nearest bottle bank. Glass found in the blue bin may result in ' +
      'your recycling being rejected.\n\n' +
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
];
