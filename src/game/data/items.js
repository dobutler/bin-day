// items.js
// The household output. `category` is the truth the scoring system checks
// via rules.correctBinsFor(); the emoji and the parenthetical are the joke.
// Flags at the end of a line are read by state.js:
//
//   grows        volume increases every day it sits in the tray
//   duplicates   spawns another copy of itself every day in the tray
//   flattenable  can be broken down, trading a little of your time for space
//   wildlife     something is living in it; bin it unchecked at your peril
//   fine         £ penalty if found in a recycling bin at collection
//   flies        multiplier on the fly event
//   flyTip       reward for dumping it somewhere it should not go

export const items = [
  // ---- recycling: paper, card, metal, glass ----
  { id: 'angry-letter',   name: '📄 Strongly Worded Letter to Council', category: 'paper-card', volume: 1,
    note: 'Rejected. Soaked in angry tears.' },
  { id: 'pizza-box-lid',  name: '🍕 Takeaway Pizza Box Lid', category: 'paper-card', volume: 2,
    note: 'Only the top half. The bottom is 90% grease.' },
  { id: 'tax-scroll',     name: '📜 Ancient Scroll of Council Tax Demands', category: 'paper-card', volume: 1,
    note: 'Cardboard core only.' },
  { id: 'wardrobe-box',   name: '📦 "Flat-Packed" Wardrobe Box', category: 'paper-card', volume: 18,
    flattenable: 3, note: 'Unflattened, taking up 100% of bin volume.' },
  { id: 'tabloid',        name: '📰 Local Tabloid', category: 'paper-card', volume: 1,
    note: 'Headline: "Binman Seen Looking At Lid Wrong Way".' },
  { id: 'mp-cutout',      name: '🤖 Cardboard Cutout of Local MP', category: 'paper-card', volume: 4,
    note: 'Technically paper. Morally ambiguous.' },
  { id: 'bean-can',       name: '🥫 Empty Baked Bean Can', category: 'metal', volume: 1, flies: 4,
    note: 'Unwashed. Guaranteed to spawn four times the flies.' },
  { id: 'wine-bottle',    name: '🍾 Empty Wine Bottle', category: 'glass', volume: 1,
    note: 'Fine in the recycling. Until the council says otherwise.' },

  // ---- general waste and biohazards ----
  { id: 'sentient-cheddar', name: '🧀 Sentient Block of Cheddar', category: 'general', volume: 2,
    flies: 2, note: 'Four years past its date. Has developed a philosophy.' },
  { id: 'cursed-doll',    name: '🧸 Cursed Victorian Doll', category: 'general', volume: 3,
    note: 'Whispers when the lid opens.' },
  { id: 'lone-sock',      name: '🧦 The Lone Sock', category: 'general', volume: 1,
    note: 'Its partner vanished into an alternate dimension.' },
  { id: 'green-slime',    name: '👽 Unidentified Green Slime', category: 'general', volume: 2,
    flies: 2, note: 'Back of the fridge. Sealed in Tupperware from 2008.' },
  { id: 'vhs-play',       name: '📼 VHS Tape of a 1994 School Play', category: 'general', volume: 1,
    note: 'Unwindable, unrecyclable, pure guilt.' },
  { id: 'pizza-box-base', name: '🍕 Takeaway Pizza Box Base', category: 'general', volume: 2, fine: 80,
    note: 'Greasy. In the recycling this is an £80 fine, not a mistake.' },
  { id: 'nappy-of-doom',  name: '🍼 Nappy of Doom', category: 'general', volume: 3, flies: 3,
    note: 'Instant contamination anywhere but the general waste.' },
  { id: 'crisp-packet',   name: '🥔 Crisp Packet', category: 'general', volume: 1,
    note: 'Looks like plastic. Is not recyclable. Classic trap.' },

  // ---- garden chaos ----
  { id: 'triffid',        name: '🪴 Aggressive "Triffid" Sapling', category: 'garden', volume: 2, grows: 1,
    note: 'Grows while it waits. It is waiting now.' },
  { id: 'moss-rock',      name: '🪨 A Rock That Is 90% Moss', category: 'garden', volume: 3,
    note: 'Garden waste or geology? The council will decide.' },
  { id: 'lush-cuttings',  name: '🌿 Suspiciously Lush Lawn Cuttings', category: 'garden', volume: 3,
    note: "Harvested from No. 42's lawn at midnight." },
  { id: 'hedgehog-leaves', name: '🍂 Leaf Pile Containing a Sleeping Hedgehog', category: 'garden', volume: 3,
    wildlife: true, note: 'Check it before you tip it.' },
  { id: 'bamboo',         name: '🎋 Encroaching Bamboo', category: 'garden', volume: 2, duplicates: true,
    note: 'Keeps arriving until you deal with it.' },

  // ---- food scraps and stench ----
  { id: 'stale-baguette', name: '🥖 Stale Baguette', category: 'food', volume: 2,
    note: 'Hardness 10/10. Blunt weapon or compost.' },
  { id: 'banana-peel',    name: '🍌 Slapstick Banana Peel', category: 'food', volume: 1,
    note: 'Do not leave this on the pavement.' },
  { id: 'ancient-teabag', name: '☕ Tea Bag Reused 14 Times', category: 'food', volume: 1,
    note: 'Finally ready for the caddy.' },
  { id: 'fish-heads',     name: '🐟 Fish Heads', category: 'food', volume: 2, flies: 3,
    note: 'A 300% surge in local cat and seagull traffic.' },
  { id: 'fruit-stone',    name: '🥑 Fruit Stone', category: 'food', volume: 1,
    note: 'Takes 400 years to decompose. The council demands it anyway.' },

  // ---- the Saturday tip run ----
  { id: 'crt-tv',         name: '📺 100kg CRT Television', category: 'electricals', volume: 12,
    note: 'Takes up the entire boot. Then a 45-minute queue.' },
  { id: 'haunted-mattress', name: '🛏️ Haunted Mattress', category: 'bulky', volume: 20,
    note: 'Twenty years of bad dreams. £30 for bulky pickup.' },
  { id: 'flamingos',      name: '🦩 Flock of Faded Plastic Lawn Flamingos', category: 'bulky', volume: 6,
    note: 'Banned from every kerbside bin.' },
  { id: 'toilet-bowl',    name: '🚽 Porcelain Toilet Bowl', category: 'bulky', volume: 10,
    note: 'A failed DIY planter project.' },
  { id: 'batteries',      name: '🔋 Old Batteries', category: 'hazardous', volume: 1,
    note: 'Not the bin. Never the bin.' },

  // ---- fly-tipping temptations: high risk, high reward ----
  { id: 'tractor-tyre',   name: '🛞 Tractor Tyre', category: 'bulky', volume: 14, flyTip: 40,
    note: "Fits no bin. Drags onto a neighbour's drive at 3am rather well." },
  { id: 'fire-extinguisher', name: '🧯 Expired Fire Extinguisher', category: 'hazardous', volume: 4, flyTip: 30,
    note: 'A ticking time bomb for street chaos.' },
  { id: 'fertiliser-drum', name: '🧪 Glowing Drum of "Fertiliser"', category: 'hazardous', volume: 8, flyTip: 100,
    note: 'Heavy penalty if the hi-vis inspector catches you.' },
];

// Weighted daily production. Scripted events dump extra on top.
export const dailyProduction = {
  base: [
    { id: 'ancient-teabag', weight: 9 },
    { id: 'banana-peel', weight: 6 },
    { id: 'fruit-stone', weight: 5 },
    { id: 'tabloid', weight: 5 },
    { id: 'bean-can', weight: 5 },
    { id: 'angry-letter', weight: 4 },
    { id: 'crisp-packet', weight: 4 },
    { id: 'tax-scroll', weight: 3 },
    { id: 'wine-bottle', weight: 3 },
    { id: 'pizza-box-lid', weight: 2 },
    { id: 'pizza-box-base', weight: 2 },
    { id: 'stale-baguette', weight: 2 },
    { id: 'lone-sock', weight: 2 },
    { id: 'lush-cuttings', weight: 2 },
    { id: 'fish-heads', weight: 2 },
    { id: 'vhs-play', weight: 1.5 },
    { id: 'sentient-cheddar', weight: 1.2 },
    { id: 'green-slime', weight: 1 },
    { id: 'hedgehog-leaves', weight: 1 },
    { id: 'moss-rock', weight: 1 },
    { id: 'wardrobe-box', weight: 0.8 },
    { id: 'mp-cutout', weight: 0.5 },
    { id: 'cursed-doll', weight: 0.4 },
    { id: 'triffid', weight: 0.5 },
    { id: 'bamboo', weight: 0.4 },
    { id: 'batteries', weight: 0.4 },
    { id: 'crt-tv', weight: 0.2 },
    { id: 'flamingos', weight: 0.15 },
    { id: 'toilet-bowl', weight: 0.12 },
    { id: 'haunted-mattress', weight: 0.1 },
    { id: 'tractor-tyre', weight: 0.12 },
    { id: 'fire-extinguisher', weight: 0.12 },
    { id: 'fertiliser-drum', weight: 0.1 },
    { id: 'nappy-of-doom', weight: 0 },
  ],
};
