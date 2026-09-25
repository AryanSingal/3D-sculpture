import * as THREE from "three";
import { fbm3 } from "./noise.js";
import { CANONICAL_TO_STRUCTURE, MYOCARDIUM_IDS } from "./anatomyMap.js";
import { anatomyData } from "./anatomyData.js";

// ---------------------------------------------------------------------------
// Palette: muted, desaturated tissue tones grouped by material "role" rather
// than a flat left=red/right=blue split. Chambers/vessels are still tinted
// by the blood they carry (the common textbook convention) but valves,
// septa, tendons, conduction tissue, and coronary vessels each get their
// own realistic hue.
// ---------------------------------------------------------------------------
const ROLE_COLORS = {
  deoxyLight: { base: 0x54728a, mottle: 0x3c5468 },
  deoxyDeep: { base: 0x35495c, mottle: 0x25333f },
  oxyLight: { base: 0x9c4b42, mottle: 0x7a352e },
  oxyDeep: { base: 0x7a2f28, mottle: 0x571f1a },
  septum: { base: 0xac7a70, mottle: 0x805650 },
  valve: { base: 0xdcc79a, mottle: 0xbfa06a },
  deoxyVessel: { base: 0x4a6478, mottle: 0x33485a },
  oxyVessel: { base: 0x8f3b34, mottle: 0x62261f },
  tendon: { base: 0xe4dcc8, mottle: 0xc9bd9e },
  coronaryArtery: { base: 0x8a2a22, mottle: 0x5c1a14 },
  coronaryVein: { base: 0x395269, mottle: 0x27394a },
  conduction: { base: 0xdccb8f, mottle: 0xc4ac6c },
};

const MATERIAL_ROLE = {
  rightAtrium: "deoxyLight",
  leftAtrium: "oxyLight",
  rightVentricle: "deoxyDeep",
  leftVentricle: "oxyDeep",
  rightAuricle: "deoxyLight",
  leftAuricle: "oxyLight",
  interventricularSeptum: "septum",
  atrioventricularSeptum: "septum",
  interatrialSeptum: "septum",
  tricuspidValve: "valve",
  mitralValve: "valve",
  pulmonaryValve: "valve",
  aorticValve: "valve",
  superiorVenaCava: "deoxyVessel",
  inferiorVenaCava: "deoxyVessel",
  pulmonaryTrunk: "deoxyVessel",
  leftPulmonaryArtery: "deoxyVessel",
  rightPulmonaryArtery: "deoxyVessel",
  pulmonaryVeins: "oxyVessel",
  ascendingAorta: "oxyVessel",
  aorticArch: "oxyVessel",
  brachiocephalicTrunk: "oxyVessel",
  leftCommonCarotidArtery: "oxyVessel",
  leftSubclavianArtery: "oxyVessel",
  papillaryMusclesLV: "oxyDeep",
  papillaryMusclesRV: "deoxyDeep",
  trabeculaeCarneae: "deoxyDeep",
  chordaeTendineae: "tendon",
  coronaryArteries: "coronaryArtery",
  coronaryVeins: "coronaryVein",
  conductionSystem: "conduction",
};

export const PALETTE = { highlight: 0xe8b13c };

const SELECTABLE = [];
const LABELS = [];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (h % 5000) / 71.3;
}

function tissueMaterial(role, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.02,
    clearcoat: 0.35,
    clearcoatRoughness: 0.32,
    sheen: 0.28,
    sheenColor: new THREE.Color(0xf3d9cf),
    sheenRoughness: 0.85,
    emissive: role === "conduction" ? 0x3a2f10 : 0x000000,
    emissiveIntensity: role === "conduction" ? 0.35 : 1,
    ...extra,
  });
}

function tag(mesh, { id, category }) {
  mesh.userData.structureId = id;
  mesh.userData.category = category;
  mesh.userData.baseEmissiveHex = mesh.material.emissive.getHex();
  mesh.userData.baseEmissiveIntensity = mesh.material.emissiveIntensity;
  SELECTABLE.push(mesh);
  return mesh;
}

/** Colors an existing geometry's vertices with a mottled pattern between two
 *  shades, WITHOUT touching vertex positions — used for the real anatomical
 *  meshes, whose shape must stay exactly as scanned. */
function applyMottle(geometry, { baseColor, mottleColor, seed = 0, mottleStrength = 0.35, mottleFreq = 3 }) {
  const posAttr = geometry.attributes.position;
  const count = posAttr.count;
  const colors = new Float32Array(count * 3);
  const base = new THREE.Color(baseColor);
  const mottle = new THREE.Color(mottleColor ?? baseColor);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i), y = posAttr.getY(i), z = posAttr.getZ(i);
    const m = fbm3(x * mottleFreq + seed, y * mottleFreq + seed, z * mottleFreq + seed, 3, 2.0, 0.5);
    const t = THREE.MathUtils.clamp(m * mottleStrength + mottleStrength * 0.35, 0, 1);
    c.copy(base).lerp(mottle, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  return geometry;
}

/** Displaces a procedural geometry along its normals with noise, and bakes
 *  mottled vertex colors — used only for parts this app builds itself
 *  (vessels, leaflets, papillary-muscle supplements), never for real scan
 *  data, so we never alter anatomically accurate shape. */
function organicify(geometry, { ampScale = 0.02, noiseFreq = 3, seed = 0, baseColor, mottleColor, mottleStrength = 0.35, mottleFreq = 4 }) {
  geometry.computeVertexNormals();
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  const count = posAttr.count;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(posAttr, i);
    n.fromBufferAttribute(normAttr, i);
    const bump = fbm3(v.x * noiseFreq + seed, v.y * noiseFreq + seed, v.z * noiseFreq + seed, 4, 2.1, 0.5);
    v.addScaledVector(n, bump * ampScale);
    posAttr.setXYZ(i, v.x, v.y, v.z);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  applyMottle(geometry, { baseColor, mottleColor, seed, mottleStrength, mottleFreq });
  return geometry;
}

function bboxOf(positions) {
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (x < box.minX) box.minX = x;
    if (x > box.maxX) box.maxX = x;
    if (y < box.minY) box.minY = y;
    if (y > box.maxY) box.maxY = y;
    if (z < box.minZ) box.minZ = z;
    if (z > box.maxZ) box.maxZ = z;
  }
  return box;
}

function mergeBbox(a, b) {
  if (!a) return b;
  return {
    minX: Math.min(a.minX, b.minX),
    maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY),
    maxY: Math.max(a.maxY, b.maxY),
    minZ: Math.min(a.minZ, b.minZ),
    maxZ: Math.max(a.maxZ, b.maxZ),
  };
}

// ---------------------------------------------------------------------------
// Loading the real anatomical dataset
// ---------------------------------------------------------------------------
async function fetchManifestAndBin() {
  const [manifest, buf] = await Promise.all([
    fetch("/heart-anatomy.manifest.json").then((r) => r.json()),
    fetch("/heart-anatomy.bin").then((r) => r.arrayBuffer()),
  ]);
  return { manifest, buf };
}

function buildGeometryFromEntry(entry, buf) {
  const pos = new Float32Array(buf, entry.posByteOffset, entry.vertexCount * 3);
  const norm = new Float32Array(buf, entry.normByteOffset, entry.vertexCount * 3);
  const idx = new Uint32Array(buf, entry.idxByteOffset, entry.indexCount);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos.slice(), 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(norm.slice(), 3));
  geometry.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
  return { geometry, bbox: bboxOf(pos) };
}

// ---------------------------------------------------------------------------
// Procedural helpers (only used for what the real dataset doesn't include)
// ---------------------------------------------------------------------------
function makeVesselTube({ id, points, radius, role }) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))));
  const geometry = new THREE.TubeGeometry(curve, Math.max(28, points.length * 10), radius, 14, false);
  const colors = ROLE_COLORS[role];
  organicify(geometry, { ampScale: radius * 0.18, noiseFreq: 3.2, seed: hashSeed(id), baseColor: colors.base, mottleColor: colors.mottle });
  const material = tissueMaterial(role, { roughness: 0.5, clearcoat: 0.45 });
  const mesh = new THREE.Mesh(geometry, material);
  tag(mesh, { id, category: role });

  const capGeom = new THREE.SphereGeometry(radius, 12, 12);
  const cap = new THREE.Mesh(capGeom, material);
  cap.position.copy(points[points.length - 1]);
  tag(cap, { id, category: role });

  const group = new THREE.Group();
  group.add(mesh, cap);
  return { group, curve };
}

/** A curved, sail-like leaflet: a sector of a shallow dome, anchored at a
 *  ring and curving inward along `normal`. Used to reconstruct valve
 *  leaflets too thin to have been captured in the source scan. */
function makeLeaflet({ id, role, ringCenter, normal, radial, radius, angleStart, angleEnd, sag = 0.28, segs = 14 }) {
  const basisN = normal.clone().normalize();
  const basisU = radial.clone().sub(basisN.clone().multiplyScalar(radial.dot(basisN))).normalize();
  const basisV = new THREE.Vector3().crossVectors(basisN, basisU).normalize();

  const positions = [];
  const indices = [];
  const uSteps = segs;
  const vSteps = segs;
  for (let i = 0; i <= uSteps; i++) {
    const u = i / uSteps; // 0 at ring, 1 at free edge
    const r = radius * (1 - u * 0.08);
    const depth = sag * Math.sin((u * Math.PI) / 2) * radius;
    for (let j = 0; j <= vSteps; j++) {
      const v = j / vSteps;
      const theta = angleStart + (angleEnd - angleStart) * v;
      const localX = Math.cos(theta) * r * u;
      const localY = Math.sin(theta) * r * u;
      const p = ringCenter
        .clone()
        .addScaledVector(basisU, localX)
        .addScaledVector(basisV, localY)
        .addScaledVector(basisN, depth);
      positions.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < uSteps; i++) {
    for (let j = 0; j < vSteps; j++) {
      const a = i * (vSteps + 1) + j;
      const b = a + 1;
      const c = a + (vSteps + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const colors = ROLE_COLORS[role];
  applyMottle(geometry, { baseColor: colors.base, mottleColor: colors.mottle, seed: hashSeed(id + angleStart), mottleStrength: 0.25 });
  const material = tissueMaterial(role, { roughness: 0.42, clearcoat: 0.5, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  tag(mesh, { id, category: role });
  return mesh;
}

function makePapillaryMuscle({ id, role, base, tip, radius }) {
  const height = base.distanceTo(tip);
  const geometry = new THREE.ConeGeometry(radius, height, 14, 8);
  geometry.translate(0, height / 2, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = tip.clone().sub(base).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
  geometry.applyQuaternion(quat);
  geometry.translate(base.x, base.y, base.z);
  const colors = ROLE_COLORS[role];
  organicify(geometry, { ampScale: radius * 0.2, noiseFreq: 5, seed: hashSeed(id + base.x), baseColor: colors.base, mottleColor: colors.mottle });
  const material = tissueMaterial(role);
  const mesh = new THREE.Mesh(geometry, material);
  tag(mesh, { id, category: role });
  return mesh;
}

function makeChorda({ id, from, to, radius = 0.012 }) {
  const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, -0.02, 0));
  const curve = new THREE.CatmullRomCurve3([from, mid, to]);
  const geometry = new THREE.TubeGeometry(curve, 8, radius, 6, false);
  geometry.computeVertexNormals();
  const colors = ROLE_COLORS.tendon;
  applyMottle(geometry, { baseColor: colors.base, mottleColor: colors.mottle, seed: hashSeed(id), mottleStrength: 0.15 });
  const material = tissueMaterial("tendon", { roughness: 0.45, clearcoat: 0.4 });
  const mesh = new THREE.Mesh(geometry, material);
  tag(mesh, { id, category: "tendon" });
  return mesh;
}

// ---------------------------------------------------------------------------
// Main build
// ---------------------------------------------------------------------------
export async function createHeartModel() {
  SELECTABLE.length = 0;
  LABELS.length = 0;

  const group = new THREE.Group();
  const { manifest, buf } = await fetchManifestAndBin();

  const accum = {}; // structureId -> { x,y,z,w, bbox }
  function addContribution(id, point, weight, bbox) {
    const a = accum[id] || (accum[id] = { x: 0, y: 0, z: 0, w: 0, bbox: null });
    a.x += point.x * weight;
    a.y += point.y * weight;
    a.z += point.z * weight;
    a.w += weight;
    if (bbox) a.bbox = mergeBbox(a.bbox, bbox);
  }

  // ---- Real anatomical meshes (BodyParts3D) ------------------------------
  for (const entry of manifest.groups) {
    const structureId = CANONICAL_TO_STRUCTURE[entry.name];
    if (!structureId) continue;
    const { geometry, bbox } = buildGeometryFromEntry(entry, buf);
    const role = MATERIAL_ROLE[structureId] || "deoxyLight";
    const colors = ROLE_COLORS[role];
    applyMottle(geometry, { baseColor: colors.base, mottleColor: colors.mottle, seed: hashSeed(entry.name) });
    const material = tissueMaterial(role);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = entry.name;
    tag(mesh, { id: structureId, category: role });
    group.add(mesh);

    const c = new THREE.Vector3(...entry.centroid);
    addContribution(structureId, c, entry.vertexCount, bbox);
  }

  const centroid = (id) => {
    const a = accum[id];
    return a ? new THREE.Vector3(a.x / a.w, a.y / a.w, a.z / a.w) : new THREE.Vector3();
  };
  const bboxOfId = (id) => accum[id]?.bbox;

  // ================================================================
  // Procedural supplements — everything the source scan doesn't include.
  // ================================================================

  // ---- Great vessels: venae cavae ---------------------------------------
  const raBox = bboxOfId("rightAtrium");
  const raCentroid = centroid("rightAtrium");
  if (raBox) {
    const svcTop = new THREE.Vector3(raBox.minX * 0.3 + raCentroid.x * 0.7, raBox.maxY, raCentroid.z * 0.4 - 0.05);
    const { curve: svcCurve, group: svcGroup } = makeVesselTube({
      id: "superiorVenaCava",
      role: "deoxyVessel",
      radius: 0.16,
      points: [
        new THREE.Vector3(svcTop.x, svcTop.y + 1.5, svcTop.z - 0.1),
        new THREE.Vector3(svcTop.x, svcTop.y + 0.7, svcTop.z - 0.03),
        svcTop,
      ],
    });
    group.add(svcGroup);
    addContribution("superiorVenaCava", svcTop, 1, null);

    const ivcBottom = new THREE.Vector3(raBox.minX * 0.3 + raCentroid.x * 0.7, raBox.minY, raCentroid.z * 0.4 + 0.05);
    const { group: ivcGroup } = makeVesselTube({
      id: "inferiorVenaCava",
      role: "deoxyVessel",
      radius: 0.17,
      points: [
        new THREE.Vector3(ivcBottom.x, ivcBottom.y - 1.5, ivcBottom.z + 0.15),
        new THREE.Vector3(ivcBottom.x, ivcBottom.y - 0.7, ivcBottom.z + 0.05),
        ivcBottom,
      ],
    });
    group.add(ivcGroup);
    addContribution("inferiorVenaCava", ivcBottom, 1, null);
  }

  // ---- Pulmonary trunk branches ------------------------------------------
  const ptBox = bboxOfId("pulmonaryTrunk");
  const ptCentroid = centroid("pulmonaryTrunk");
  let lpaEnd, rpaEnd;
  if (ptBox) {
    const branchPoint = new THREE.Vector3(ptCentroid.x, ptBox.maxY, ptCentroid.z);
    lpaEnd = new THREE.Vector3(branchPoint.x + 0.95, branchPoint.y + 0.25, branchPoint.z - 0.1);
    rpaEnd = new THREE.Vector3(branchPoint.x - 1.05, branchPoint.y + 0.15, branchPoint.z - 0.15);

    const { group: lpaGroup } = makeVesselTube({
      id: "leftPulmonaryArtery",
      role: "deoxyVessel",
      radius: 0.13,
      points: [branchPoint, new THREE.Vector3(branchPoint.x + 0.5, branchPoint.y + 0.2, branchPoint.z - 0.05), lpaEnd],
    });
    group.add(lpaGroup);
    addContribution("leftPulmonaryArtery", lpaEnd.clone().lerp(branchPoint, 0.5), 1, null);

    const { group: rpaGroup } = makeVesselTube({
      id: "rightPulmonaryArtery",
      role: "deoxyVessel",
      radius: 0.13,
      points: [branchPoint, new THREE.Vector3(branchPoint.x - 0.55, branchPoint.y + 0.1, branchPoint.z - 0.1), rpaEnd],
    });
    group.add(rpaGroup);
    addContribution("rightPulmonaryArtery", rpaEnd.clone().lerp(branchPoint, 0.5), 1, null);
  }

  // ---- Pulmonary veins ----------------------------------------------------
  const laBox = bboxOfId("leftAtrium");
  const laCentroid = centroid("leftAtrium");
  if (laBox) {
    const entry1 = new THREE.Vector3(laCentroid.x + 0.25, laBox.maxY - 0.15, laBox.minZ);
    const entry2 = new THREE.Vector3(laCentroid.x - 0.2, laBox.minY + 0.2, laBox.minZ);
    const { group: pv1 } = makeVesselTube({
      id: "pulmonaryVeins",
      role: "oxyVessel",
      radius: 0.11,
      points: [new THREE.Vector3(entry1.x + 0.3, entry1.y + 0.15, entry1.z - 0.85), new THREE.Vector3(entry1.x + 0.1, entry1.y + 0.05, entry1.z - 0.35), entry1],
    });
    group.add(pv1);
    const { group: pv2 } = makeVesselTube({
      id: "pulmonaryVeins",
      role: "oxyVessel",
      radius: 0.11,
      points: [new THREE.Vector3(entry2.x - 0.25, entry2.y - 0.1, entry2.z - 0.85), new THREE.Vector3(entry2.x - 0.05, entry2.y - 0.02, entry2.z - 0.35), entry2],
    });
    group.add(pv2);
    addContribution("pulmonaryVeins", entry1.clone().lerp(entry2, 0.5), 1, null);
  }

  // ---- Aortic arch and its branches ---------------------------------------
  const aoBox = bboxOfId("ascendingAorta");
  const aoCentroid = centroid("ascendingAorta");
  let archTop;
  if (aoBox) {
    const rootTop = new THREE.Vector3(aoCentroid.x, aoBox.maxY, aoCentroid.z);
    archTop = new THREE.Vector3(rootTop.x - 0.35, rootTop.y + 0.55, rootTop.z - 0.15);
    const descStart = new THREE.Vector3(rootTop.x - 0.55, rootTop.y + 0.1, rootTop.z - 0.55);
    const { group: archGroup, curve: archCurve } = makeVesselTube({
      id: "aorticArch",
      role: "oxyVessel",
      radius: 0.19,
      points: [rootTop, new THREE.Vector3(rootTop.x - 0.15, rootTop.y + 0.45, rootTop.z - 0.05), archTop, new THREE.Vector3(rootTop.x - 0.48, rootTop.y + 0.35, rootTop.z - 0.4), descStart],
    });
    group.add(archGroup);
    addContribution("aorticArch", archTop, 1, null);

    const branchBase = archCurve.getPointAt(0.42);
    const bcEnd = branchBase.clone().add(new THREE.Vector3(-0.55, 0.85, -0.05));
    const { group: bcGroup } = makeVesselTube({ id: "brachiocephalicTrunk", role: "oxyVessel", radius: 0.075, points: [branchBase, bcEnd] });
    group.add(bcGroup);
    addContribution("brachiocephalicTrunk", bcEnd, 1, null);

    const carotidBase = archCurve.getPointAt(0.58);
    const carotidEnd = carotidBase.clone().add(new THREE.Vector3(-0.05, 0.95, -0.1));
    const { group: carotidGroup } = makeVesselTube({ id: "leftCommonCarotidArtery", role: "oxyVessel", radius: 0.055, points: [carotidBase, carotidEnd] });
    group.add(carotidGroup);
    addContribution("leftCommonCarotidArtery", carotidEnd, 1, null);

    const subclavianBase = archCurve.getPointAt(0.72);
    const subclavianEnd = subclavianBase.clone().add(new THREE.Vector3(0.35, 0.7, -0.2));
    const { group: subclavianGroup } = makeVesselTube({ id: "leftSubclavianArtery", role: "oxyVessel", radius: 0.06, points: [subclavianBase, subclavianEnd] });
    group.add(subclavianGroup);
    addContribution("leftSubclavianArtery", subclavianEnd, 1, null);
  }

  // ---- Mitral valve leaflets (real data only has the fibrous ring) -------
  const lvCentroid = centroid("leftVentricle");
  const mvBox = bboxOfId("mitralValve");
  const mvCentroid = centroid("mitralValve");
  let mitralAnteriorTip, mitralPosteriorTip;
  if (mvBox && accum.leftVentricle) {
    const mvNormal = lvCentroid.clone().sub(mvCentroid).normalize();
    const mvRadius = Math.max(mvBox.maxX - mvBox.minX, mvBox.maxZ - mvBox.minZ) * 0.5;
    const radial = new THREE.Vector3(1, 0, 0.3);
    const anterior = makeLeaflet({ id: "mitralValve", role: "valve", ringCenter: mvCentroid, normal: mvNormal, radial, radius: mvRadius, angleStart: -0.95, angleEnd: 0.95, sag: 0.3 });
    const posterior = makeLeaflet({ id: "mitralValve", role: "valve", ringCenter: mvCentroid, normal: mvNormal, radial, radius: mvRadius * 0.85, angleStart: 1.3, angleEnd: 5.0, sag: 0.22 });
    group.add(anterior, posterior);
    mitralAnteriorTip = mvCentroid.clone().addScaledVector(mvNormal, mvRadius * 0.3);
    mitralPosteriorTip = mvCentroid.clone().addScaledVector(mvNormal, mvRadius * 0.22);
  }

  // ---- Aortic valve: fill in the two cusps missing from the scan ---------
  const avBox = bboxOfId("aorticValve");
  const avCentroid = centroid("aorticValve");
  if (avBox && aoBox) {
    const avNormal = new THREE.Vector3(aoCentroid.x, aoBox.maxY, aoCentroid.z).sub(avCentroid).normalize();
    const avRadius = Math.max(avBox.maxX - avBox.minX, avBox.maxZ - avBox.minZ) * 0.5;
    const radial = new THREE.Vector3(0.2, 0, -1);
    const cuspA = makeLeaflet({ id: "aorticValve", role: "valve", ringCenter: avCentroid, normal: avNormal, radial, radius: avRadius, angleStart: 1.4, angleEnd: 3.4, sag: 0.5 });
    const cuspB = makeLeaflet({ id: "aorticValve", role: "valve", ringCenter: avCentroid, normal: avNormal, radial, radius: avRadius, angleStart: 3.4, angleEnd: 5.4, sag: 0.5 });
    group.add(cuspA, cuspB);
  }

  // ---- Papillary muscles: fill in the ones missing from the scan --------
  let rvAnteriorPap, rvPosteriorPap, lvPosteriorPap;
  const rvBox = bboxOfId("rightVentricle");
  const rvCentroid = centroid("rightVentricle");
  if (rvBox) {
    rvAnteriorPap = new THREE.Vector3(rvBox.minX * 0.8 + rvCentroid.x * 0.2, rvCentroid.y + 0.15, rvBox.maxZ * 0.6);
    const rvAnteriorTip = rvAnteriorPap.clone().lerp(rvCentroid, 0.55).add(new THREE.Vector3(0, 0.25, 0));
    group.add(makePapillaryMuscle({ id: "papillaryMusclesRV", role: "deoxyDeep", base: rvAnteriorPap, tip: rvAnteriorTip, radius: 0.09 }));

    rvPosteriorPap = new THREE.Vector3(rvBox.minX * 0.75 + rvCentroid.x * 0.25, rvCentroid.y - 0.3, rvBox.minZ * 0.5);
    const rvPosteriorTip = rvPosteriorPap.clone().lerp(rvCentroid, 0.55).add(new THREE.Vector3(0, 0.2, 0));
    group.add(makePapillaryMuscle({ id: "papillaryMusclesRV", role: "deoxyDeep", base: rvPosteriorPap, tip: rvPosteriorTip, radius: 0.08 }));
  }
  const lvBox = bboxOfId("leftVentricle");
  if (lvBox && accum.papillaryMusclesLV) {
    const realPap = centroid("papillaryMusclesLV");
    lvPosteriorPap = new THREE.Vector3(lvBox.maxX - (realPap.x - lvBox.minX), realPap.y, lvBox.minZ * 0.4 + lvBox.maxZ * 0.6 - (realPap.z - lvBox.minZ));
    const tip = lvPosteriorPap.clone().lerp(lvCentroid, 0.5).add(new THREE.Vector3(0, 0.25, 0));
    group.add(makePapillaryMuscle({ id: "papillaryMusclesLV", role: "oxyDeep", base: lvPosteriorPap, tip, radius: 0.1 }));
  }

  // ---- Chordae tendineae: papillary muscle tips -> valve leaflet edges --
  const lvPapReal = accum.papillaryMusclesLV ? centroid("papillaryMusclesLV") : null;
  if (lvPapReal && mitralAnteriorTip) {
    [0.2, 0.5, 0.8].forEach((t) => {
      const edge = new THREE.Vector3().lerpVectors(mitralAnteriorTip, mitralPosteriorTip, t);
      group.add(makeChorda({ id: "chordaeTendineae", from: lvPapReal.clone().add(new THREE.Vector3(0, 0.15, 0)), to: edge }));
    });
  }
  if (lvPosteriorPap && mitralPosteriorTip) {
    [0.15, 0.5].forEach((t) => {
      const edge = new THREE.Vector3().lerpVectors(mitralPosteriorTip, mitralAnteriorTip, t);
      group.add(makeChorda({ id: "chordaeTendineae", from: lvPosteriorPap.clone().add(new THREE.Vector3(0, 0.2, 0)), to: edge }));
    });
  }
  const tvCentroid = accum.tricuspidValve ? centroid("tricuspidValve") : null;
  if (tvCentroid && rvAnteriorPap) {
    const edgeA = tvCentroid.clone().add(new THREE.Vector3(0.1, 0.05, 0.05));
    group.add(makeChorda({ id: "chordaeTendineae", from: rvAnteriorPap.clone().add(new THREE.Vector3(0, 0.15, 0)), to: edgeA }));
  }
  if (tvCentroid && rvPosteriorPap) {
    const edgeB = tvCentroid.clone().add(new THREE.Vector3(-0.1, -0.02, -0.05));
    group.add(makeChorda({ id: "chordaeTendineae", from: rvPosteriorPap.clone().add(new THREE.Vector3(0, 0.15, 0)), to: edgeB }));
  }

  // ---- Blood-flow particle paths -----------------------------------------
  const flowPaths = [];
  const ra = centroid("rightAtrium");
  const rv = centroid("rightVentricle");
  const la = centroid("leftAtrium");
  const lv = centroid("leftVentricle");
  const tv = accum.tricuspidValve ? centroid("tricuspidValve") : ra.clone().lerp(rv, 0.5);
  const mv = accum.mitralValve ? centroid("mitralValve") : la.clone().lerp(lv, 0.5);
  const pv = accum.pulmonaryValve ? centroid("pulmonaryValve") : rv.clone();
  const av = accum.aorticValve ? centroid("aorticValve") : lv.clone();
  const pt = accum.pulmonaryTrunk ? centroid("pulmonaryTrunk") : pv.clone();
  const ao = accum.ascendingAorta ? centroid("ascendingAorta") : av.clone();

  if (raBox) {
    flowPaths.push({
      id: "flow-svc",
      color: 0x5b8bb0,
      speed: 0.16,
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(ra.x, raBox.maxY + 1.4, ra.z * 0.4 - 0.15),
        new THREE.Vector3(ra.x, raBox.maxY, ra.z * 0.4 - 0.05),
        ra,
        tv,
        rv,
        pv,
        pt,
        lpaEnd ?? pt.clone().add(new THREE.Vector3(0.8, 0.2, 0)),
      ]),
    });
    flowPaths.push({
      id: "flow-ivc",
      color: 0x5b8bb0,
      speed: 0.13,
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(ra.x, raBox.minY - 1.4, ra.z * 0.4 + 0.15),
        new THREE.Vector3(ra.x, raBox.minY, ra.z * 0.4 + 0.05),
        ra,
        tv,
        rv,
        pv,
        pt,
        rpaEnd ?? pt.clone().add(new THREE.Vector3(-0.8, 0.2, 0)),
      ]),
    });
  }

  if (laBox) {
    flowPaths.push({
      id: "flow-pv-1",
      color: 0xc25a4f,
      speed: 0.15,
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(la.x + 0.55, la.y + 0.15, laBox.minZ - 0.85),
        new THREE.Vector3(la.x + 0.25, la.y + 0.05, laBox.minZ - 0.3),
        la,
        mv,
        lv,
        av,
        ao,
        archTop ?? ao.clone().add(new THREE.Vector3(0, 0.6, 0)),
      ]),
    });
    flowPaths.push({
      id: "flow-pv-2",
      color: 0xc25a4f,
      speed: 0.12,
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(la.x - 0.5, la.y - 0.1, laBox.minZ - 0.85),
        new THREE.Vector3(la.x - 0.2, la.y - 0.02, laBox.minZ - 0.3),
        la,
        mv,
        lv,
        av,
        ao,
        archTop ?? ao.clone().add(new THREE.Vector3(0, 0.6, 0)),
      ]),
    });
  }

  // ---- One label per structure that ended up with geometry ---------------
  for (const id in accum) {
    if (!anatomyData[id]) continue;
    LABELS.push({ id, name: anatomyData[id].name, position: centroid(id) });
  }

  return {
    group,
    selectable: SELECTABLE.slice(),
    labels: LABELS.slice(),
    flowPaths,
    myocardiumIds: MYOCARDIUM_IDS,
  };
}
