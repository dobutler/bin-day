// street.js (system)
// Neighbours watch your kerb. That is the mechanic.
//
// The evening before a collection, each neighbour decides what to put out.
// They either trust their own memory of the rota, or — if there is something
// standing on your kerb — copy you. The more suggestible they are, the more
// your kerb becomes the street's source of truth.
//
// Which means a wrong bin, put out confidently, propagates.

import { collectionsOn, contamination } from './rules.js';
import { neighbours, chaosMilestones } from '../data/street.js';

export function newStreet() {
  return {
    chaos: 0,          // how confused the road currently is
    suspicion: 0,      // how much they suspect it is you
    milestonesSeen: [],
    people: neighbours.map((n) => ({
      ...n,
      putOut: null,    // array of bin types they have wheeled out
      copiedYou: false,
      lastOutcome: null,
    })),
  };
}

// Called at the end of a day, for a collection happening tomorrow morning.
export function decideStreet(state, rs, tomorrow) {
  const due = collectionsOn(tomorrow, rs);
  if (!due.length) return;

  const yourKerb = Object.values(state.bins)
    .filter((b) => b.atKerb && !b.neighbour)
    .map((b) => b.type);

  for (const person of state.street.people) {
    const canSeeYou = yourKerb.length > 0;
    const copies = canSeeYou && state.rand() < person.suggestibility;

    if (copies) {
      person.putOut = [...yourKerb];
      person.copiedYou = true;
    } else if (state.rand() < person.knowledge) {
      person.putOut = [...due];
      person.copiedYou = false;
    } else {
      // Misremembered on their own. Usually last cycle's bins.
      const all = Object.keys(rs.bins).filter((k) => rs.bins[k].active);
      const wrong = all.filter((b) => !due.includes(b));
      person.putOut = wrong.length ? [pick(state, wrong)] : [...due];
      person.copiedYou = false;
    }
  }
}

// Called on the collection morning itself.
export function resolveStreet(state, rs, log) {
  const due = collectionsOn(state.day, rs);
  if (!due.length) return;

  let wrongCopiers = 0;
  let rightCopiers = 0;
  let wrongTotal = 0;

  for (const person of state.street.people) {
    if (!person.putOut) continue;

    const correct =
      person.putOut.length === due.length &&
      person.putOut.every((b) => due.includes(b));

    person.lastOutcome = correct ? 'collected' : 'refused';
    if (!correct) {
      wrongTotal += 1;
      if (person.copiedYou) wrongCopiers += 1;
    } else if (person.copiedYou) {
      rightCopiers += 1;
    }
  }

  if (wrongTotal) {
    state.street.chaos += wrongTotal;
    log(
      `${wrongTotal} house${wrongTotal > 1 ? 's' : ''} on the street put the ` +
      'wrong bin out this morning.',
      wrongCopiers ? 'bad' : 'info'
    );
  }

  // Being followed and being right makes you the street's calendar.
  if (rightCopiers && !wrongCopiers) {
    state.standing += 1;
    log(`${rightCopiers} neighbour(s) followed your lead and got it right.`, 'good');
  }

  // Being followed and being wrong is how a road falls apart.
  if (wrongCopiers) {
    state.street.suspicion += wrongCopiers;
    log(
      `${wrongCopiers} of them only put it out because you did.`,
      'bad'
    );

    // They do not automatically know it was you — but they can work it out.
    const chanceFound = Math.min(0.85, 0.2 + state.street.suspicion * 0.12);
    if (state.rand() < chanceFound) {
      state.standing -= 4 * wrongCopiers;
      state.messages.unshift({
        from: 'Street WhatsApp group',
        day: state.day,
        unread: true,
        text:
          'Just to say — No. 40 had the wrong bin out again and the rest of ' +
          'us followed. Might be worth checking the calendar before you put ' +
          'yours out. No offence meant.',
      });
      log('The street has traced this morning back to your kerb.', 'bad');
    } else {
      log('Nobody has worked out where it started. Yet.', 'info');
    }
  }

  checkMilestones(state, log);

  for (const person of state.street.people) {
    person.putOut = null;
    person.copiedYou = false;
  }
}

function checkMilestones(state, log) {
  for (const m of chaosMilestones) {
    if (state.street.chaos < m.at || state.street.milestonesSeen.includes(m.at)) continue;
    state.street.milestonesSeen.push(m.at);
    if (m.standing) state.standing += m.standing;
    state.messages.unshift({ from: m.from, text: m.text, day: state.day, unread: true });
    log(`${m.from}: ${m.text}`, m.standing ? 'bad' : 'info');
  }
}

function pick(state, arr) {
  return arr[Math.floor(state.rand() * arr.length)];
}

// Used by the scene to draw the rest of the road.
export function streetView(state) {
  return state.street.people
    .filter((p) => p.putOut && p.putOut.length)
    .map((p) => ({
      id: p.id, name: p.name, side: p.side, slot: p.slot,
      bins: p.putOut, refused: p.lastOutcome === 'refused',
    }));
}
