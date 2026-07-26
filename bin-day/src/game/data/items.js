// items.js
// The household produces these daily. `category` is the truth the scoring
// system checks via rules.correctBinsFor(). Ambiguous real-world items are
// modelled as separate entries so the *player* has to judge the condition —
// the game never lies, it just doesn't label things helpfully on screen.

export const items = [
  // Everyday
  { id: 'teabags',          name: 'Used teabags',            category: 'food',       volume: 1 },
  { id: 'peelings',         name: 'Vegetable peelings',      category: 'food',       volume: 1 },
  { id: 'newspaper',        name: 'Newspaper',               category: 'paper-card', volume: 1 },
  { id: 'milk-bottle',      name: 'Plastic milk bottle',     category: 'plastics',   volume: 1 },
  { id: 'bean-tin',         name: 'Baked bean tin',          category: 'metal',      volume: 1 },
  { id: 'wine-bottle',      name: 'Wine bottle',             category: 'glass',      volume: 1 },
  { id: 'crisp-packet',     name: 'Crisp packet',            category: 'general',    volume: 1,
    note: 'Looks like plastic. Is not recyclable. Classic trap.' },

  // The pizza box problem — two entries, one judgement call
  { id: 'pizza-box-clean',  name: 'Pizza box (lid, clean)',  category: 'paper-card', volume: 2 },
  { id: 'pizza-box-greasy', name: 'Pizza box (greasy base)', category: 'general',    volume: 2 },

  // More traps
  { id: 'black-plastic',    name: 'Black plastic food tray', category: 'general',    volume: 1,
    note: 'Sorting machines cannot see black plastic.' },
  { id: 'pyrex',            name: 'Broken Pyrex dish',       category: 'general',    volume: 2,
    note: 'Not the same glass as bottles. Melts differently.' },
  { id: 'nappy',            name: 'Nappy',                   category: 'general',    volume: 2,
    note: 'The number one real-world contaminant of recycling.' },
  { id: 'foil-clean',       name: 'Kitchen foil (rinsed)',   category: 'metal',      volume: 1 },
  { id: 'coffee-cup',       name: 'Takeaway coffee cup',     category: 'general',    volume: 1,
    note: 'Plastic-lined. Councils differ; ours says no.' },

  // Garden
  { id: 'grass',            name: 'Grass cuttings',          category: 'garden',     volume: 3 },
  { id: 'hedge',            name: 'Hedge trimmings',         category: 'garden',     volume: 4 },
  { id: 'soil',             name: 'Bag of soil',             category: 'bulky',      volume: 4,
    note: 'Soil is not garden waste. Nobody believes this.' },

  // No bin will take these — tip run pressure
  { id: 'batteries',        name: 'Old batteries',           category: 'hazardous',  volume: 1 },
  { id: 'toaster',          name: 'Broken toaster',          category: 'electricals',volume: 3 },
  { id: 'paint-tin',        name: 'Half-full paint tin',     category: 'hazardous',  volume: 2 },
  { id: 'mattress',         name: 'Old mattress',            category: 'bulky',      volume: 20 },
  { id: 'duvet',            name: 'Worn-out duvet',          category: 'textiles',   volume: 6 },
];

// Weighted daily production. Events multiply or extend these:
// e.g. newBaby -> nappy weight x6; gardenProject -> garden weights x4;
// partyAftermath -> one-off dump of bottles, pizza boxes and regret.
export const dailyProduction = {
  base: [
    { id: 'teabags', weight: 10 },
    { id: 'peelings', weight: 8 },
    { id: 'milk-bottle', weight: 5 },
    { id: 'newspaper', weight: 4 },
    { id: 'bean-tin', weight: 4 },
    { id: 'crisp-packet', weight: 4 },
    { id: 'wine-bottle', weight: 3 },
    { id: 'pizza-box-greasy', weight: 2 },
    { id: 'pizza-box-clean', weight: 1 },
    { id: 'black-plastic', weight: 2 },
    { id: 'coffee-cup', weight: 2 },
    { id: 'nappy', weight: 0 },       // until the newBaby event
    { id: 'grass', weight: 2 },
    { id: 'batteries', weight: 0.3 },
    { id: 'toaster', weight: 0.1 },
  ],
};
