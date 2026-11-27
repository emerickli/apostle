# Data module

The interface reads and changes the alliance only through the store in `src/core/store.ts`. Everything in `src/core/` is plain TypeScript with no page or browser code, so a desktop or phone app can reuse it. If you change anything below, update this file.

## Files

| File | What it holds |
|---|---|
| `src/core/model.ts` | The alliance shape, file format name and version |
| `src/core/store.ts` | `createStore(storage)` and every action that changes the alliance |
| `src/core/rules.ts` | Closeness score and band, power sums and balance, the practice list |
| `src/core/thresholds.ts` | Every tunable number used by the rules |
| `src/core/tree.ts` | Placed people, descendants, move checks, tray groups |
| `src/core/derive.ts` | All computed values for one moment: visible people, bands, balances, needs attention, the standing summary |
| `src/core/stats.ts` | Numbers for the Charts view: per person, per sphere, contacts per month |
| `src/core/view.ts` | Which people are visible given hidden spheres, and the alliance as drawn |
| `src/core/migrate.ts` | `readAlliance(raw)`: reads any saved alliance into the current shape |
| `src/core/linkedin.ts` | First version of the LinkedIn `Connections.csv` parser |
| `src/core/sample.ts` | The sample alliance, with dates relative to the day it loads |
| `src/platform/browser.ts` | Browser storage, file download and file picking |

## Store

`createStore(storage, clock?)` returns:

`ready` is a promise that settles after the saved alliance loads. `getState()` and `subscribe(fn)` work with React's `useSyncExternalStore`. `flush()` writes immediately instead of waiting for the 250 ms debounce.

Actions on the whole alliance are `replace`, `loadSample` and `clear`. `clear` keeps your own record and the layout. A new or cleared alliance starts with the spheres Family, Workplace, Career and Friends.

For you, there is `renameMe`.

For people: `addPerson(init?)` returns the new id and places the person under you unless `init.parentId` says otherwise. `updatePerson(id, patch)` changes name, company, title, URL, connected date, sphere, override and the two leverage lines (`holdYou`, `holdThem`), gender and photo. `setOverride(id, band | null)` and `setPower(id, 'you' | 'them', source, 0..3)` do what they say. `deletePerson(id)` moves the deleted person's direct children up to its parent and drops its cross-ties. `movePerson(id, parentId | null)` returns `{ ok }` or `{ ok: false, reason }` with `reason` one of `self`, `cycle`, `root`, `missing`. A null parent sends the person to the tray, and the people under them go with them.

Points: `addPoint`, `updatePoint`, `removePoint`.

Spheres: `addSphere(name)` returns the id and picks the first unused color. `renameSphere` and `deleteSphere` also exist. Deleting a sphere clears it from its people. Visibility: `setSphereVisible(id, visible)`, `showAllSpheres()` and `soloSphere(id)`. People with no sphere use the id `NO_SPHERE` (`'none'`). Hidden ids are saved in `hiddenSpheres`.

Goals: `addGoal(name)` makes the new goal active. `renameGoal`, `deleteGoal`, `setActiveGoal(id | null)` and `setStance(personId, goalId, stance | null)` round it out. A null stance takes the person off the goal.

Cross-ties: `addCrossTie(a, b)` ignores duplicates and self-ties. `removeCrossTie(id)`.

View settings saved with the file: `setLayout`, `setShowCrossTies`.

Import: `importConnections(rows)` returns `{ added, skippedNoName, skippedDuplicate }`. It adds people to the tray with no power, closeness, parent or sphere. Profile URLs are compared after `normalizeProfileUrl`.

## Storage adapter

```ts
interface StorageAdapter {
  load(): Promise<unknown | null>;
  save(alliance: Alliance): Promise<void>;
}
```

The browser version uses `localStorage` under the key `apostle.alliance`. A desktop shell supplies its own adapter and replaces `src/platform/browser.ts`.

## Save file

The file is the alliance object as JSON, with `format: "apostle-alliance"` and `version: 1`. Every record has an `id` and an `updatedAt` time. You are `me` and not in `people`. A `parentId` equal to `me.id` means directly under you, and null means no parent.

Early saves used `circles` and `circleId`. `readAlliance` still accepts those names.

Version 2 adds a Family sphere to any version 1 save that has none. It runs once, so a Family sphere deleted later stays deleted.

The fourth layout is `charts`. Saves that say `graph` open as `charts`.

Power sources are listed in `SOURCES` in `model.ts`. Adding a source needs no version bump: missing scores read as 0. The id `dependence` is shown as Reliance and `bond` as Loyalty.

To change the shape, raise `FILE_VERSION` in `model.ts` and add a step to `steps` in `migrate.ts` that upgrades the previous version. Files from a newer version are refused with a message rather than read badly.

## For Cursor to harden

1. Storage: quota errors, a corrupt saved value, and two open tabs writing at once.
2. The LinkedIn parser against real exports, including other date formats and languages.
3. Validation in `readAlliance` beyond filling defaults, for example parent chains that point at missing people.
4. `chartStats` in `src/core/stats.ts` scans every point for each sphere. Fine for hundreds of people; index by month if it slows.
5. Tests: `npm test` runs the starter tests in `src/core/__tests__/`.
6. Photos. `Person.photo` holds a 320px square JPEG as a data URL (about 25 KB each), and `Person.gender` ('female' | 'male' | 'other') picks the default avatar. Both were added without a version bump: `readAlliance` fills `gender: 'other'` and `photo: null` for older saves. Browser storage tops out near 5 MB, so a few hundred photos will hit the quota. In the desktop app, move photos to files beside the save and keep only a path here.
