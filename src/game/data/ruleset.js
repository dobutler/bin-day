// ruleset.js
// The single source of truth for "how bins work right now".
// Everything in the game reads from this (via rules.js) rather than
// hard-coding bin behaviour. Council letters are patches to this object.

export const baseRuleset = {
  version: 1,

  // Waste categories. Items reference these; bins accept sets of them.
  // Categories that no bin accepts (e.g. bulky, hazardous) force a
  // tip run / bulky-collection booking — that's deliberate.
  categories: [
    'general',
    'paper-card',
    'plastics',
    'metal',
    'glass',
    'food',
    'garden',
    'textiles',
    'electricals',
    'hazardous',
    'bulky',
  ],

  bins: {
    black: {
      name: 'Black bin',
      colour: 0x2b2b2b,
      accepts: ['general'],
      capacity: 26,            // abstract volume units per cycle
      active: true,
      subscription: null,      // free
    },
    blue: {
      name: 'Blue bin',
      colour: 0x2b6cb0,
      accepts: ['paper-card', 'plastics', 'metal', 'glass'],
      capacity: 26,
      active: true,
      subscription: null,
    },
    green: {
      name: 'Green bin',
      colour: 0x2f855a,
      accepts: ['garden', 'food'],
      capacity: 26,
      active: true,
      subscription: null,
    },
    // Bins that letters can introduce later start here, inactive.
    caddy: {
      name: 'Food caddy',
      colour: 0x7b5e3b,
      accepts: [],             // letter will set ['food'] when introduced
      capacity: 22,
      active: false,
      subscription: null,
    },
  },

  // Collection rota as a repeating cycle. Day 0 of the game is a Monday.
  // weekday: 0 = Monday ... 6 = Sunday.
  rota: {
    cycleWeeks: 2,
    collections: [
      { weekInCycle: 0, weekday: 2, bins: ['black', 'green'] }, // Wed, week A
      { weekInCycle: 1, weekday: 2, bins: ['blue'] },           // Wed, week B
    ],
    deadlineHour: 7,           // bins out by 7am or they're missed
    // Offsets applied to specific absolute days (Christmas etc.).
    // Letters add entries: { fromDay, toDay, shiftDays }
    holidayShifts: [],
  },

  // Behavioural rules the street/inspection systems consult.
  conduct: {
    lidMustClose: true,        // propped lids = refused collection
    sideWasteAllowed: false,   // bags next to the bin are ignored
    earliestPutOutHour: 18,    // night before; earlier annoys neighbours
    contaminationSticker: true, // wrong items in blue = whole bin refused
    flattenedCardOnly: false    // a later letter turns this on
  },
};
