import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createHeartModel, PALETTE } from "./heartModel.js";
import { anatomyData, structureGroups } from "./anatomyData.js";

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const viewportEl = document.getElementById("viewport");
const loadingOverlay = document.getElementById("loading-overlay");
const leaderSvg = document.getElementById("leader-lines");
const btnReset = document.getElementById("btn-reset");
const btnLabels = document.getElementById("btn-labels");
const btnFlow = document.getElementById("btn-flow");
const btnCutaway = document.getElementById("btn-cutaway");
const btnXray = document.getElementById("btn-xray");
const btnDeselect = document.getElementById("btn-deselect");
const infoDefault = document.getElementById("info-default");
const infoDetail = document.getElementById("info-detail");
const detailCategory = document.getElementById("detail-category");
const detailName = document.getElementById("detail-name");
const detailLocation = document.getElementById("detail-location");
const detailFunction = document.getElementById("detail-function");
const detailConnections = document.getElementById("detail-connections");
const structureListEl = document.getElementById("structure-list");

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
const BG_COLOR = 0xdde4e9;
scene.background = new THREE.Color(BG_COLOR);
scene.fog = new THREE.Fog(BG_COLOR, 9, 16);

const camera = new THREE.PerspectiveCamera(42, viewportEl.clientWidth / viewportEl.clientHeight, 0.1, 100);
const DEFAULT_CAMERA_POS = new THREE.Vector3(0.2, 0.6, 6.3);
const DEFAULT_TARGET = new THREE.Vector3(-0.05, -0.15, 0);
camera.position.copy(DEFAULT_CAMERA_POS);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(viewportEl.clientWidth, viewportEl.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
viewportEl.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.2;
controls.maxDistance = 11;
controls.target.copy(DEFAULT_TARGET);
controls.update();

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xf3f6f9, 0x3a3128, 0.55));

const keyLight = new THREE.DirectionalLight(0xfff3e8, 1.5);
keyLight.position.set(4, 6, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xcfe0ee, 0.45);
fillLight.position.set(-5, -2, -4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight.position.set(-2, 3, -6);
scene.add(rimLight);

const shadowCanvas = document.createElement("canvas");
shadowCanvas.width = shadowCanvas.height = 256;
const shadowCtx = shadowCanvas.getContext("2d");
const shadowGradient = shadowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
shadowGradient.addColorStop(0, "rgba(20,30,38,0.32)");
shadowGradient.addColorStop(1, "rgba(20,30,38,0)");
shadowCtx.fillStyle = shadowGradient;
shadowCtx.fillRect(0, 0, 256, 256);
const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(3.6, 3.6),
  new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.set(0, -2.6, 0);
scene.add(shadowPlane);

// ---------------------------------------------------------------------------
// Load the heart model (async: fetches the real anatomical dataset)
// ---------------------------------------------------------------------------
let selectable = [];
let labels = [];
let flowPaths = [];
let myocardiumIds = new Set();

const { group: heartGroup, selectable: sel, labels: lab, flowPaths: flows, myocardiumIds: myo } = await createHeartModel();
selectable = sel;
labels = lab;
flowPaths = flows;
myocardiumIds = myo;
scene.add(heartGroup);
loadingOverlay.classList.add("is-hidden");

// ---------------------------------------------------------------------------
// Sidebar: grouped structure list in the default info-panel view
// ---------------------------------------------------------------------------
const availableIds = new Set(selectable.map((m) => m.userData.structureId));
structureGroups.forEach(({ title, ids }) => {
  const present = ids.filter((id) => availableIds.has(id));
  if (present.length === 0) return;
  const header = document.createElement("li");
  header.className = "group-title";
  header.textContent = title;
  structureListEl.appendChild(header);
  present.forEach((id) => {
    const li = document.createElement("li");
    li.textContent = anatomyData[id].name;
    li.dataset.id = id;
    li.tabIndex = 0;
    li.addEventListener("click", () => selectStructure(id));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectStructure(id);
      }
    });
    structureListEl.appendChild(li);
  });
});

// ---------------------------------------------------------------------------
// Labels with leader lines
// ---------------------------------------------------------------------------
let labelsVisible = true;
// Small deterministic per-label pixel offset so nearby labels fan out
// instead of stacking directly on top of their anchor points.
const labelEls = labels.map((l, i) => {
  const el = document.createElement("div");
  el.className = "struct-label";
  el.textContent = l.name;
  el.dataset.id = l.id;
  viewportEl.appendChild(el);
  const angle = (i * 47) % 360;
  const dist = 26 + (i % 4) * 10;
  return {
    ...l,
    el,
    offsetX: Math.cos((angle * Math.PI) / 180) * dist,
    offsetY: Math.sin((angle * Math.PI) / 180) * dist - 14,
  };
});

leaderSvg.innerHTML = labelEls.map((_, i) => `<line data-line="${i}" x1="0" y1="0" x2="0" y2="0" />`).join("");
const leaderLineEls = Array.from(leaderSvg.querySelectorAll("line"));

const raycaster = new THREE.Raycaster();
const tmpVec = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

function updateLabels() {
  const rect = viewportEl.getBoundingClientRect();
  leaderSvg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);

  labelEls.forEach((label, i) => {
    const lineEl = leaderLineEls[i];
    if (!labelsVisible) {
      label.el.style.display = "none";
      lineEl.style.display = "none";
      return;
    }
    tmpVec.copy(label.position).project(camera);
    if (tmpVec.z > 1) {
      label.el.style.display = "none";
      lineEl.style.display = "none";
      return;
    }
    const anchorX = (tmpVec.x * 0.5 + 0.5) * rect.width;
    const anchorY = (1 - (tmpVec.y * 0.5 + 0.5)) * rect.height;
    const labelX = anchorX + label.offsetX;
    const labelY = anchorY + label.offsetY;

    label.el.style.display = "block";
    label.el.style.left = `${labelX}px`;
    label.el.style.top = `${labelY}px`;

    tmpDir.copy(label.position).sub(camera.position);
    const distToLabel = tmpDir.length();
    tmpDir.normalize();
    raycaster.set(camera.position, tmpDir);
    const hits = raycaster.intersectObjects(selectable, false);
    const blocked = hits.length > 0 && hits[0].distance < distToLabel - 0.12;
    label.el.style.opacity = blocked ? "0.22" : "1";
    label.el.classList.toggle("is-selected", label.id === selectedId);

    lineEl.style.display = "block";
    lineEl.style.opacity = blocked ? "0.15" : "0.6";
    lineEl.setAttribute("x1", anchorX);
    lineEl.setAttribute("y1", anchorY);
    lineEl.setAttribute("x2", labelX);
    lineEl.setAttribute("y2", labelY + 8);
  });
}

// ---------------------------------------------------------------------------
// Blood-flow particles
// ---------------------------------------------------------------------------
let flowVisible = true;
const PARTICLES_PER_PATH = 4;
const particleGeom = new THREE.SphereGeometry(0.045, 10, 10);
const particles = [];

flowPaths.forEach((path) => {
  const material = new THREE.MeshBasicMaterial({ color: path.color });
  for (let i = 0; i < PARTICLES_PER_PATH; i++) {
    const mesh = new THREE.Mesh(particleGeom, material);
    const t0 = i / PARTICLES_PER_PATH;
    mesh.position.copy(path.curve.getPointAt(t0));
    scene.add(mesh);
    particles.push({ mesh, curve: path.curve, speed: path.speed, t: t0 });
  }
});

function updateParticles(delta) {
  particles.forEach((p) => {
    if (!flowVisible) {
      p.mesh.visible = false;
      return;
    }
    p.mesh.visible = true;
    p.t = (p.t + p.speed * delta) % 1;
    p.mesh.position.copy(p.curve.getPointAt(p.t));
  });
}

// ---------------------------------------------------------------------------
// Selection / highlighting
// ---------------------------------------------------------------------------
let selectedId = null;

function setMeshHighlight(mesh, on) {
  if (on) {
    mesh.material.emissive.setHex(PALETTE.highlight);
    mesh.material.emissiveIntensity = 0.6;
  } else {
    mesh.material.emissive.setHex(mesh.userData.baseEmissiveHex ?? 0x000000);
    mesh.material.emissiveIntensity = mesh.userData.baseEmissiveIntensity ?? 1;
  }
}

function selectStructure(id) {
  if (selectedId) {
    selectable.filter((m) => m.userData.structureId === selectedId).forEach((m) => setMeshHighlight(m, false));
  }

  selectedId = id;

  if (id && anatomyData[id]) {
    selectable.filter((m) => m.userData.structureId === id).forEach((m) => setMeshHighlight(m, true));

    const data = anatomyData[id];
    detailCategory.textContent = data.group;
    detailName.textContent = data.name;
    detailLocation.textContent = data.location;
    detailFunction.textContent = data.function;
    detailConnections.textContent = data.connections;
    infoDefault.hidden = true;
    infoDetail.hidden = false;
  } else {
    infoDefault.hidden = false;
    infoDetail.hidden = true;
  }
}

btnDeselect.addEventListener("click", () => selectStructure(null));

let pointerDown = null;
renderer.domElement.addEventListener("pointerdown", (e) => {
  pointerDown = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!pointerDown) return;
  const dx = e.clientX - pointerDown.x;
  const dy = e.clientY - pointerDown.y;
  pointerDown = null;
  if (Math.hypot(dx, dy) > 5) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(selectable, false);
  if (hits.length > 0) {
    selectStructure(hits[0].object.userData.structureId);
  } else {
    selectStructure(null);
  }
});

// ---------------------------------------------------------------------------
// Cutaway / X-ray render modes
// ---------------------------------------------------------------------------
let cutawayOn = false;
let xrayOn = false;

function updateRenderModes() {
  selectable.forEach((mesh) => {
    const isMyocardium = myocardiumIds.has(mesh.userData.structureId);
    let opacity = 1;
    if (xrayOn) opacity = Math.min(opacity, 0.32);
    if (cutawayOn && isMyocardium) opacity = Math.min(opacity, 0.1);
    mesh.material.opacity = opacity;
    mesh.material.transparent = opacity < 0.999;
    mesh.material.depthWrite = opacity >= 0.999;
  });
}

btnCutaway.addEventListener("click", () => {
  cutawayOn = !cutawayOn;
  btnCutaway.classList.toggle("is-active", cutawayOn);
  btnCutaway.setAttribute("aria-pressed", String(cutawayOn));
  updateRenderModes();
});

btnXray.addEventListener("click", () => {
  xrayOn = !xrayOn;
  btnXray.classList.toggle("is-active", xrayOn);
  btnXray.setAttribute("aria-pressed", String(xrayOn));
  updateRenderModes();
});

// ---------------------------------------------------------------------------
// Toolbar: reset / labels / flow
// ---------------------------------------------------------------------------
btnReset.addEventListener("click", () => {
  controls.target.copy(DEFAULT_TARGET);
  camera.position.copy(DEFAULT_CAMERA_POS);
  controls.update();
});

btnLabels.addEventListener("click", () => {
  labelsVisible = !labelsVisible;
  btnLabels.classList.toggle("is-active", labelsVisible);
  btnLabels.setAttribute("aria-pressed", String(labelsVisible));
});

btnFlow.addEventListener("click", () => {
  flowVisible = !flowVisible;
  btnFlow.classList.toggle("is-active", flowVisible);
  btnFlow.setAttribute("aria-pressed", String(flowVisible));
});

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener("resize", () => {
  const width = viewportEl.clientWidth;
  const height = viewportEl.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  controls.update();
  updateParticles(delta);
  updateLabels();
  renderer.render(scene, camera);
}

animate();
