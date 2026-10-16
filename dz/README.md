# Dzair Drive
Run locally: `npx serve .` then open the shown address on your phone (must be http/https, not file://).

## Add content
- **Car**: drop `.glb` in `assets/models/cars/` + one line in `js/config/carsConfig.js` (`len` = real length in m, `flip:true` if it drives backwards, `npc:false` = not used as traffic).
- **Map**: drop `.glb` in `assets/models/maps/` + one entry in `js/config/mapsConfig.js`.
- **Music**: `assets/audio/music1.mp3`, `music2.mp3`, … (played in order from the phone's Music app).
- **Tuning**: edit `js/tuning.js` (parts, % gains, prices). Stats feed the physics directly.

## Compress the 3D models (iPhone / iOS and Android)
Phones (especially iPhone Safari, which kills pages that use too much memory) need SMALL models. Targets: player car ≤ 8 MB, traffic car ≤ 3 MB, map ≤ 25 MB, textures ≤ 1024 px (traffic 512 px).
Compression is done on your computer (Mac/Windows/Linux, needs Node.js) — not on the iPhone itself:
1. Install: `npm i -g @gltf-transform/cli`
2. One file: `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024`
3. Whole project: `./tools/compress.sh` → creates `assets/models_compressed/`; test, then replace `assets/models`.
4. Heavier cuts: lower `--texture-size 512`, and reduce polygons with `gltf-transform simplify in.glb out.glb --ratio 0.5 --error 0.001`.
5. Alternative (no install): upload to https://gltf.report or https://glb.ageofthe.net/ (online optimizers) and export with Draco/Meshopt + WebP.
The game already loads Meshopt, Draco and WebP models on iOS Safari, Android Chrome, and inside Capacitor. (KTX2 textures are not enabled.)
Big files right now: partner_tepee 49 MB, 307 40 MB, city 23 MB, 208 20 MB — compress these first. They are excluded from traffic (`npc:false`) until compressed.
iOS notes: audio and tilt need a user tap first (already handled by the Play button); for an iPhone app use Capacitor (`npm i @capacitor/core @capacitor/cli @capacitor/ios`, `npx cap add ios`, open in Xcode — requires a Mac).

## Sounds (editable from files)
Put files in `assets/audio/sfx/` (names listed in `js/config/soundsConfig.js`): engine, horn, brake, crash, pass, cash, levelup, click, message, shutter, city (ambience). Per-car engines: `engine_<carId>.mp3` (looped, pitch follows speed/gears). Any missing file falls back to a built-in synthesized sound, so the game is never silent. Horn = 📯 button or H key. Volume sliders: Settings > Audio.

## Phone AI (always on)
Contacts reply on fixed topics only (greeting, how are you, money, car, race, job, bye); each topic has 3 replies, one picked at random, in the language you write. Off-topic messages get a polite redirect. Contacts also text you randomly while you drive (Samir offers the delivery job). Edit replies in `js/chat.js`.
