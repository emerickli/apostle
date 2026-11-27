# Apostle front end

**Build your alliance. Test your allegiance.**

A private map of one person's professional circle. You are the root. The screen shows where people stand, how close a tie is, and which way the power runs.

This pass is the interface. It should work on a sample alliance before any real save file or LinkedIn account exists. Keep all network state behind one module so a later pass can harden browser storage, the save file, and the LinkedIn parser without redrawing the screen.

You choose the stack, the type, the motion, and the exact colors. The mood and the behavior below are the constraint.

## Mood

Cosmic, cyber, neon against black.

The field is space. Near-black, deep, and mostly empty. Neon is the only light: points like stars, lines like signals, a few of them burning hotter than the rest. A constellation and a command screen at the same time. Quiet, vast, and sharp.

**Apostle** hits like a wordmark in that dark. The motto sits with it. The map occupies the rest.

Not a gray app. Not a dashboard. Not a friendly network diagram. Empty black is part of the design. Do not use a stock graph theme, a card grid, or a white page.

Meaning inside the neon:

- You are the brightest point.
- A stronger tie is brighter and larger.
- Most links are thin. A wide power gap burns hotter.
- Cyan means they hold more. Red means you hold more. White means even.
- Red is only for your power. Other neon hues can mark circles.
- The private hold is neon writing on black, and it never appears on the map.
- Say the color meanings in words somewhere small, so color is not the only signal.

## Screens

### Empty

Most of the view is black, with the wordmark and the motto. Three ways in: add a person, import connections, load a sample alliance.

### In use

The wordmark recedes. The map fills the dark.

- A practice list, collapsible.
- The selected person, open on click, closed when the background is clicked.
- A tray of people who are not on the tree yet.
- Controls for layout, cross-ties, download, open, and import.

On a narrow screen the panels become sheets. The map stays usable. Design the wide screen first.

## The map

One record, four drawings. A new session opens on the rooted tree. Remember the last choice.

- **Tree.** You at the top. Children below. This is home.
- **Radial.** The same parent-child structure, you at the center, branches outward.
- **Rings.** Ignore rank. Place people in bands by closeness: inner, close, active, weak. You at the center.
- **Graph.** Parent lines plus cross-ties, for finding a path.

You place people. Drag a node onto another to make it a child. Refuse a drag that would create a cycle. You cannot be dragged or deleted.

Cross-ties are extra links between people who know each other. Draw them dim. The control is off until it is turned on.

Pan and zoom the map.

## A person

- Name
- Company, title, profile URL, connected date
- Circle, from a short editable list
- Closeness, computed from the log, with a way to override it and a way to clear the override
- Connection points: time together, shared interest, introduction, favor. Each has a note, a date, and a mutual flag
- Power you hold, and power they hold
- The hold: one private line each way, "What you can use" and "What they can use"
- Stance, when a goal filter is on: with you, against you, or uncommitted
- Delete, except for you

You, the root, can be renamed. You have no power row against yourself.

### Power

Six sources, each scored 0 to 3, in both directions: access, dependence, debt, information, alternatives, standing. Show each sum. The link color compares the sums. A lead of 6 or more is a hot link.

Accent "power you hold" in red and "power they hold" in cyan.

### Closeness

Computed, unless overridden. An empty log is weak. Points, recency, and mutual effort raise it. Cap it. The override replaces the computed value. The node gets brighter and larger as closeness rises. You stay the brightest.

### Practice list

Computed. Clicking a row highlights those people.

- **Cold.** On the active goal, and the last point is older than 90 days, or there is none.
- **Exposed.** Their power sum is higher, and the tie is not close.
- **Unused.** Your power sum leads by a clear margin.
- **Bridge.** The tie is weak, and their circle has almost nobody else in it.

These thresholds are starting points.

## Goals

A goal has a name. People on that goal have a stance. One goal can be active at a time. People outside it dim.

## Import, open, save

The buttons exist in this pass. The durable versions can be replaced later.

- **Download alliance** writes the network to a file.
- **Open alliance** reads that file back.
- **Import connections** reads a LinkedIn connections file the user downloaded. Take name, profile URL, and the date connected. Email, company, and title may be missing. Skip a row with no name. Skip a profile URL you already have. Do not invent power, closeness, a parent, or a circle. New people land in the unplaced tray.

The file has a version number. It holds you, people, circles, goals, cross-ties, the layout, and whether cross-ties are showing. `parentId` null means unplaced. You are not in the people list.

## Sample alliance

Load this from the empty screen so the map is reviewable without a real network. Keep the names fictional. Include a quiet way to clear it and return to the empty screen.

- **You**, root.
- **Mira Chen**, under you, investors, close, recent, they hold more. On the goal Raise, with you. Cross-tie to Naomi.
- **Andre Walsh**, under you, team, close, you hold more. With you.
- **Laila Okonkwo**, under you, on Raise, uncommitted, no recent point. She reads as cold.
- **Jonah Peck**, under Mira, weak, they hold much more, you hold nothing. He reads as exposed.
- **Sofia Rahman**, under Andre, your power leads by a wide margin. She reads as unused.
- **Chris Adelayo**, under you, weak, the only person in press. He reads as a bridge.
- **Naomi Berg**, under you, cross-tie to Mira.
- **Ruth Ibarra**, under Naomi, on Raise, against you.
- **Evan Cho**, unplaced, name and profile URL only, as if just imported.

## Leave out

- Login, a server, analytics, and an agent chat
- Follow-up reminders and a contact inbox
- A live LinkedIn connection
- Scraping
- Publishing the user's network in the repo
