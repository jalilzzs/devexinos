#!/usr/bin/env bash
# Usage: tools/compress.sh   (needs Node.js; works on macOS / Linux / Windows-WSL)
# Compresses every .glb in assets/models into assets/models_compressed (meshopt geometry + WebP textures).
set -e
npm i -g @gltf-transform/cli >/dev/null
mkdir -p assets/models_compressed/cars assets/models_compressed/maps
for f in assets/models/cars/*.glb; do gltf-transform optimize "$f" "assets/models_compressed/cars/$(basename $f)" --compress meshopt --texture-compress webp --texture-size 1024; done
for f in assets/models/maps/*.glb; do gltf-transform optimize "$f" "assets/models_compressed/maps/$(basename $f)" --compress meshopt --texture-compress webp --texture-size 2048; done
du -sh assets/models assets/models_compressed
echo "Check it in the game, then replace assets/models with assets/models_compressed."
