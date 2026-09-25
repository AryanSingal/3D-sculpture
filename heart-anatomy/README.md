# Heart Anatomy Explorer

An interactive 3D model of the human heart for anatomy education, built
with Three.js and Vite — using **real segmented cardiac anatomy**, not
primitive shapes.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build && npm run preview   # production build
```

## Where the geometry comes from

The chambers, septa, valve leaflets/rings, papillary muscles, trabeculae,
coronary vessels, and conduction-system landmarks are **real, individually
segmented meshes** from [BodyParts3D](http://lifesciencedb.jp/bp3d/)
(© The Database Center for Life Science, **CC BY‑SA 2.1 Japan**), via its
"heart5.0i" module — 129 OBJ files, 79 uniquely named anatomical
structures. That's a genuine medical dataset: the left ventricle really is
built from its own anterior/lateral/inferior/septal/free walls, the
tricuspid valve really has three separate leaflets, and so on — nothing
here is a sphere or a cylinder standing in for an organ part.

`scripts/convert-bodyparts3d.py` is the (one-time) pipeline that turns the
raw OBJ files into this project's `public/heart-anatomy.bin` +
`public/heart-anatomy.manifest.json`: it parses each OBJ, re-centers and
rescales the coordinates into the app's scene space, merges the several
mesh "islands" that share an anatomical name into one group, and packs
everything into a small binary blob the app fetches at startup. The raw
source OBJs aren't included here (they're a much larger, separate BodyParts3D
download) — only the derived, already-transformed asset is shipped.

**License note:** because the anatomical data is CC BY‑SA, this project's
in-app legend carries the required attribution, and any redistribution of
`heart-anatomy.bin`/`.json` (as-is or modified) needs the same attribution
and share-alike license, even if you license your own code differently.

### What's real vs. reconstructed

The source scan doesn't include everything asked of a "complete" heart —
whole‑organ scans rarely capture structures as fine as valve leaflets or
chordae tendineae. Where real geometry was missing, `src/heartModel.js`
builds an anatomically-positioned procedural stand-in instead of leaving a
gap:

| Structure | Source |
|---|---|
| Chambers, auricles, all septa | Real (BodyParts3D) |
| Tricuspid valve (all 3 leaflets), pulmonary valve (all 3 cusps) | Real |
| Mitral valve leaflets, 2 of 3 aortic valve cusps | Reconstructed (only the fibrous rings / one cusp were in the scan) |
| Papillary muscles: LV anterior, RV septal | Real |
| Papillary muscles: LV posterior, RV anterior & posterior | Reconstructed |
| Trabeculae carneae, moderator band | Real |
| Chordae tendineae | Reconstructed (too fine for the source scan) |
| Coronary arteries & veins, conduction system landmarks | Real |
| SVC, IVC, pulmonary trunk | Trunk real; venae cavae and the trunk's split into left/right pulmonary arteries are reconstructed |
| Pulmonary veins, ascending aorta, aortic arch + branches | Aortic root real; the arch, its 3 branches, and pulmonary veins are reconstructed |

Reconstructed parts are attached at real anchor points computed from the
actual scan data (e.g. the venae cavae attach at the real right atrium's
own top/bottom, not at a guessed coordinate), and use the same
noise-displaced, mottled-tissue rendering described below — but real
anatomical mesh is never displaced or altered, only colored.

## What's inside

- `index.html` – page shell: viewport, toolbar, loading overlay, leader-line
  SVG overlay, and the info panel.
- `src/style.css` – all styling.
- `src/anatomyMap.js` – maps each of the 79 real BodyParts3D mesh names to
  the clickable structureId it belongs to (e.g. five different named wall
  meshes all become part of "leftVentricle").
- `src/anatomyData.js` – name / location / function / connections copy for
  all 31 clickable structures, grouped for the sidebar.
- `src/heartModel.js` – loads the real dataset, tags every mesh, and builds
  the procedural supplements (missing vessels, leaflets, papillary muscles,
  chordae tendineae) anchored to the real geometry's own bounding boxes.
- `src/noise.js` – small dependency-free 3D Perlin noise, used only for
  procedural-part surface detail and tissue-color mottling (never to alter
  real anatomical shape).
- `src/main.js` – scene/camera/lighting setup, click selection, cutaway/
  X-ray modes, leader-line label rendering, blood-flow particle animation,
  and toolbar wiring.
- `scripts/convert-bodyparts3d.py` – the OBJ → binary-asset conversion
  pipeline (see above).
- `public/heart-anatomy.bin` + `.manifest.json` – the derived anatomical
  dataset the app fetches at startup (~11 MB).

## Interacting with the model

- **Drag** to rotate, **scroll / pinch** to zoom, **right-drag** to pan.
- **Click** any of the 31 structures — chambers, septa, all four valves,
  every great vessel, papillary muscles, chordae, coronary vessels, the
  conduction system — to select it and read about it in the side panel,
  including what it physically connects to.
- **Reset view** returns the camera to its starting position.
- **Labels** toggles floating name tags, each drawn with a thin leader line
  back to its exact anatomical anchor point so the label text itself never
  sits on top of (and hides) the structure it names.
- **Blood flow** toggles particles animating the real circuit: venae cavae
  → right atrium → tricuspid valve → right ventricle → pulmonary valve →
  pulmonary trunk → pulmonary arteries → (lungs) → pulmonary veins → left
  atrium → mitral valve → left ventricle → aortic valve → aorta.
- **Cutaway** fades the outer myocardial walls (both atria, both
  ventricles, both auricles) to ~10% opacity so the septa, valves,
  papillary muscles, and chordae tendineae inside become visible.
- **X-Ray** fades every structure uniformly for a translucent, see-through
  view of the whole model; combine it with Cutaway for maximum visibility
  of internal anatomy.

## Notes on the model

Selecting a structure only changes its emissive highlight color — never its
geometry — so the shape on screen is always the anatomical shape, whether
or not it's selected. Materials are physically based
(`MeshPhysicalMaterial` with clearcoat and sheen for a moist-tissue look),
lit with a generated room-environment map for real reflections, and
rendered with ACES tone mapping. Chambers, vessels, valves, tendons,
coronary vessels, and the conduction system each get their own realistic,
muted color role (see the in-app legend) rather than a flat "left = red,
right = blue" split.

The model is oriented anatomically, so "right" heart structures sit on the
viewer's **left**, as they would facing a real patient — derived directly
from the scan's own coordinate system (confirmed by checking that the
aorta and pulmonary trunk sit superior to the ventricles, and that right‑
named structures have negative X in the transformed coordinate space).
