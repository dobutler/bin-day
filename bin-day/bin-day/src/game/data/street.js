// street.js
// The rest of the road. Each neighbour has two dials:
//
//   knowledge     — how reliably they remember the rota on their own
//   suggestibility— how readily they abandon that and copy whatever is
//                   standing on your kerb
//
// Nobody is at 1.0 for knowledge. That is the whole point of the street.

export const neighbours = [
  { id: 'mo',      name: 'Mo (No. 38)',       knowledge: 0.75, suggestibility: 0.35, side: 'left',  slot: 0 },
  { id: 'margaret',name: 'Margaret (No. 36)', knowledge: 0.45, suggestibility: 0.80, side: 'left',  slot: 1 },
  { id: 'sandra',  name: 'Sandra (No. 42)',   knowledge: 0.60, suggestibility: 0.55, side: 'right', slot: 0 },
  { id: 'hendersons', name: 'The Hendersons (No. 44)', knowledge: 0.35, suggestibility: 0.90, side: 'right', slot: 1 },
];

// Fired when street chaos crosses a threshold. Escalation, not punishment:
// the council eventually notices that an entire road has stopped coping.
export const chaosMilestones = [
  {
    at: 3,
    from: 'Street WhatsApp group',
    text:
      'Is it blue this week?? Half the road has put blue out and half black. ' +
      'Can someone who KNOWS please confirm 🙏',
  },
  {
    at: 6,
    from: 'Street WhatsApp group',
    text:
      "Right, I'm making a spreadsheet. Nobody put anything out until I've " +
      'sent it round. — K',
    standing: -2,
  },
  {
    at: 10,
    from: 'District Council',
    text:
      'We have noted an unusually high rate of incorrect presentations on ' +
      'your road and will be delivering additional guidance to all residents.',
    standing: -4,
  },
  {
    at: 15,
    from: 'Street WhatsApp group',
    text:
      'Someone has been putting the wrong bin out on purpose. We know. ' +
      'We have a group. There will be a meeting.',
    standing: -6,
  },
];
