// events.js
// Two kinds of interruption:
//   scripted — fires once on a fixed day (guarantees the demo shows them)
//   random   — rolls each morning against `chance`, gated by `when(ctx)`
//
// Types:
//   whatsapp-help : a neighbour asks you to put their bin out. Accepting
//                   creates a neighbour bin you must wheel out before 7am
//                   on dueDay.
//   dump          : a batch of items lands in your tray.
//   message       : flavour only, no mechanics.
//   incident      : something happened overnight; applies a standing hit.

export const scripted = [
  {
    id: 'sandra-away',
    day: 6,
    type: 'whatsapp-help',
    from: 'Sandra (No. 42)',
    text:
      "Hiya! We're away til Sunday — any chance you could put our BLUE bin " +
      'out for Wednesday? Huge thanks 🙏 There\'s a bottle of wine in it for ' +
      'you (not in the blue bin, obviously)',
    binType: 'blue',
    dueDay: 9,
  },
  {
    id: 'karen-observes',
    day: 10,
    type: 'message',
    from: 'Street WhatsApp group',
    text:
      'Just a gentle reminder that bins should be brought IN after ' +
      'collection. Naming no names. — K',
  },
  {
    id: 'mo-hospital',
    day: 15,
    type: 'whatsapp-help',
    from: 'Mo (No. 38)',
    text:
      'Sorry for the late one — taking mum to hospital first thing, could ' +
      "you stick our black bin out?? You're a star",
    binType: 'black',
    dueDay: 16,
  },
  {
    id: 'street-party',
    day: 26,
    type: 'dump',
    from: 'Street WhatsApp group',
    text:
      'GREAT party everyone!! 🎉 (You now have a lot of bottles and pizza ' +
      'boxes. Check the glass rules before you sort them.)',
    items: [
      'wine-bottle', 'wine-bottle', 'wine-bottle', 'wine-bottle',
      'pizza-box-base', 'pizza-box-base', 'pizza-box-lid',
      'crisp-packet', 'crisp-packet',
    ],
  },
  {
    id: 'hedge-day',
    day: 33,
    type: 'dump',
    from: 'You',
    text: 'You took the hedge down. All of it. The garden bin is not ready for this.',
    items: ['bamboo', 'triffid', 'lush-cuttings', 'lush-cuttings', 'moss-rock'],
  },
  {
    id: 'toaster-dies',
    day: 20,
    type: 'dump',
    from: 'You',
    text: 'The television has died. No bin will take it.',
    items: ['crt-tv', 'batteries'],
  },
];

export const random = [
  {
    id: 'day-change',
    chance: 0.1,
    cooldown: 9,
    when: (ctx) => ctx.daysUntilCollection >= 3 && ctx.nextCollection,
    build: (ctx) => ({
      type: 'notice',
      from: 'District Council',
      effect: 'shift-collection',
      shift: {
        fromDay: ctx.nextCollection.day,
        toDay: ctx.nextCollection.day,
        shiftDays: 1,
      },
      text: ctx.pick([
        'Due to a bank holiday, your next collection will take place one day later than usual.',
        'Because of resurfacing works on your road, the next collection will be one day later.',
        'Owing to vehicle availability, your next collection has been moved back by one day. We apologise for any inconvenience.',
      ]),
    }),
  },
  {
    id: 'fox',
    chance: 0.2,
    cooldown: 4,
    when: (ctx) => ctx.blackBinLeftOutOvernight || ctx.pile > 4,
    build: () => ({
      type: 'incident',
      from: 'Overnight',
      standing: -4,
      text: 'A fox has been through the black bin. Rubbish all across the drive.',
    }),
  },
  {
    id: 'wind',
    chance: 0.14,
    cooldown: 5,
    when: (ctx) => ctx.binsLeftAtKerb >= 2,
    build: () => ({
      type: 'incident',
      from: 'Overnight',
      standing: -3,
      text: 'Windy night. Your bins have blown into the road.',
    }),
  },
  {
    id: 'gale',
    chance: 0.1,
    cooldown: 5,
    when: (ctx) => ctx.binsAtKerb > 0,
    build: () => ({
      type: 'incident',
      from: 'Overnight',
      effect: 'gale',
      text: 'A gale came through in the night. Wheelie bins do not stay upright in that.',
    }),
  },
  {
    id: 'flies',
    chance: 0.12,
    cooldown: 6,
    when: (ctx) => ctx.grimyBins,
    build: () => ({
      type: 'incident',
      from: 'Overnight',
      standing: -2,
      text: 'There are flies around your bins. You can smell them from the path.',
    }),
  },
  {
    id: 'inspection',
    chance: 0.07,
    when: (ctx) => ctx.day > 18,
    build: (ctx) => ({
      type: 'message',
      from: 'Street WhatsApp group',
      text: ctx.pick([
        'Heads up — someone in a hi-vis is lifting lids along the street.',
        'There is a man with a clipboard going bin to bin. He has a lanyard. He means it.',
        'Waste enforcement are on the road. They photographed the Hendersons\' recycling.',
        'The hi-vis is back. Bring your bin in if you value your evening.',
      ]),
    }),
  },
  {
    id: 'confident-neighbour',
    chance: 0.14,
    when: (ctx) => ctx.daysUntilCollection === 1,
    build: (ctx) => ({
      type: 'message',
      from: 'Street WhatsApp group',
      // Deliberately unreliable. It exists to make you second-guess the
      // calendar, which is the entire experience of living in the UK.
      text:
        `${ctx.pick(['Sandra', 'Mo', 'Margaret', 'the Hendersons'])} has put ` +
        `the ${ctx.pick(['black', 'blue', 'green'])} bin out tonight. Very ` +
        'confidently.',
    }),
  },
];
