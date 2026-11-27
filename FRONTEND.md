# Apostle front end

Instructions for building the interface. The product decisions below are settled. Visual details can be refined after the first screen exists.

**Apostle**
**Build your alliance. Test your allegiance.**

A private map of one person's professional circle. You are the root of a tree. Each tie shows closeness and two-way power.

This pass is the front end only. Build the screens, the tree, and the panels so they work on sample data. Put all network state behind one module, `src/model/store.ts`. The screen should call that module and not care where the data lives. A later pass will harden browser storage, the save-file migrations, and the LinkedIn parser. Stub those three functions so the buttons work in the session.

## Stack

- Vite, React, TypeScript.
- No component library and no default graph theme. The look is custom.
- Draw the rooted tree, the radial tree, and the rings as SVG.
- The graph layout can be simple. It still has to use the same nodes, colors, and type.
- Google fonts: Syne for the wordmark and labels, IBM Plex Mono for names and numbers. Syne should feel heavy. If a face fits the tone better, swap it, and keep it industrial.

## Look

Near-black field, cosmic and cyberpunk. Neon is the only light. No gray cards, no white page, no purple gradient.

Suggested tokens:

- Background `#05060a`
- Type `#f4f1ea`
- Red `#ff2d3a` — you hold more power
- Cyan `#3ef0ff` — they hold more power
- White `#f7f7f2` — power is even
- Amber `#ffb020`, violet `#b388ff`, green `#3dff9a`, magenta `#ff4fd8` — circle colors only

Rules:

- You are the brightest node, white-hot.
- A stronger tie is a brighter, larger node.
- Most edges are hairlines. A wide power gap burns hotter (thicker glow).
- Cyan means they hold more. Red means you hold more. White means even.
- Red is never a circle color.
- Private hold text is neon type on black. It never appears on the canvas.
- The first version does not animate. Hover may brighten a node. No drifting particles.

A tiny legend sits on the canvas: red "You hold more", cyan "They hold more", white "Even". Color is not the only signal.

Mood reference is a black field, neon points, a few hot edges, a huge wordmark, and empty space. Do not copy anyone else's name, logo, brain outline, or slogan.

## Screens

### Empty

Most of the viewport is black. **Apostle** is large, left, in heavy type. The motto sits under it. On the right, three actions:

- Add a person
- Import connections
- Load sample alliance

### In use

The wordmark shrinks to a small lockup at the top left, motto included. The tree fills the viewport.

- Left drawer: the practice list. It can collapse.
- Right drawer: the selected person. It opens on click and closes when the background is clicked.
- Bottom tray: people who are not on the tree yet.
- Top right: layout, cross-ties, download, open, import.

Below 800px, the drawers become full-screen sheets. The tree stays usable. Build desktop first.

## Layouts

One record, four drawings. Default is the rooted tree. Remember the last choice in the store.

- **Tree.** You at the top. Children below. This is the home.
- **Radial.** The same parent-child structure, you at the center, branches outward.
- **Rings.** Ignore rank. Place people in bands by closeness: inner, close, active, weak. You at the center.
- **Graph.** Parent lines plus cross-ties, for finding a path.

You place people. Drag a node onto another node to make it a child. Refuse a drag that would create a cycle. You cannot be dragged or deleted.

Cross-ties are extra links between people who know each other. Draw them as dim curves. The control is off until the user turns it on.

## A person

Fields:

- Name
- Company, title, profile URL, connected date
- Circle, chosen from a short editable list. The circle supplies the node hue from amber, violet, green, or magenta.
- Closeness, shown as the computed value, with a slider to override it and a way to clear the override
- Connection points: time together, shared interest, introduction, favor. Each has a note, a date, and a mutual flag.
- Power you hold, and power they hold
- The hold: one private line each way, "What you can use" and "What they can use"
- Stance, when a goal filter is on: with you, against you, uncommitted
- Delete, except for you

You, the root, can be renamed. You have no power row against yourself.

### Power

Six sources, each scored 0 to 3, in both directions:

- Access
- Dependence
- Debt
- Information
- Alternatives
- Standing

Show the sum, 0 to 18, next to each direction. The edge color compares the sums. A lead of 6 or more is a hot edge.

Use a red accent on "power you hold" and a cyan accent on "power they hold".

### Closeness

Computed, unless overridden:

- 0.08 with an empty log, otherwise start at 0.15
- Add 0.12 for each connection point, up to 6
- Add 0.15 if any point is in the last 30 days
- Add 0.10 if any point is mutual
- Cap at 1
- An override replaces this number

Node radius is about 4px plus closeness times 10px. You are about 14px. Opacity rises with closeness. You stay fully bright.

### Practice list

Computed from the record. Clicking a row highlights those people.

- **Cold.** The active goal includes them, and their last point is older than 90 days, or they have none.
- **Exposed.** Their power sum is higher, and closeness is under 0.45.
- **Unused.** Your power sum leads by 4 or more.
- **Bridge.** Closeness is under 0.35, and their circle has fewer than two other people.

These thresholds are starting points.

## Goals

A goal has a name. People on that goal have a stance. One goal can be active at a time, as a filter. People outside the goal dim.

## Import, open, save

The buttons exist in this pass. The durable versions get replaced later. Keep them in `src/model/store.ts`.

- **Download alliance** writes the JSON below.
- **Open alliance** reads that JSON back.
- **Import connections** reads a LinkedIn connections CSV the user downloaded. Map `First Name`, `Last Name`, `URL`, `Email Address`, `Company`, `Position`, and `Connected On`. Missing email, company, or title stay blank. Skip a row with no name. Skip a profile URL you already have. Do not set power, closeness, a parent, or a circle. New people land in the unplaced tray.

File shape:

```json
{
  "version": 1,
  "layout": "rooted",
  "showCrossTies": false,
  "you": { "id": "you", "name": "You" },
  "circles": [{ "id": "investors", "name": "Investors", "hue": "amber" }],
  "goals": [{ "id": "raise", "name": "Raise" }],
  "people": [],
  "crossTies": [{ "a": "id", "b": "id" }]
}
```

Each person:

```json
{
  "id": "mira",
  "name": "Mira Chen",
  "parentId": "you",
  "company": "",
  "title": "",
  "profileUrl": "",
  "connectedOn": "",
  "circleId": "investors",
  "goalId": "raise",
  "stance": "with",
  "closenessOverride": null,
  "points": [
    { "id": "p1", "kind": "time", "note": "Coffee", "at": "2026-11-01", "mutual": true }
  ],
  "youHold": { "access": 0, "dependence": 0, "debt": 0, "information": 1, "alternatives": 0, "standing": 0, "hold": "" },
  "theyHold": { "access": 3, "dependence": 0, "debt": 0, "information": 0, "alternatives": 0, "standing": 2, "hold": "" }
}
```

`parentId: null` means unplaced. `"you"` is not in `people`.

## Sample alliance

Load this from the empty screen so the tree is reviewable without a real network. Keep the names fictional.

- **You**, root.
- **Mira Chen**, under you, Investors, close, recent, they hold more. On the goal Raise, stance with you. Cross-tie to Naomi.
- **Andre Walsh**, under you, Team, close, you hold more. Stance with you.
- **Laila Okonkwo**, under you, on Raise, uncommitted, no recent point. She should show as cold.
- **Jonah Peck**, under Mira, weak, they hold much more, you hold nothing. He should show as exposed.
- **Sofia Rahman**, under Andre, your power leads by a wide margin. She should show as unused.
- **Chris Adelayo**, under you, weak, the only person in Press. He should show as a bridge.
- **Naomi Berg**, under you, cross-tie to Mira.
- **Ruth Ibarra**, under Naomi, on Raise, stance against you.
- **Evan Cho**, unplaced, as if just imported. Name and profile URL only.

Include a quiet way to clear the sample and return to the empty screen.

## Build order

1. Tokens, type, and the empty screen.
2. Sample data and the rooted tree, with the legend.
3. Selection and the person panel, including both power columns and the private hold.
4. Radial, rings, graph, and the cross-tie switch.
5. The practice list and the goal filter.
6. Add, edit, delete, and drag to place. Unplaced tray.
7. Download, open, and import, calling the store.

## Done when

- The empty screen is mostly black, with the wordmark, the motto, and the three actions.
- The sample reads as a constellation, not a chart.
- Red means you hold more. Cyan means they hold more. White means even.
- Dragging reparents, and a cycle is refused.
- Imported and new people start unplaced.
- The private hold is in the panel only.
- Refreshing can forget data in this pass. Download and open still round-trip the sample.
- Narrow screens open the drawers as sheets.

## Leave out

- Login, a server, analytics, and an agent chat
- Follow-up reminders and a contact inbox
- A live LinkedIn connection
- Scraping
- Publishing the user's network in the repo
