# Apostle

**Build your alliance. Test your allegiance.**

A private map of your professional circle. You sit at the root. The tree shows where people stand. Each tie shows how close it is and who holds power.

For one person: a founder, operator, organizer, or career-builder. One network for life. Circles and goals are filters on that network.

## The tree

Home is a tree rooted at you. You place people. A weak tie with real power can sit near the top.

Cross-ties (people who know each other) are dim lines, off until you turn them on.

Same record, four layouts. New accounts open on the rooted tree. You can change the default.

- **Rooted tree.** You at the top. Default.
- **Radial tree.** You at the center, branches out.
- **Rings.** Closeness only: inner, close, active, weak.
- **Graph.** Cross-ties on, for finding a path.

## Aesthetic

Cosmic, cyber, neon against black. The field is space: near-black, mostly empty. Neon is the only light. Points like stars, lines like signals, a few of them hotter than the rest. A constellation and a command screen at the same time.

Claude chooses the layout, type, motion, and exact colors. The mood is the constraint. The screen is not a gray app and not a dashboard.

Power stays readable in that neon: cyan when they hold more, red when you hold more, white when it is even. Red is only for your power.

## A tie

**Closeness** changes the node. It comes from a log: time together, shared interests, who introduced you, favors, and how recent and mutual it is. You can override it. An empty log is a weak tie.

**Power** is separate from closeness. It runs both ways, and each side is a set of sources:

- Access
- Dependence
- Debt
- Information
- Alternatives
- Standing

A number, if shown, is only the sum of those sources.

**The hold** is one optional private line each way: what you can use, and what they can use. It stays off the tree.

**Stance**, when you filter by a goal: with you, against you, or uncommitted.

## What it tells you

- Ties going cold on a goal you care about
- Where they hold more power than the closeness can carry
- Where you hold power you have not used
- Weak ties that bridge a circle you are outside

## Saving your network

GitHub can store the code and host a static site. It cannot keep a private, changing network. Apostle does not need it to.

Your network lives in two places you control:

- **In the browser**, so a refresh does not wipe it.
- **In a file you download.** That file is the copy that lasts. You can open it on another computer. It is not committed to GitHub.

Updating the site replaces the pages. It does not replace the file. The file has a version number, so an older save still opens after the site changes.

A real account and sync can wait for the app. Until then there is no server database and no login.

## LinkedIn

You download your data from LinkedIn and import that file. Apostle does not connect to LinkedIn and does not scrape it.

The connections export gives a name, a profile URL, and the date you connected. From December 20, 2026 it no longer includes email, company, or title. Those stay fields you fill in.

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
- Closeness log, power sources, private hold, goal filters
- The list above
- Browser save, file download, and file open
- LinkedIn connections import

## Later

- Phone app
- Private sync across devices
- Agents that summarize and organize what you already wrote
- Motion

## Front-end brief

The front-end brief is in [FRONTEND.md](FRONTEND.md). It covers the map, the person, the practice list, and the sample. Claude decides type, motion, and exact colors inside the mood. Saving, the LinkedIn parse, and file migrations stay behind one data module.

## Not now

- A follow-up CRM
- A blank map you draw by hand
- A shared team account map
- An agent as the way you start
- A live LinkedIn connection
