# Apostle

**Build your alliance. Test your allegiance.**

A private map of your professional circle. You sit at the root. The tree shows where people stand. Each tie shows how close it is and who holds power.

For one person: a founder, operator, organizer, or career-builder. One network for life. Spheres (such as Family, Workplace, Career, Friends, Community) and goals are filters on that network. Turn spheres on and off; with all of them on you see everyone.

## How to read this plan

**The aesthetic and theme are not negotiable.** Everything else, including numbers, features, and structure, is a starting suggestion. Change it when the build shows something better, and update this file when you do.

Keep the words plain. Someone tired after a long day should be able to sit down, see where they stand, and know what to do next. Cut any word that is there to sound cool.

Apostle starts as a static site and is meant to become mainly a desktop app. Build so that the move does not require a rewrite. A phone app may follow.

The first goal is a bare interface, running on the sample alliance, that can be played with. Real LinkedIn data waits.

## The tree

Home is a tree rooted at you. You place people. A weak tie with real power can sit near the top.

Cross-ties (people who know each other) are dim lines, off until you turn them on.

Same record, four layouts. New accounts open on the rooted tree. You can change the default.

- **Rooted tree.** You at the top. Default.
- **Radial tree.** You at the center, branches out.
- **Rings.** Closeness only: inner, close, active, weak.
- **Charts.** Simple charts, one at a time: who has the upper hand (pie), power (bars), closeness (histogram), contacts per month (line), or a table. Each can be shown per sphere or for everyone.

## Aesthetic (not negotiable)

Cosmic, cyber, neon against black. The field is space: near-black, mostly empty. Neon is the only light. Points like stars, lines like signals, a few of them hotter than the rest. A constellation and a command screen at the same time.

Claude chooses the layout, type, motion, and exact colors. The mood is the constraint. The screen is not a gray app and not a dashboard.

Harsh and sharp, with high contrast: pure black, white text, saturated red and cyan, tight glows, no soft color clouds. Keep effects few: no sweeps, pulses or scanlines.

Keep the interface stripped down. Panels are frosted glass: a thin line over a blur of the stars, never an opaque or tinted fill. No decorative glowing dots or colored outlines on tags; a sphere's color shows as a short flat bar. The glow belongs to the map's points and lines.

Power stays readable in that neon: cyan when they hold more, red when you hold more, white when it is even. Red is only for your power.

## A tie

**Closeness** changes the node. It comes from a log: time together, shared interests, who introduced you, favors, and how recent and mutual it is. You can override it. An empty log is a weak tie.

**Power** is separate from closeness. It runs both ways, and each side is a set of sources:

- Resources: access, money, opportunities
- Know-how: information, expertise
- Position: authority, standing, influence
- Ties: debt, reliance, alternatives, loyalty

A person's card lists only the sources that apply to them, so the longer list adds no clutter.

A number, if shown, is only the sum of those sources.

**Leverage** is one optional private line each way: what you can use, and what they can use. It stays off the map.

**Stance**, when you filter by a goal: with you, against you, or uncommitted.

## What it tells you

- Ties going cold on a goal you care about
- Where they hold more power than the closeness can carry
- Where you hold power you have not used
- Weak ties that are your only link to a sphere

## Saving your network

GitHub can store the code and host a static site. It cannot keep a private, changing network. Apostle does not need it to.

Your network lives in two places you control:

- **In the browser**, so a refresh does not wipe it.
- **In a file you download.** That file is the copy that lasts. You can open it on another computer. It is not committed to GitHub.

Updating the site replaces the pages. It does not replace the file. The file has a version number, so an older save still opens after the site changes.

A real account and sync can wait for the app. Until then there is no server database and no login.

## LinkedIn

You download your data from LinkedIn and import that file. Apostle does not connect to LinkedIn and does not scrape it.

Import relies only on a name, a profile URL, and the date you connected. The export is expected to stop including email, company, and title from December 20, 2026 (not yet verified with LinkedIn). Treat those as optional, and let the user fill them in.

Import adds people. It does not invent power, closeness, or where they sit on the tree. You place them after.

## Updates

- The code lives in a GitHub repo. A new version is a deploy of static files.
- The save file is versioned. When the shape of the data changes, opening an old file updates it in place and keeps every person.
- A short changelog in the repo says what changed.
- Your network is never part of the repo, so a public code repo does not publish your ties.

## Testing

Before a version is done, these have to pass:

- Import a LinkedIn connections file. The people show up with name, URL, and connected date.
- Refresh the page. The tree is still there.
- Download the save file, open it in a fresh browser. The tree matches.
- Deploy a new version and open an old save. Nobody is lost.
- Add, edit, delete, and move a person. Switch layouts. Turn cross-ties on and off.
- Change who holds power. Cyan if they hold more, red if you hold more, white if it is even.
- Empty state: no people yet, with a way to add one or import a file.

## First version

A static site in this look.

- Add, edit, delete, and place people
- Rooted tree, plus the other layouts and the cross-tie switch
- Closeness log, power sources, private leverage notes, goal focus, sphere filters
- Where you stand: counts for the goal, power and closeness, plus a list of who needs attention and why
- Browser save, file download, and file open
- LinkedIn connections import
- Only the motion the interface needs to feel clear and alive

## Who builds what

- **Claude: the front end.** The look, screens, map layouts, interactions, and the sample alliance. This includes a simple working version of the data module, so the interface runs from the start.
- **Cursor: the code-heavy work.** Hardening that module: browser storage, the save file, version migrations, the LinkedIn parser, edge cases, and tests. It also picks up gaps left after the front-end pass.

The data module's interface is the line between the two. The front end reads and changes the network only through it. Changes to that interface should be written down so both sides stay in step.

## Stack direction

The technical choice is left to the builder. This is the starting direction.

- A TypeScript web app, built to static files with Vite. The panels use React. The same code goes into a desktop shell later.
- The first pass draws the map in 2D on a canvas, with a parallax starfield for depth. Layout math lives in `src/map/layout.ts`, apart from drawing, so a 3D renderer (likely Three.js) can replace `src/map/MapView.ts` later. Any 3D version has to keep power colors, names, and tree structure readable.
- The desktop shell does not need to be chosen yet. Tauri is smaller and uses the system's web view, which differs between operating systems. Electron is larger and ships the same Chromium everywhere. Test the 3D map in the shell before committing to one.

## Building toward an app

These are choices to make now so the app is cheaper later. None of them means building the app now.

- Keep the data model and rules (closeness, power, practice list, tree moves) in plain code with no dependence on the page or the browser.
- Put storage behind an asynchronous interface. Browser storage is the first version of it. App storage or sync can replace it.
- Give every record a stable unique ID and a last-changed time, so sync stays possible.
- Support touch. Nothing should depend only on hover, a right click, or a keyboard.
- Give every drag action a second way to do it, such as a "Move under" control in the person panel.
- Keep colors, type, spacing, and motion values in one theme file, so an app can carry the same look.

## Later

- Desktop app
- Phone app
- Private sync across devices
- Agents that summarize and organize what you already wrote
- Richer motion

## Front-end brief

The front-end brief is in [FRONTEND.md](FRONTEND.md). It covers the map, the person, the practice list, and the sample. Claude decides type, motion, and exact colors inside the mood. Saving, the LinkedIn parse, and file migrations stay behind one data module.

## Not now

- A follow-up CRM
- A blank map you draw by hand
- A shared team account map
- An agent as the way you start
- A live LinkedIn connection
