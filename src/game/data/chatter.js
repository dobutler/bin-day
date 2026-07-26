// chatter.js
// Ambient traffic: the street WhatsApp group, the neighbours, and the
// council's smaller communications. Mostly no mechanical effect — it exists
// so the phone feels like it belongs to somebody who lives on a real road.
//
// Bin names are templated: {black} {blue} {green} {caddy} resolve to the
// player's chosen colours.

export const chatter = [
  // ---- the street WhatsApp group ----
  { from: 'Street WhatsApp group', text:
    'Morning all. Did anyone else not get collected? Ours is still full. ' +
    'Ringing the council now, will report back. 🙄' },
  { from: 'Street WhatsApp group', text:
    'Quick poll: is it {blue} this week or next? I have asked Sandra and ' +
    'she has said both.' },
  { from: 'Street WhatsApp group', text:
    'Whoever keeps putting their {black} in front of my drive, I do know ' +
    'which house you are. Just say if you need help moving it. — K' },
  { from: 'Street WhatsApp group', text:
    'Free sofa. Good condition apart from one arm and the smell. ' +
    'Collection only. First come first served!!' },
  { from: 'Street WhatsApp group', text:
    'Has anyone seen a ginger cat? Answers to Nigel. Does not come when ' +
    'called. Bit of a handful.' },
  { from: 'Street WhatsApp group', text:
    'Reminder that the bin lorry comes at 6.45 not 7, whatever the council ' +
    'website says. Learned that one the hard way.' },
  { from: 'Street WhatsApp group', text:
    'I am not being funny but somebody has put a whole bathroom suite in ' +
    'the alley. A whole one.' },
  { from: 'Street WhatsApp group', text:
    'Lovely to see so many bins brought in promptly this week. Makes such a ' +
    'difference to how the road looks. 🙂 — K' },
  { from: 'Street WhatsApp group', text:
    'Does anyone know if you can put the little foil tray from a ready meal ' +
    'in the {blue}? Conflicting information online.' },
  { from: 'Street WhatsApp group', text:
    'Fireworks again. Third night. I have said nothing so far but I am ' +
    'saying something now.' },
  { from: 'Street WhatsApp group', text:
    'Right, I have made a shared calendar for the collections. Link below. ' +
    'Please do not edit it, just look at it.' },
  { from: 'Street WhatsApp group', text:
    'Leaving this group. Nothing personal. Just find it quite stressful. ' +
    'See you all at the summer thing.' },
  { from: 'Street WhatsApp group', text:
    'Sorry to add to the traffic but there is a fox living under the ' +
    'Hendersons\' decking and I think we should be told.' },

  // ---- individual neighbours ----
  { from: 'Sandra (No. 42)', text:
    'Hiya! Sorry to bother you. Is it the {green} tomorrow? Ours is looking ' +
    'quite full and I do not want to get it wrong again x' },
  { from: 'Mo (No. 38)', text:
    'Mate, your {blue} has blown over onto our path. No drama, I have ' +
    'stood it back up. 👍' },
  { from: 'Margaret (No. 36)', text:
    'Dear neighbour, I do not know how to work this properly. Margaret.' },
  { from: 'Margaret (No. 36)', text:
    'Sorry, sent that by accident. This one is on purpose. Margaret.' },
  { from: 'The Hendersons (No. 44)', text:
    'Hello! We are having a bit of a do on Saturday. Nothing wild. Just ' +
    'letting you know in case of noise, and also bottles.' },
  { from: 'Sandra (No. 42)', text:
    'Thank you SO much for last week. I owe you one. There is a bottle of ' +
    'something on your step. 🍷' },
  { from: 'Mo (No. 38)', text:
    'Have you seen the state of the pavement outside No. 36? Somebody has ' +
    'reported it. It was not me. It was me.' },
  { from: 'Margaret (No. 36)', text:
    'They have changed the rules again. I have written to them. I do not ' +
    'expect a reply. Margaret.' },

  // ---- smaller council communications ----
  { from: 'District Council', text:
    'Your recycling was assessed as 4% contaminated this quarter. The ' +
    'district average is 3%. Thank you for your continued efforts.' },
  { from: 'District Council', text:
    'We are consulting on the future of waste collection in your area. ' +
    'The consultation closed last Tuesday. Thank you for your interest.' },
  { from: 'District Council', text:
    'Did you know you can now report a missed collection through our ' +
    'improved digital portal? Reports must be made within 24 hours of the ' +
    'scheduled collection, and after 48 hours.' },
  { from: 'District Council', text:
    'Your road has been shortlisted for our Recycling Street of the Year ' +
    'award. No action is required. There is no prize.' },
  { from: 'District Council', text:
    'Crews have reported difficulty accessing your road due to parked ' +
    'vehicles. Please park considerately, elsewhere.' },
  { from: 'District Council', text:
    'A reminder that bins should be presented at the boundary of your ' +
    'property and returned promptly. Bins left out may be removed.' },
  { from: 'District Council', text:
    'We are pleased to announce a new customer service standard. You should ' +
    'now expect a response within 20 working days, up from 10.' },
];
