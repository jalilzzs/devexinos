# DEVEXINOS — Part 1: The Mansion

A lightweight first-person 3D horror game for the web (Three.js r128, plain JavaScript, no build step).
Fred Benson wakes with amnesia in a cursed mansion and must rebuild a doll one part at a time while **Devexinos** hunts the east gallery.

## Run

Open `index.html` in Chrome / Edge / Firefox / Safari (internet needed once for the Three.js CDN).
Better: serve the folder (`npm start`, or `python3 -m http.server 8080`) so `assets/manifest.json` loads too. Drag-and-drop of custom assets works even from `file://`.
On phones the touch controls appear automatically (Settings → *Preview touch controls on PC* lets you test them on a computer).

## Project structure

```
index.html            page structure (menus, HUD, phone, modals)
bg.png                main-menu background
package.json          scripts + metadata
css/style.css         all styling (menu, HUD, phone, camera mode)
js/
├─ i18n.js            translations: Arabic, English, French, Chinese (+ all phone chats)
├─ persistence.js     settings, save state, IndexedDB asset storage, drag-and-drop loader
├─ audio.js           Web Audio engine (synth fallbacks + custom sfx_/bgm_ files)
├─ ui.js              screens, subtitles, toast, fades, log/inventory, overlays
├─ world.js           procedural mansion + basement, props, items, custom GLB routing
├─ weapons.js         flashlight and camera-flash (Fred carries no weapons)
├─ player.js          input (keyboard/mouse/touch), movement, camera, interaction, hiding
├─ npc.js             Devexinos: model/skin, navigation grid, patrol/chase/search AI
├─ missions.js        items, journals, the 4 puzzles, doll fusing, burning ritual, objectives
├─ cutscenes.js       level transitions, wake-up intro, the ending
├─ phone.js           the phone: chats, camera, gallery, notes, save, flashlight, settings
├─ systems.js         danger meter, heartbeat, whispers, lights, animations, game clock
└─ main.js            game loop, start/continue, menu wiring, boot
assets/               your own models and audio (see below)
```

Scripts are plain (non-module) so the game also runs from `file://`. **Load order matters** and is set in `index.html`:
`i18n → persistence → audio → ui → world → weapons → player → npc → missions → cutscenes → phone → systems → main`.
(The repo you showed has `cars/` and `city/` folders for a city game; a one-mansion horror game has no use for them, so `assets/` replaces them.)

## Controls

| PC | Touch |
|---|---|
| WASD move · Mouse look | Left joystick · drag the screen to look |
| E interact · F flashlight | ✋ / 🔦 buttons |
| C crouch · Shift run | 🧎 / 🏃 toggle buttons |
| **P phone** · I inventory · L story log · Esc menu | **📱** / 🎒 / 📖 / ☰ |

Every touch button can be resized and dragged (Settings → Edit button layout). Positions are saved.

## The phone (press P)

Fred's cracked phone has no signal, but everything saved on it is readable. The game pauses while the phone is open (except in Camera mode).

- **Messages** — five threads: **Amira** (his wife; the last chat from two years ago, just before she fell into the coma), **My boys** (Adam and Yanis, writing from Grandma's phone), **Mama Zohra**, **Karim** (friend) and an **Unknown number**. New messages arrive as the story progresses: the unknown number counts your doll parts, Amira writes again after you fuse the doll, and again after the ritual. A 📱 button lights up and the phone vibrates on new messages.
- **Camera** — a viewfinder while you keep playing. Click / Space / shutter button to shoot. Photos are stamped with time and room, kept in **Gallery** (max 24, downloadable as JPG). **The flash can attract Devexinos**, and if it is in frame the photo is flagged ⚠.
- **Gallery** — view, download or delete photos.
- **Notes** — your current goal and doll-part progress.
- **Flashlight** — toggle the light.
- **Save** — save now (the game also autosaves every 20 s and at key moments).
- **Settings** — language, master volume, full settings, back to main menu.

## Walkthrough (spoilers)

1. **Bedroom** — pick up the passport, ID card and the first journal page. Reading it makes something groan: the bookcase blocking the **Study** slides away.
2. **Head (coded safe)** — Study wall safe. Clues: page 1 (the 28th), page 2 in Amira's room (seventh month), page 3 in the Study (day first, then month). Code: **2807**.
3. **Arms (rusted keys)** — both keys are in the **Gallery**, patrolled by Devexinos. Crouch, keep the flashlight off when you can, hide in lockers (E). The Kitchen storeroom has two locks and needs both keys.
4. **Torso (fuse box)** — the Kitchen door leads to the pitch-black basement. Find two fuses (Kitchen counter, beside Amira's bed) and the note on the kitchen table: *odd breakers up, even breakers down* → **▲▼▲▼**.
5. **Legs (altar)** — take Amira's wedding music box from her dresser and use it on the Chapel altar.
6. **Ritual** — at the basement table: fuse the doll, then burn it.
7. **Ending** — the front door opens. Ring, Amira's voice, the descent. Part 2 teaser.

## Asset system (modular, drag-and-drop)

You never need to edit code. Either:

1. **Drag & drop** files anywhere on the page (or Settings → "+ .glb / audio"). They are applied instantly and stored in the browser (IndexedDB), so they persist between sessions. Settings → "Clear custom assets" removes them.
2. **Manifest**: put files under `assets/` and list them in `assets/manifest.json` (see the sample file). Loaded at startup.

File **names decide the slot** (lowercase, letters/numbers/underscore). Extension: `.glb` (preferred; `.gltf` only if everything is embedded).

### Recommended folder layout

```
index.html (+ style.css, game.js, package.json)
README.md
assets/
├─ manifest.json
├─ models/
│  ├─ protagonist/   protagonist.glb
│  ├─ entity/        entity_devexinos.glb
│  ├─ maps/          map_bedroom.glb  map_study.glb  ...
│  ├─ furniture/     furniture_bed_bedroom.glb  ...
│  └─ items/         item_key1.glb  item_music_box.glb  ...
└─ audio/
   ├─ sfx/           sfx_door.ogg  sfx_whisper.ogg  ...
   ├─ bgm/           bgm_main.mp3  bgm_chase.mp3
   └─ voice/         voice_*.ogg  (reserved)
```

### Model slots

| File name | What it replaces | Notes |
|---|---|---|
| `entity_devexinos` | The hunter's body (and the hallway apparition) | Auto-scaled to 2.1 m tall, feet on the floor, facing **+Z**. First animation clip (idle/walk) plays automatically. |
| `protagonist` | Fred's visible body | Auto-scaled to 1.75 m. The camera sits inside the head; backface culling hides it. |
| `map_<room>` | All procedural **furniture/decor** of a room | `<room>` = `bedroom`, `study`, `kitchen`, `hall`, `amira`, `gallery`, `chapel`, `basement`. Author in metres with the origin at the **room's floor centre** (see centres below). Walls/collisions stay as they are. |
| `furniture_<id>` | One static furniture piece | Fitted inside the placeholder's bounding box. IDs below. |
| `item_<id>` | A collectible's look | Fitted inside the placeholder's bounding box. IDs below. |

Room centres (x, z): bedroom (-5.5, 6) · study (-5.5, -2) · kitchen (-5.5, -10) · hall (0, -2) · amira (5.5, 6) · gallery (5.5, -2) · chapel (5.5, -10) · basement (58, 0).

**Furniture IDs:** `bed_bedroom` `nightstand_bedroom` `dresser_bedroom` `wardrobe_bedroom` `desk_study` `bookshelf_study` `table_kitchen` `counter_kitchen` `stove_kitchen` `table_store` `bed_amira` `dresser_amira` `vanity_amira` `table_gallery` `locker_gallery1` `locker_gallery2` `pews_chapel` `fusebox` `table_ritual` `pedestal_torso`
(Doors, the safe, the altar slab and other animated parts are procedural on purpose so puzzles keep working.)

**Item IDs:** `passport` `id_card` `key1` `key2` `fuse1` `fuse2` `music_box` `head` `arms` `torso` `legs` `j1` `j2` `j3` `letter` `note`
Example: `item_key1.glb`, `furniture_bed_bedroom.glb`.

### Audio slots (all optional; every sound has a synthesized fallback)

`sfx_click` `sfx_pickup` `sfx_step` `sfx_door` `sfx_grind` `sfx_thump` `sfx_whisper` `sfx_growl` `sfx_scare` `sfx_beep` `sfx_buzz` `sfx_spark` `sfx_fire` `sfx_hum` `sfx_amira` `sfx_musicbox` `sfx_heartbeat`, plus `bgm_main` (looping ambience replaces the synthesized drone) and `bgm_chase` (plays while Devexinos chases you).
Formats: `.ogg`, `.mp3`, `.wav`, `.m4a`.

### Authoring tips
- Keep models light: under ~20k triangles each, textures ≤ 1024², compressed `.glb`.
- Export Y-up, metres, apply transforms, one root scene.
- Audio is unlocked on the first tap/click (browser autoplay rule); files dropped earlier are decoded right after.

## Languages
Arabic (RTL), English, French, Chinese. Edit the `T` object in `js/i18n.js`. Missing keys fall back to English.

## Saving & Google login
Progress autosaves in `localStorage` (photos are stored separately). **Login is simulated** in this build; real Google sign-in needs Google Identity Services with your own OAuth client ID plus a backend (Firebase/Firestore is the easiest). Replace the Terms of Service and Support placeholder texts before release.

## Making an APK
Wrap this folder with **Capacitor** (recommended): `npm i @capacitor/core @capacitor/cli @capacitor/android`, `npx cap init`, copy the project into `www/`, `npx cap add android`, `npx cap open android`. Download `three.min.js` and `GLTFLoader.js` into `js/` and change the two CDN `<script>` tags in `index.html` so it works offline. Lock orientation to landscape.

## Honest status
All game logic (four puzzles, AI chase/hide, save/load, ending, phone chats/camera/gallery, translation completeness) passes an automated simulation (60 checks). Rendering was **not** tested on a real GPU in my environment, so expect to tune lighting, collision sizes and difficulty after your first playthrough.
