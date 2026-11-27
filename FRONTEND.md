# Apostle front end

**Build your alliance. Test your allegiance.**

A private map of one person's professional circle. You are the root. The screen shows where people stand, how close a tie is, and which way the power runs.

This pass is the interface. It should work on a sample alliance before any real save file or LinkedIn account exists. Keep all network state behind one module so a later pass can harden browser storage, the save file, and the LinkedIn parser without redrawing the screen.

You choose the stack, the type, the motion, and the exact colors.

**The mood below is not negotiable.** The rest of this brief is a starting suggestion. Improve on it where the build shows something better, and update this file when you do.

Apostle is meant to become an app. Follow "Building toward an app" and "Who builds what" in [PLAN.md](PLAN.md).

## First pass, as built

Run it with `npm install` and `npm run dev`. The data module's interface is in [docs/DATA.md](docs/DATA.md).

| Choice | What and why |
|---|---|
| Stack | TypeScript, Vite, React for the panels. Builds to static files a desktop shell can load. |
| Map | 2D canvas in `src/map/MapView.ts`. Layout math is separate in `src/map/layout.ts`. |
| Depth | Three layers of stars that drift at different rates when you pan. |
| Type | Four bundled pairings, switchable from the Aa menu (see below). All work offline. |
| Theme | Every color, size and timing is in `src/theme.ts`. |
| Motion | Layout changes glide and new people rise out of their parent. A few stars twinkle. Reduced-motion settings turn these off. |

Design cues taken from the reference images: soft halos on small points, thin colored signal lines, condensed uppercase labels, thin frames with cut corners, and segmented meters with red on one side and cyan on the other for power.

Changes from the brief so far:

| Area | Now |
|---|---|
| Spheres | Groups of people such as Family, Workplace, Career. Toggles under the top bar choose which spheres count, on the map and in charts. All on is the full map; double-click one to see only it. Manage opens a screen with a column per sphere plus Unassigned, where you drag people between spheres, rename, hide or delete them. |
| Fourth view | Charts. Pick one chart (Upper hand pie, Power bars, Closeness histogram, Contacts per month line, or Table), then By sphere (one small card each) or All (one large chart). |
| Rings | Plain thin rings, each labeled with its level and count. Lines from you are colored by power. |
| Left panel | Where you stand: stance counts on the active goal and how many ties you lead or trail on power. Needs attention lists each person with the reason and the next step. |
| Wording | Plain and short: "Who knows who", "Leverage", "Not on the map", "Contact log". |
| Look | Pure black, white text, saturated red and cyan, tight glows. Frosted glass panels with thin white lines. No scanlines, grid, corner marks, sweeps, pulses, glowing UI dots or colored tag outlines. Solid white for the active tab and main button. The key starts closed. |
| Home | Clicking the Apostle wordmark returns to the home screen, which offers Open map. Clicking your own point opens your card. |
| Type | An Aa menu switches between Tektur with Kode Mono (default), Chakra Petch with JetBrains Mono, Oxanium with Share Tech Mono, and Saira with Martian Mono. The choice is saved on this computer. |
| Spheres to start | New and cleared maps start with Family, Workplace, Career and Friends. |

The sample loads with Raise as the active goal, so people not involved in it show faded.

## Mood (not negotiable)

Cosmic, cyber, neon against black.

The field is space. Near-black, deep, and mostly empty. Neon is the only light: points like stars, lines like signals, a few of them burning hotter than the rest. A constellation and a command screen at the same time. Quiet, vast, and sharp.

**Apostle** hits like a wordmark in that dark. The motto sits with it. The map occupies the rest.

Not a gray app. Not a dashboard. Not a friendly network diagram. Empty black is part of the design. Do not use a stock graph theme, a card grid, or a white page.

Meaning inside the neon:

- You are the brightest point.
- A stronger tie is brighter and larger.
- Most links are thin. A wide power gap burns hotter.
- Cyan means they hold more. Red means you hold more. White means even.
- Red is only for your power. Other neon hues mark spheres.
- Leverage notes are neon writing on black, and they never appear on the map.
- Say the color meanings in words somewhere small, so color is not the only signal.

### Reference images

Reference images live in `reference photos/` on the owner's computer. Git ignores that folder. Treat them as a mood board for feel, not as a design to copy.

### Depth

3D rendering is welcome where it serves the mood, such as depth in the field and the map. Readability comes first. See "Stack direction" in [PLAN.md](PLAN.md).

## Screens

### Empty

Most of the view is black, with the wordmark and the motto. Three ways in: add a person, import connections, load a sample alliance.

### In use

The wordmark recedes. The map fills the dark.

- Where you stand, collapsible: the summary and the needs-attention list.
- The selected person, open on click, closed when the background is clicked.
- A bottom bar of people who are not on the map yet.
- Controls for layout, cross-ties, download, open, and import.

On a narrow screen the panels become sheets. The map stays usable. Design the wide screen first.

## The map

One record, four drawings. A new session opens on the rooted tree. Remember the last choice.

- **Tree.** You at the top. Children below. This is home.
- **Radial.** The same parent-child structure, you at the center, branches outward.
- **Rings.** Ignore rank. Place people in bands by closeness: inner, close, active, weak. You at the center.
- **Charts.** Not a map. Simple charts per sphere or for everyone; see the table above.

You place people. Drag a node onto another to make it a child. Drag it onto you to place it directly under you. Refuse a drag that would create a cycle. You cannot be dragged or deleted. The person panel offers the same moves without dragging.

- **Unplaced** means a person's chain of parents does not reach you. They appear in the tray.
- **Move to tray:** drag a person there. Their `parentId` becomes null. The people under them go with them and keep their structure.
- **Placing from the tray:** the person brings the people under them. The tray shows that group under its top person.
- **Delete:** the people directly under the deleted person move up to that person's parent. If the deleted person had no parent, those people have none either and stay in the tray. Nobody else is ever deleted.

Cross-ties are extra links between people who know each other. Draw them dim. The control is off until it is turned on.

Pan and zoom the map.

## A person

- Name
- Company, title, profile URL, connected date
- Sphere, from a short editable list
- Closeness, computed from the log, with a way to override it and a way to clear the override
- Connection points: time together, shared interest, introduction, favor. Each has a note, a date, and a mutual flag
- Power you hold, and power they hold
- Leverage: one private line each way, "What you can use" and "What they can use"
- Stance, when a goal filter is on: with you, against you, or uncommitted
- Delete, except for you

You, the root, can be renamed. You have no power row against yourself.

### Power

Six sources, each scored 0 to 3, in both directions: access, dependence, debt, information, alternatives, standing. Show each sum. The link color compares the sums. A lead of 6 or more is a hot link.

Accent "power you hold" in red and "power they hold" in cyan.

### Closeness

Computed, unless overridden. The override replaces the computed value. The node gets brighter and larger as closeness rises. You stay the brightest.

Starting formula:

- Each logged point is worth 1. A mutual point is worth 1.5 times as much.
- Multiply by recency: 1 if it is 90 days old or newer, 0.5 if up to 365 days, 0.25 if older.
- Add the points and cap the total at 10.

| Band | Score |
|---|---|
| Inner | 7 or more |
| Close | 4.5 to under 7 |
| Active | 2 to under 4.5 |
| Weak | under 2, including an empty log |

An override picks a band.

### Needs attention

Shown on screen as Going cold, They have leverage, You have leverage, and Your only link, each with a one-line next step.

Computed. Clicking a row highlights those people. A person can appear under more than one heading.

- **Cold.** On the active goal, and the last point is more than 90 days old, or there is none. With no active goal, nobody is cold.
- **Exposed.** Their power sum is higher by any amount, and the band is active or weak.
- **Unused.** Your power sum leads by 4 or more. Apostle does not track whether you have used it, so the screen should not claim to know.
- **Bridge.** The band is weak, they have a sphere, and they are the only person in it.

Keep every number in this section and the hot-link threshold in one place, so they are easy to tune.

## Goals

A goal has a name. People on that goal have a stance. One goal can be active at a time. While one is active, people outside it dim.

## Import, open, save

The buttons work in this pass in a simple form. Cursor hardens them later, behind the same data module.

- **Download alliance** writes the network to a file.
- **Open alliance** reads that file back.
- **Import connections** reads a LinkedIn connections file the user downloaded. Take name, profile URL, and the date connected. Email, company, and title may be missing. Skip a row with no name. Skip a profile URL you already have. Do not invent power, closeness, a parent, or a sphere. New people land in the unplaced tray.

The file has a version number. It holds you, people, spheres, goals, the active goal, cross-ties, the layout, whether cross-ties are showing, and which spheres are hidden. Every record has a stable unique ID and a last-changed time. You have your own ID and are not in the people list. A person directly under you uses your ID as their `parentId`. A null `parentId` means they have no parent.

## Sample alliance

Load this from the empty screen so the map is reviewable without a real network. Keep the names fictional. Include a quiet way to clear it and return to the empty screen.

The active goal on load is **Raise**. Set sample dates relative to the day it is loaded, so the flags do not change as time passes.

| Person | Parent | Sphere | Band | Power | On Raise | Should be flagged |
|---|---|---|---|---|---|---|
| Mira Chen | You | Investors | Close, recent | They lead | With you | None |
| Andre Walsh | You | Work | Close, recent | You lead by under 4 | With you | None |
| Laila Okonkwo | You | Advisors | Active, last point over 90 days old | Even | Uncommitted | Cold |
| Jonah Peck | Mira | Investors | Weak | They lead by 6 or more; you have 0 | No | Exposed |
| Sofia Rahman | Andre | Work | Active | You lead by 6 or more | No | Unused |
| Chris Adelayo | You | Press (only member) | Weak | Even | No | Bridge |
| Naomi Berg | You | Advisors | Active | Even | No | None |
| Ruth Ibarra | Naomi | Investors | Active, recent | Even | Against you | None |
| Leo Varga | You | Family | Inner, recent | Even | No | None |
| Priya Nair | You | Friends | Active | Even | No | None |
| Tom Brennan | Priya | Friends | Weak | Even | No | None |
| Evan Cho | Unplaced | None | Weak (empty log) | Even, all 0 | No | None |

You are the root. Cross-ties: Mira and Naomi, Jonah and Ruth, Laila and Naomi, Chris and Mira, Priya and Andre, Sofia and Priya. Evan has only a name and profile URL, as if just imported.

An older point counts for less, so Laila's log needs enough points to stay Active.

## Leave out

- Login, a server, analytics, and an agent chat
- Follow-up reminders and a contact inbox
- A live LinkedIn connection
- Scraping
- Publishing the user's network in the repo
