// The sample alliance. Fictional people. Dates are relative to the day it loads,
// so the practice flags stay the same no matter when it is opened.

import { FILE_FORMAT, FILE_VERSION, emptyPower, type Alliance, type Person, type PointKind, type PowerSet } from './model';
import { newId } from './id';
import { toDateString } from './rules';

export function buildSample(now = new Date()): Alliance {
  const stamp = now.toISOString();
  const ago = (days: number) => toDateString(new Date(now.getTime() - days * 86_400_000));
  const pt = (kind: PointKind, days: number, note: string, mutual = false) => ({
    id: newId(), kind, date: ago(days), note, mutual,
  });
  const pw = (p: Partial<PowerSet>): PowerSet => ({ ...emptyPower(), ...p });

  const meId = newId();
  const sphere = (name: string, color: number) => ({ id: newId(), name, color, updatedAt: stamp });
  const family = sphere('Family', 0);
  const workplace = sphere('Workplace', 2);
  const career = sphere('Career', 1);
  const friends = sphere('Friends', 3);
  const community = sphere('Community', 4);
  const raise = { id: newId(), name: 'Raise', updatedAt: stamp };

  const person = (p: Partial<Person> & Pick<Person, 'name'>): Person => ({
    id: newId(), company: '', title: '', url: '', connectedOn: null, sphereId: null, parentId: meId,
    points: [], closenessOverride: null, powerYou: emptyPower(), powerThem: emptyPower(),
    holdYou: '', holdThem: '', stances: {}, updatedAt: stamp, ...p,
  });

  const mira = person({
    name: 'Mira Chen', company: 'Halcyon Ventures', title: 'Partner', sphereId: career.id,
    connectedOn: ago(820),
    points: [
      pt('time', 9, 'Breakfast before her partner meeting', true),
      pt('interest', 31, 'Both spoke on the climate hardware panel', true),
      pt('intro', 58, 'She introduced me to two of her portfolio founders', true),
      pt('favor', 210, 'I reviewed a deck for one of her companies'),
    ],
    powerYou: pw({ access: 1, debt: 1, information: 1, alternatives: 1 }),
    powerThem: pw({ access: 3, dependence: 1, information: 2, alternatives: 1, standing: 2 }),
    holdYou: 'She wants first look at the seed round.',
    holdThem: 'She knows how short the runway is.',
    stances: { [raise.id]: 'with' },
  });
  const andre = person({
    name: 'Andre Walsh', company: 'Foundry Nine', title: 'Engineering lead', sphereId: workplace.id,
    connectedOn: ago(1400),
    points: [
      pt('time', 4, 'Late night on the launch build', true),
      pt('favor', 19, 'Covered the on-call week for him', true),
      pt('interest', 44, 'Same climbing gym'),
      pt('time', 150, 'Offsite in Lisbon', true),
    ],
    powerYou: pw({ access: 2, dependence: 2, debt: 1, information: 1, alternatives: 1, standing: 1 }),
    powerThem: pw({ access: 2, dependence: 1, debt: 1, information: 1, standing: 1 }),
    holdYou: 'His equity vests next spring.',
    holdThem: 'He is the only one who knows the billing code.',
    stances: { [raise.id]: 'with' },
  });
  const laila = person({
    name: 'Laila Okonkwo', company: 'Kestrel Partners', title: 'Operating partner', sphereId: career.id,
    connectedOn: ago(600),
    points: [
      pt('intro', 122, 'Introduced by Naomi', true),
      pt('time', 180, 'Coffee after the operators dinner', true),
      pt('interest', 240, 'Shared a reading list on pricing'),
      pt('favor', 300, 'She reviewed the hiring plan'),
    ],
    powerYou: pw({ access: 2, debt: 1, information: 1, standing: 1 }),
    powerThem: pw({ access: 1, information: 2, standing: 1 }),
    stances: { [raise.id]: 'uncommitted' },
  });
  const naomi = person({
    name: 'Naomi Berg', company: 'Fieldstone', title: 'Advisor', sphereId: career.id,
    connectedOn: ago(900),
    points: [
      pt('time', 24, 'Monthly advisor call', true),
      pt('intro', 101, 'Introduced me to Laila'),
      pt('interest', 200, 'Both on the founder mentoring list'),
    ],
    powerYou: pw({ access: 2, information: 2, alternatives: 1, standing: 1 }),
    powerThem: pw({ access: 2, standing: 2 }),
  });
  const chris = person({
    name: 'Chris Adelayo', company: 'The Ledger Wire', title: 'Reporter', sphereId: community.id,
    connectedOn: ago(500),
    points: [pt('interest', 410, 'Quoted me in a piece on hardware startups')],
    powerYou: pw({ access: 1 }),
    powerThem: pw({ information: 1 }),
  });
  const jonah = person({
    name: 'Jonah Peck', company: 'Halcyon Ventures', title: 'Managing director', sphereId: career.id,
    parentId: mira.id, connectedOn: ago(40),
    points: [pt('intro', 40, 'Mira brought him to the demo')],
    powerThem: pw({ access: 3, dependence: 2, information: 2, alternatives: 3, standing: 3 }),
    holdThem: 'He can tell Mira to pass.',
  });
  const sofia = person({
    name: 'Sofia Rahman', company: 'Foundry Nine', title: 'Product designer', sphereId: workplace.id,
    parentId: andre.id, connectedOn: ago(300),
    points: [
      pt('time', 15, 'Design review'),
      pt('interest', 70, 'Both obsessed with type', true),
    ],
    powerYou: pw({ access: 3, dependence: 2, debt: 3, information: 1, alternatives: 2, standing: 1 }),
    powerThem: pw({ access: 1, information: 1, standing: 1 }),
    holdYou: 'I wrote the reference that got her the visa.',
  });
  const ruth = person({
    name: 'Ruth Ibarra', title: 'Angel investor', sphereId: career.id, parentId: naomi.id,
    connectedOn: ago(260),
    points: [
      pt('time', 12, 'Lunch, she pushed hard on margins'),
      pt('interest', 50, 'Same hardware angels group'),
      pt('favor', 150, 'Sent her a candidate for her portfolio'),
    ],
    powerYou: pw({ access: 1, information: 1 }),
    powerThem: pw({ information: 1 }),
    stances: { [raise.id]: 'against' },
  });
  const leo = person({
    name: 'Leo Varga', title: 'Cousin', company: 'Varga Machine Works', sphereId: family.id,
    points: [
      pt('time', 3, 'Sunday dinner', true),
      pt('favor', 7, 'He fixed the prototype housing overnight', true),
      pt('time', 20, 'Helped him move', true),
      pt('favor', 35, 'Lent him the van', true),
      pt('interest', 60, 'Motorbike trip', true),
      pt('time', 100, 'Family reunion', true),
    ],
    powerYou: pw({ access: 1, debt: 1 }),
    powerThem: pw({ access: 1, debt: 2, standing: 1 }),
    holdThem: 'He knows how much I put into the company.',
  });
  const nora = person({
    name: 'Nora Ellis', title: 'Sister', company: 'City hospital', sphereId: family.id,
    points: [
      pt('time', 12, 'Her birthday dinner', true),
      pt('time', 25, 'Coffee after her shift', true),
      pt('favor', 40, 'She watched the dog for a week', true),
      pt('interest', 95, 'Half marathon together', true),
    ],
    powerYou: pw({ debt: 1 }),
    powerThem: pw({ debt: 1, information: 1 }),
  });
  const priya = person({
    name: 'Priya Nair', company: 'Northgate', title: 'Product lead', sphereId: friends.id,
    connectedOn: ago(2200),
    points: [
      pt('time', 30, 'Run club', true),
      pt('interest', 75, 'Swapped notes on hiring designers'),
    ],
    powerYou: pw({ access: 1, information: 1, standing: 1 }),
    powerThem: pw({ access: 1, information: 1 }),
  });
  const tom = person({
    name: 'Tom Brennan', company: 'Brennan & Ko', title: 'Lawyer', sphereId: friends.id, parentId: priya.id,
    connectedOn: ago(700),
    points: [pt('time', 200, 'Met at Priya\'s birthday')],
    powerYou: pw({ access: 1, information: 1, standing: 1 }),
    powerThem: pw({ information: 1 }),
  });
  const evan = person({
    name: 'Evan Cho', parentId: null, url: 'https://linkedin.example/in/evan-cho',
  });

  return {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    me: { id: meId, name: 'You', updatedAt: stamp },
    people: [mira, andre, laila, jonah, sofia, chris, naomi, ruth, leo, nora, priya, tom, evan],
    spheres: [family, workplace, career, friends, community],
    goals: [raise],
    activeGoalId: raise.id,
    crossTies: [
      [mira, naomi], [jonah, ruth], [laila, naomi], [chris, mira], [priya, andre], [sofia, priya],
    ].map(([a, b]) => ({ id: newId(), a: a.id, b: b.id, updatedAt: stamp })),
    layout: 'tree',
    showCrossTies: false,
    hiddenSpheres: [],
    updatedAt: stamp,
  };
}
