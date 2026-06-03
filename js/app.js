/* ═══════════════════════════════════════════════════════════════════════
 *  IERE SHOWCASE ENGINE
 *  Premium cinematic display for 4K lobby television
 *  Single-file, zero-backend, IndexedDB-powered
 * ═══════════════════════════════════════════════════════════════════════ */

const APP = (() => {
'use strict';

// ══════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIG
// ══════════════════════════════════════════════════════════════════════
const PW = 'iere4373';
const DB_NAME = 'IEREShowcaseDB';

const MODES = [
  {id:'interactive', name:'Interactive',     desc:'Click to explore'},
  {id:'ambient',     name:'Ambient',         desc:'Gentle screensaver'},
  {id:'headquarters',name:'Headquarters',    desc:'Operations center'},
  {id:'showcase',    name:'Client Showcase', desc:'Auto-present projects'},
  {id:'night',       name:'Night Mode',      desc:'Reduced brightness'},
];

// Trinidad & Tobago - detailed outline coordinates (normalized 0-1)
const TRINIDAD = [
  [0.08,0.40],[0.07,0.43],[0.06,0.47],[0.055,0.51],[0.05,0.55],[0.052,0.59],
  [0.055,0.63],[0.06,0.67],[0.07,0.71],[0.08,0.74],[0.095,0.77],[0.11,0.80],
  [0.13,0.83],[0.15,0.855],[0.175,0.875],[0.20,0.89],[0.23,0.905],[0.26,0.915],
  [0.29,0.92],[0.32,0.925],[0.35,0.925],[0.38,0.92],[0.41,0.915],[0.44,0.905],
  [0.47,0.89],[0.50,0.87],[0.525,0.845],[0.545,0.815],[0.56,0.785],[0.575,0.75],
  [0.585,0.715],[0.59,0.68],[0.595,0.64],[0.595,0.60],[0.59,0.56],[0.58,0.52],
  [0.565,0.485],[0.545,0.455],[0.52,0.43],[0.49,0.41],[0.455,0.395],[0.42,0.385],
  [0.385,0.38],[0.35,0.375],[0.315,0.375],[0.28,0.38],[0.245,0.385],[0.21,0.39],
  [0.175,0.395],[0.14,0.395],[0.11,0.395],[0.08,0.40]
];

const TOBAGO = [
  [0.72,0.17],[0.74,0.155],[0.765,0.145],[0.79,0.135],[0.82,0.13],[0.85,0.128],
  [0.88,0.13],[0.905,0.14],[0.925,0.155],[0.94,0.175],[0.945,0.195],[0.94,0.215],
  [0.925,0.235],[0.90,0.25],[0.87,0.26],[0.84,0.26],[0.81,0.255],[0.78,0.245],
  [0.755,0.23],[0.735,0.21],[0.725,0.19],[0.72,0.17]
];

// Cities with positions (normalized coords) - major cities marked
const CITIES = [
  {name:'Port of Spain',    x:0.165, y:0.415, major:true},
  {name:'San Fernando',     x:0.295, y:0.815, major:true},
  {name:'Chaguanas',        x:0.305, y:0.595, major:true},
  {name:'Arima',            x:0.395, y:0.435, major:false},
  {name:'Point Fortin',     x:0.155, y:0.865, major:false},
  {name:'Scarborough',      x:0.835, y:0.195, major:true},
  {name:'Couva',            x:0.28,  y:0.545, major:false},
  {name:'Tunapuna',         x:0.35,  y:0.425, major:false},
  {name:'Sangre Grande',    x:0.52,  y:0.485, major:false},
  {name:'Princes Town',     x:0.38,  y:0.80,  major:false},
  {name:'Diego Martin',     x:0.135, y:0.435, major:false},
  {name:'Marabella',        x:0.29,  y:0.775, major:false},
  {name:'Siparia',          x:0.255, y:0.87,  major:false},
  {name:'Rio Claro',        x:0.455, y:0.72,  major:false},
  {name:'Fyzabad',          x:0.225, y:0.845, major:false},
  {name:'La Brea',          x:0.175, y:0.87,  major:false},
  {name:'Point Lisas',      x:0.285, y:0.615, major:false},
  {name:'Piarco',           x:0.375, y:0.445, major:false},
  {name:'St Augustine',     x:0.34,  y:0.435, major:false},
  {name:'Roxborough',       x:0.90,  y:0.20,  major:false},
  {name:'Crown Point',      x:0.76,  y:0.24,  major:false},
];

// ══════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════
let db = null;
let projects = [];
let settings = {
  mode: 'interactive',
  transitionSpeed: 3,
  displayDuration: 15,
  particleDensity: 40
};

// Three.js state
let scene, camera, renderer, controls, clock;
let mapGroup, pinMeshes = {}, particleSystem;
let labelContainer;
let animationId;

// Camera
let targetCamPos = {x:0, y:8, z:22};
let targetLookAt = {x:0, y:0, z:0};

// UI state  
let isAdmin = false;
let editId = null;
let pendingMedia = [];
let existingMedia = [];
let startupDone = false;
let picking = false;
let searchQuery = '';

// Tour state
let tourTimer = null;
let mediaTimer = null;
let tourIndex = -1;
let mediaIndex = 0;

// Interaction
let raycaster, mouse;
let hoveredPin = null;
let selectedProject = null;

// HQ mode
let hqObjects = [];

// ══════════════════════════════════════════════════════════════════════
// DATABASE (IndexedDB)
// ══════════════════════════════════════════════════════════════════════
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', {keyPath:'id'});
      if (!d.objectStoreNames.contains('media')) d.createObjectStore('media', {keyPath:'id'});
      if (!d.objectStoreNames.contains('backups')) d.createObjectStore('backups', {keyPath:'ts'});
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

const dbTx = (store, mode='readonly') => db.transaction(store, mode).objectStore(store);
const dbPut = (store, data) => new Promise((ok, no) => { const r = dbTx(store,'readwrite').put(data); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); });
const dbGet = (store, key) => new Promise((ok, no) => { const r = dbTx(store).get(key); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); });
const dbGetAll = store => new Promise((ok, no) => { const r = dbTx(store).getAll(); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); });
const dbDel = (store, key) => new Promise((ok, no) => { const r = dbTx(store,'readwrite').delete(key); r.onsuccess=()=>ok(); r.onerror=()=>no(r.error); });

// ══════════════════════════════════════════════════════════════════════
// SETTINGS (localStorage)
// ══════════════════════════════════════════════════════════════════════
function loadSettings() {
  try { 
    const s = localStorage.getItem('iere_settings'); 
    if (s) Object.assign(settings, JSON.parse(s)); 
  } catch(e) {}
  syncSettingsUI();
}

function saveSettings() { 
  try { localStorage.setItem('iere_settings', JSON.stringify(settings)); } catch(e) {} 
}

function syncSettingsUI() {
  const el = id => document.getElementById(id);
  if (el('s-transition')) { el('s-transition').value = settings.transitionSpeed; el('sv-transition').textContent = settings.transitionSpeed + 's'; }
  if (el('s-duration')) { el('s-duration').value = settings.displayDuration; el('sv-duration').textContent = settings.displayDuration + 's'; }
  if (el('s-particles')) { el('s-particles').value = settings.particleDensity; el('sv-particles').textContent = settings.particleDensity; }
}

function setSetting(key, value) {
  settings[key] = parseFloat(value);
  saveSettings();
  syncSettingsUI();
  if (key === 'particleDensity') rebuildParticles();
}

// ══════════════════════════════════════════════════════════════════════
// THREE.JS SCENE
// ══════════════════════════════════════════════════════════════════════
function initScene() {
  const container = document.getElementById('scene-container');
  clock = new THREE.Clock();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x040408, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040408, 0.008);

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 8, 22);

  // Lights
  scene.add(new THREE.AmbientLight(0x6B4CCC, 0.15));
  
  const dirLight = new THREE.DirectionalLight(0xBBADEE, 0.3);
  dirLight.position.set(5, 10, 6);
  scene.add(dirLight);
  
  const p1 = new THREE.PointLight(0x8B5CF6, 0.7, 40);
  p1.position.set(-8, 5, 8);
  scene.add(p1);
  
  const p2 = new THREE.PointLight(0x06B6D4, 0.4, 35);
  p2.position.set(8, -4, 10);
  scene.add(p2);

  // Raycaster for mouse interaction
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Build the map
  buildMap();
  buildGrid();
  rebuildParticles();

  // Event listeners
  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onMapClick);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  // Start render loop
  animate();
}

function buildMap() {
  mapGroup = new THREE.Group();
  scene.add(mapGroup);

  const scale = 16; // Map scale in scene units
  mapGroup.userData.scale = scale;

  // Trinidad island
  addIsland(TRINIDAD, scale, 0.12);
  addCoastGlow(TRINIDAD, scale, 0.025, 0.6);
  addCoastGlow(TRINIDAD, scale, 0.05, 0.15);

  // Tobago island
  addIsland(TOBAGO, scale, 0.08);
  addCoastGlow(TOBAGO, scale, 0.02, 0.55);
  addCoastGlow(TOBAGO, scale, 0.04, 0.12);

  // Ocean plane
  const oceanGeo = new THREE.PlaneGeometry(100, 60);
  const oceanMat = new THREE.MeshBasicMaterial({ color: 0x030310, transparent: true, opacity: 0.7 });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.z = -0.3;
  mapGroup.add(ocean);

  // Center the map
  mapGroup.position.set(-scale * 0.5, scale * 0.35, 0);

  // Create city labels
  createCityLabels(scale);
}

function addIsland(outline, scale, depth) {
  const shape = new THREE.Shape();
  outline.forEach((pt, i) => {
    const x = pt[0] * scale;
    const y = -pt[1] * scale;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 4
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a1a30,
    metalness: 0.6,
    roughness: 0.4,
    emissive: 0x0f0f20,
    emissiveIntensity: 0.5
  });

  const mesh = new THREE.Mesh(geo, mat);
  mapGroup.add(mesh);
}

function addCoastGlow(outline, scale, radius, opacity) {
  const points = outline.map(pt => new THREE.Vector3(pt[0] * scale, -pt[1] * scale, 0.15));
  const curve = new THREE.CatmullRomCurve3(points, true);
  const geo = new THREE.TubeGeometry(curve, 180, radius, 8, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x8B5CF6,
    transparent: true,
    opacity: opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  mapGroup.add(new THREE.Mesh(geo, mat));
}

function buildGrid() {
  const gridMat = new THREE.LineBasicMaterial({ color: 0x8B5CF6, transparent: true, opacity: 0.02 });
  for (let i = -50; i <= 50; i += 3) {
    const vLine = [new THREE.Vector3(i, -30, -0.4), new THREE.Vector3(i, 30, -0.4)];
    const hLine = [new THREE.Vector3(-50, i * 0.6, -0.4), new THREE.Vector3(50, i * 0.6, -0.4)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vLine), gridMat));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(hLine), gridMat));
  }
}

function rebuildParticles() {
  if (particleSystem) {
    scene.remove(particleSystem);
    particleSystem.geometry.dispose();
    particleSystem.material.dispose();
  }
  
  const count = Math.floor(settings.particleDensity * 8);
  if (count < 1) return;
  
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i*3] = (Math.random() - 0.5) * 60;
    positions[i*3+1] = (Math.random() - 0.5) * 35;
    positions[i*3+2] = (Math.random() - 0.5) * 15 - 3;
  }
  
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const mat = new THREE.PointsMaterial({
    color: 0x8B5CF6,
    size: 0.04,
    transparent: true,
    opacity: 0.2,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  particleSystem = new THREE.Points(geo, mat);
  scene.add(particleSystem);
}

function createCityLabels(scale) {
  labelContainer = document.getElementById('city-labels');
  if (!labelContainer) {
    labelContainer = document.createElement('div');
    labelContainer.id = 'city-labels';
    labelContainer.style.cssText = 'position:fixed;inset:0;z-index:6;pointer-events:none;overflow:hidden';
    document.body.appendChild(labelContainer);
  }
  labelContainer.innerHTML = '';

  CITIES.forEach(city => {
    const label = document.createElement('div');
    label.className = 'city-label' + (city.major ? ' major' : '');
    label.innerHTML = `<span class="dot"></span>${city.name}`;
    label.dataset.x = city.x;
    label.dataset.y = city.y;
    labelContainer.appendChild(label);
  });
}

function updateCityLabels() {
  if (!labelContainer) return;
  const labels = labelContainer.querySelectorAll('.city-label');
  const scale = mapGroup?.userData.scale || 16;
  
  labels.forEach(label => {
    const nx = parseFloat(label.dataset.x);
    const ny = parseFloat(label.dataset.y);
    const screenPos = normalizedToScreen(nx, ny, scale);
    
    // Check if label is in view
    if (screenPos.x < -100 || screenPos.x > window.innerWidth + 100 ||
        screenPos.y < -50 || screenPos.y > window.innerHeight + 50) {
      label.style.opacity = '0';
    } else {
      label.style.opacity = '';
      label.style.left = screenPos.x + 'px';
      label.style.top = screenPos.y + 'px';
    }
  });
}

// ══════════════════════════════════════════════════════════════════════
// COORDINATE CONVERSIONS
// ══════════════════════════════════════════════════════════════════════
function normalizedToScene(nx, ny, scale) {
  scale = scale || mapGroup?.userData.scale || 16;
  return {
    x: nx * scale + mapGroup.position.x,
    y: -ny * scale + mapGroup.position.y,
    z: 0.18
  };
}

function normalizedToScreen(nx, ny, scale) {
  const pos = normalizedToScene(nx, ny, scale);
  const vec = new THREE.Vector3(pos.x, pos.y, pos.z);
  vec.project(camera);
  return {
    x: (vec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-vec.y * 0.5 + 0.5) * window.innerHeight
  };
}

function screenToNormalized(sx, sy) {
  const vec = new THREE.Vector3(
    (sx / window.innerWidth) * 2 - 1,
    -(sy / window.innerHeight) * 2 + 1,
    0.5
  );
  vec.unproject(camera);
  const dir = vec.sub(camera.position).normalize();
  const t = -camera.position.z / dir.z;
  const pt = camera.position.clone().add(dir.multiplyScalar(t));
  const scale = mapGroup?.userData.scale || 16;
  return {
    x: Math.max(0, Math.min(1, (pt.x - mapGroup.position.x) / scale)),
    y: Math.max(0, Math.min(1, -(pt.y - mapGroup.position.y) / scale))
  };
}

// ══════════════════════════════════════════════════════════════════════
// PIN MANAGEMENT
// ══════════════════════════════════════════════════════════════════════
function createPin(project) {
  const scale = mapGroup?.userData.scale || 16;
  const pos = normalizedToScene(project.mapX, project.mapY, scale);

  const group = new THREE.Group();
  group.position.set(pos.x, pos.y, pos.z);

  // Core sphere
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x8B5CF6, transparent: true, opacity: 0.95 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), coreMat);
  group.add(core);

  // Inner glow
  const innerGlowMat = new THREE.MeshBasicMaterial({
    color: 0x8B5CF6, transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), innerGlowMat);
  group.add(innerGlow);

  // Outer glow
  const outerGlowMat = new THREE.MeshBasicMaterial({
    color: 0x8B5CF6, transparent: true, opacity: 0.08,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const outerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), outerGlowMat);
  group.add(outerGlow);

  // Ring
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x8B5CF6, transparent: true, opacity: 0.4,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.21, 32), ringMat);
  group.add(ring);

  // Vertical beam
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x8B5CF6, transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 8), beamMat);
  beam.rotation.x = Math.PI / 2;
  beam.position.z = 0.35;
  group.add(beam);

  group.userData = { projectId: project.id, core, innerGlow, outerGlow, ring, beam };
  mapGroup.add(group);
  pinMeshes[project.id] = group;
}

function removePin(id) {
  const mesh = pinMeshes[id];
  if (!mesh) return;
  mapGroup.remove(mesh);
  mesh.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });
  delete pinMeshes[id];
}

function rebuildPins() {
  Object.keys(pinMeshes).forEach(removePin);
  projects.filter(p => p.enabled).forEach(createPin);
}

// ══════════════════════════════════════════════════════════════════════
// MOUSE INTERACTION
// ══════════════════════════════════════════════════════════════════════
function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Check pin hover
  raycaster.setFromCamera(mouse, camera);
  const pinGroups = Object.values(pinMeshes);
  
  let foundHover = null;
  for (const group of pinGroups) {
    const intersects = raycaster.intersectObject(group, true);
    if (intersects.length > 0) {
      foundHover = group;
      break;
    }
  }

  if (foundHover !== hoveredPin) {
    // Unhover previous
    if (hoveredPin) {
      gsap.to(hoveredPin.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
      hideTooltip();
    }
    
    // Hover new
    if (foundHover) {
      gsap.to(foundHover.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.3 });
      const proj = projects.find(p => p.id === foundHover.userData.projectId);
      if (proj) showTooltip(proj, e.clientX, e.clientY);
    }
    
    hoveredPin = foundHover;
    renderer.domElement.style.cursor = foundHover ? 'pointer' : 'grab';
  }

  // Update tooltip position
  if (hoveredPin) {
    moveTooltip(e.clientX, e.clientY);
  }
}

function onMapClick(e) {
  if (hoveredPin) {
    const proj = projects.find(p => p.id === hoveredPin.userData.projectId);
    if (proj) {
      selectProject(proj);
    }
  } else if (selectedProject) {
    deselectProject();
  }
}

function onWheel(e) {
  e.preventDefault();
  const zoomSpeed = 0.002;
  targetCamPos.z = Math.max(8, Math.min(35, targetCamPos.z + e.deltaY * zoomSpeed * targetCamPos.z));
}

function selectProject(proj) {
  selectedProject = proj;
  
  // Fly camera to project
  const scale = mapGroup?.userData.scale || 16;
  const pos = normalizedToScene(proj.mapX, proj.mapY, scale);
  targetCamPos = { x: pos.x, y: pos.y + 3, z: 12 };
  targetLookAt = { x: pos.x, y: pos.y, z: 0 };

  // Highlight pin
  const pin = pinMeshes[proj.id];
  if (pin) {
    gsap.to(pin.scale, { x: 2, y: 2, z: 2, duration: 0.6, ease: 'back.out(2)' });
  }

  // Show project card
  showCard(proj);
  showMedia(proj);
  hideTooltip();
}

function deselectProject() {
  if (selectedProject) {
    const pin = pinMeshes[selectedProject.id];
    if (pin) {
      gsap.to(pin.scale, { x: 1, y: 1, z: 1, duration: 0.4 });
    }
  }
  selectedProject = null;
  
  // Reset camera
  targetCamPos = { x: 0, y: 8, z: 22 };
  targetLookAt = { x: 0, y: 0, z: 0 };

  hideCard();
  hideMedia();
}

// ══════════════════════════════════════════════════════════════════════
// TOOLTIP
// ══════════════════════════════════════════════════════════════════════
let tooltipEl = null;

function showTooltip(proj, x, y) {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'pin-tooltip';
    tooltipEl.innerHTML = '<div class="tt-name"></div><div class="tt-loc"></div>';
    document.body.appendChild(tooltipEl);
  }
  tooltipEl.querySelector('.tt-name').textContent = proj.name;
  tooltipEl.querySelector('.tt-loc').textContent = proj.location || '';
  tooltipEl.classList.add('visible');
  moveTooltip(x, y);
}

function moveTooltip(x, y) {
  if (!tooltipEl) return;
  tooltipEl.style.left = (x + 15) + 'px';
  tooltipEl.style.top = (y - 10) + 'px';
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove('visible');
}

// ══════════════════════════════════════════════════════════════════════
// HQ MODE (connection lines)
// ══════════════════════════════════════════════════════════════════════
function buildHQConnections() {
  clearHQConnections();
  if (settings.mode !== 'headquarters') return;

  const scale = mapGroup?.userData.scale || 16;
  const hqCity = CITIES.find(c => c.name === 'Port of Spain') || CITIES[0];
  const hqPos = normalizedToScene(hqCity.x, hqCity.y, scale);

  // HQ beacon
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x06B6D4, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), beaconMat);
  beacon.position.set(hqPos.x, hqPos.y, 0.22);
  mapGroup.add(beacon);
  hqObjects.push(beacon);

  const beaconGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0x06B6D4, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  beaconGlow.position.set(hqPos.x, hqPos.y, 0.22);
  mapGroup.add(beaconGlow);
  hqObjects.push(beaconGlow);

  // Lines to each project
  projects.filter(p => p.enabled).forEach(proj => {
    const projPos = normalizedToScene(proj.mapX, proj.mapY, scale);
    const midPoint = new THREE.Vector3(
      (hqPos.x + projPos.x) / 2,
      (hqPos.y + projPos.y) / 2 + 0.8,
      0.5
    );
    
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(hqPos.x, hqPos.y, 0.2),
      midPoint,
      new THREE.Vector3(projPos.x, projPos.y, 0.2)
    );

    const tubeGeo = new THREE.TubeGeometry(curve, 60, 0.008, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x8B5CF6, transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    mapGroup.add(tube);
    hqObjects.push(tube);

    // Pulse
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0x06B6D4, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
    );
    pulse.userData.curve = curve;
    pulse.userData.t = Math.random();
    mapGroup.add(pulse);
    hqObjects.push(pulse);
  });
}

function clearHQConnections() {
  hqObjects.forEach(obj => {
    mapGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  hqObjects = [];
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION LOOP
// ══════════════════════════════════════════════════════════════════════
function animate() {
  animationId = requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const time = clock.getElapsedTime();

  // Smooth camera
  camera.position.x += (targetCamPos.x - camera.position.x) * 0.03;
  camera.position.y += (targetCamPos.y - camera.position.y) * 0.03;
  camera.position.z += (targetCamPos.z - camera.position.z) * 0.03;
  camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);

  // Mode-specific behaviors
  if (!isAdmin && startupDone && !selectedProject) {
    if (settings.mode === 'ambient' || settings.mode === 'night') {
      targetCamPos.x = Math.sin(time * 0.03) * 2;
      targetCamPos.y = 8 + Math.cos(time * 0.04) * 1;
    }
  }

  // Animate pins
  for (const id in pinMeshes) {
    const group = pinMeshes[id];
    const { innerGlow, ring } = group.userData;
    const phase = time * 2 + group.position.x * 2;
    
    if (innerGlow) {
      innerGlow.scale.setScalar(1 + Math.sin(phase) * 0.2);
      innerGlow.material.opacity = 0.2 + Math.sin(phase + 1) * 0.1;
    }
    if (ring) {
      ring.rotation.z = time * 0.3 + group.position.y;
    }
  }

  // Animate particles
  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(time * 0.6 + positions[i] * 0.2) * 0.0008;
      positions[i] += Math.cos(time * 0.3 + positions[i + 1] * 0.15) * 0.0004;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.rotation.z = time * 0.006;
  }

  // HQ pulse animation
  hqObjects.forEach(obj => {
    if (obj.userData && obj.userData.curve) {
      obj.userData.t = (obj.userData.t + dt * 0.12) % 1;
      const point = obj.userData.curve.getPoint(obj.userData.t);
      obj.position.copy(point);
    }
  });

  // Coast glow pulse
  if (mapGroup) {
    mapGroup.children.forEach(child => {
      if (child.geometry?.type === 'TubeGeometry' && child.material) {
        const baseOp = child.material.userData?.baseOp ?? child.material.opacity;
        if (!child.material.userData) child.material.userData = { baseOp: child.material.opacity };
        child.material.opacity = child.material.userData.baseOp * (0.7 + 0.3 * Math.sin(time * 0.8 + child.id));
      }
    });
  }

  // Night mode exposure
  renderer.toneMappingExposure = settings.mode === 'night' ? 0.4 : 1.0;

  // Light sweep
  const sweep = document.getElementById('light-sweep');
  if (sweep) {
    sweep.style.setProperty('--lx', (50 + Math.sin(time * 0.15) * 25) + '%');
    sweep.style.setProperty('--ly', (50 + Math.cos(time * 0.1) * 15) + '%');
  }

  // Update city labels
  updateCityLabels();

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ══════════════════════════════════════════════════════════════════════
// STARTUP SEQUENCE
// ══════════════════════════════════════════════════════════════════════
function runStartup() {
  const overlay = document.getElementById('startup-overlay');
  const glow = overlay.querySelector('.startup-glow');
  const tag = overlay.querySelector('.tagline');
  const logoImg = document.getElementById('startup-logo');
  const logoPlaceholder = document.getElementById('startup-logo-placeholder');
  const logo = (logoImg && logoImg.style.display !== 'none') ? logoImg : logoPlaceholder;

  const tl = gsap.timeline();
  tl.to(glow, { opacity: 0.6, scale: 1.2, duration: 2, ease: 'power2.out' });
  tl.to(logo, { opacity: 0.85, scale: 1, duration: 1.5, ease: 'power2.out' }, '-=1');
  tl.to(tag, { opacity: 0.5, duration: 1.2, ease: 'power2.out' }, '-=0.3');
  tl.to({}, { duration: 1.5 });
  tl.to([logo, tag, glow], { opacity: 0, duration: 1.2, ease: 'power2.inOut' });
  tl.to(overlay, { 
    opacity: 0, duration: 0.8, ease: 'power2.inOut',
    onComplete: () => {
      overlay.style.display = 'none';
      startupDone = true;
      onReady();
    }
  }, '-=0.4');
}

function onReady() {
  gsap.to('#logo-container', { opacity: 1, duration: 1.5 });
  
  if (projects.length === 0) {
    showEmpty();
  } else {
    hideEmpty();
    startMode();
  }
}

function showEmpty() {
  const el = document.getElementById('empty-state');
  el.classList.add('active');
  gsap.fromTo('#empty-state h2', { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power2.out' });
  gsap.fromTo('#empty-state p', { y: 10, opacity: 0 }, { y: 0, opacity: 0.4, duration: 1.2, delay: 0.2, ease: 'power2.out' });
}

function hideEmpty() {
  document.getElementById('empty-state').classList.remove('active');
}

// ══════════════════════════════════════════════════════════════════════
// DISPLAY MODES
// ══════════════════════════════════════════════════════════════════════
function startMode() {
  stopTour();
  clearHQConnections();
  deselectProject();

  switch (settings.mode) {
    case 'interactive':
      targetCamPos = { x: 0, y: 8, z: 22 };
      break;
    case 'ambient':
    case 'night':
      targetCamPos = { x: 0, y: 8, z: 24 };
      break;
    case 'headquarters':
      targetCamPos = { x: -1, y: 6, z: 20 };
      buildHQConnections();
      break;
    case 'showcase':
      runShowcase();
      break;
  }
}

function runShowcase() {
  const enabled = projects.filter(p => p.enabled);
  if (enabled.length === 0) return;

  tourIndex = -1;
  showcaseNext();
}

function showcaseNext() {
  const enabled = projects.filter(p => p.enabled);
  if (enabled.length === 0) return;

  tourIndex = (tourIndex + 1) % enabled.length;
  const proj = enabled[tourIndex];

  selectProject(proj);

  tourTimer = setTimeout(() => {
    deselectProject();
    setTimeout(showcaseNext, 2000);
  }, settings.displayDuration * 1000);
}

function stopTour() {
  if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; }
  if (mediaTimer) { clearInterval(mediaTimer); mediaTimer = null; }
}

// ══════════════════════════════════════════════════════════════════════
// PROJECT CARD & MEDIA
// ══════════════════════════════════════════════════════════════════════
function showCard(proj) {
  document.getElementById('card-category').textContent = proj.category || 'Project';
  document.getElementById('card-title').textContent = proj.name;
  document.getElementById('card-location').textContent = proj.location || '';
  document.getElementById('card-description').textContent = proj.description || '';
  document.getElementById('card-date').textContent = proj.date ? formatDate(proj.date) : '';
  document.getElementById('project-card').classList.add('active');
}

function hideCard() {
  document.getElementById('project-card').classList.remove('active');
}

function formatDate(dateStr) {
  try {
    const [y, m] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(m) - 1] + ' ' + y;
  } catch(e) { return dateStr; }
}

async function showMedia(proj) {
  if (!proj.mediaIds || proj.mediaIds.length === 0) return;
  
  document.getElementById('media-viewer').classList.add('active');
  mediaIndex = 0;

  const displayMedia = async (index) => {
    try {
      const media = await dbGet('media', proj.mediaIds[index]);
      if (!media) return;

      const img = document.getElementById('media-img');
      const vid = document.getElementById('media-vid');

      if (media.type.startsWith('image')) {
        vid.style.display = 'none';
        vid.src = '';
        img.style.display = 'block';
        img.src = media.data;
        gsap.fromTo(img, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 0.8 });
      } else {
        img.style.display = 'none';
        img.src = '';
        vid.style.display = 'block';
        vid.src = media.data;
        vid.play().catch(() => {});
        gsap.fromTo(vid, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      }

      document.getElementById('media-counter').textContent = `${index + 1} / ${proj.mediaIds.length}`;
    } catch(e) { console.warn('Media load error:', e); }
  };

  await displayMedia(0);

  if (proj.mediaIds.length > 1) {
    if (mediaTimer) clearInterval(mediaTimer);
    mediaTimer = setInterval(async () => {
      mediaIndex = (mediaIndex + 1) % proj.mediaIds.length;
      await displayMedia(mediaIndex);
    }, 5000);
  }
}

function hideMedia() {
  document.getElementById('media-viewer').classList.remove('active');
  if (mediaTimer) { clearInterval(mediaTimer); mediaTimer = null; }
  document.getElementById('media-img').src = '';
  document.getElementById('media-vid').src = '';
}

// ══════════════════════════════════════════════════════════════════════
// LOGO TRIGGER (triple-click)
// ══════════════════════════════════════════════════════════════════════
function initLogoTrigger() {
  const el = document.getElementById('logo-container');
  let clicks = 0, timer = null;

  el.addEventListener('click', e => {
    e.preventDefault();
    clicks++;
    if (clicks === 1) timer = setTimeout(() => { clicks = 0; }, 2000);
    if (clicks >= 3) {
      clearTimeout(timer);
      clicks = 0;
      el.classList.add('glow');
      setTimeout(() => el.classList.remove('glow'), 700);
      openLogin();
    }
  });
}

// ══════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════
function openLogin() {
  document.getElementById('login-modal').classList.add('active');
  document.getElementById('login-pw').value = '';
  document.getElementById('login-error').classList.remove('show');
  setTimeout(() => document.getElementById('login-pw').focus(), 200);
}

function closeLogin() {
  document.getElementById('login-modal').classList.remove('active');
}

function attemptLogin() {
  if (document.getElementById('login-pw').value === PW) {
    closeLogin();
    isAdmin = true;
    openAdmin();
  } else {
    document.getElementById('login-error').classList.add('show');
    gsap.fromTo('.login-box', { x: -5 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
    setTimeout(() => document.getElementById('login-error').classList.remove('show'), 2000);
  }
}

// ══════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════
function openAdmin() {
  stopTour();
  deselectProject();
  isAdmin = true;
  document.getElementById('admin-dashboard').classList.add('active');
  renderModes();
  renderProjectList();
  refreshLogoAdminUI();
}

function closeAdmin() {
  document.getElementById('admin-dashboard').classList.remove('active');
  isAdmin = false;
  if (projects.length === 0) showEmpty();
  else { hideEmpty(); startMode(); }
}

function renderModes() {
  const container = document.getElementById('mode-selector');
  container.innerHTML = '';
  MODES.forEach(mode => {
    const div = document.createElement('div');
    div.className = 'mode-option' + (settings.mode === mode.id ? ' active' : '');
    div.innerHTML = `<div class="mode-name">${mode.name}</div><div class="mode-desc">${mode.desc}</div>`;
    div.onclick = () => {
      settings.mode = mode.id;
      saveSettings();
      renderModes();
      notify('Mode: ' + mode.name);
      if (!isAdmin) startMode();
    };
    container.appendChild(div);
  });
}

function renderProjectList(filter = '') {
  const container = document.getElementById('proj-list');
  container.innerHTML = '';

  const filtered = projects.filter(p =>
    !filter || 
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text3);font-size:10px;letter-spacing:1px">No projects found</div>';
    return;
  }

  filtered.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'project-item';
    div.style.opacity = p.enabled ? '1' : '0.35';
    div.innerHTML = `
      <div class="proj-thumb" id="th-${p.id}">📍</div>
      <div class="proj-info">
        <div class="proj-name">${escHtml(p.name)}</div>
        <div class="proj-loc">${escHtml(p.location || '—')} · ${escHtml(p.category || '')}</div>
      </div>
      <div class="proj-actions">
        <button class="proj-action-btn" title="${p.enabled ? 'Disable' : 'Enable'}" onclick="APP.toggleProject('${p.id}')">${p.enabled ? '◉' : '○'}</button>
        <button class="proj-action-btn" title="Edit" onclick="APP.openForm('${p.id}')">✎</button>
        <button class="proj-action-btn" title="Duplicate" onclick="APP.duplicateProject('${p.id}')">⧉</button>
        <button class="proj-action-btn del" title="Delete" onclick="APP.deleteProject('${p.id}')">✕</button>
      </div>
    `;
    div.querySelector('.proj-info').onclick = () => {
      closeAdmin();
      setTimeout(() => {
        const proj = projects.find(x => x.id === p.id);
        if (proj) selectProject(proj);
      }, 300);
    };
    container.appendChild(div);

    // Load thumbnail
    if (p.mediaIds && p.mediaIds.length) loadThumb(p.id, p.mediaIds[0]);
  });
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadThumb(projectId, mediaId) {
  try {
    const media = await dbGet('media', mediaId);
    if (media && media.type.startsWith('image')) {
      const el = document.getElementById('th-' + projectId);
      if (el) el.innerHTML = `<img src="${media.data}" alt="">`;
    }
  } catch(e) {}
}

function filterList(query) {
  searchQuery = query;
  renderProjectList(query);
}

// ══════════════════════════════════════════════════════════════════════
// PROJECT CRUD
// ══════════════════════════════════════════════════════════════════════
function openForm(id = null) {
  editId = id || null;
  pendingMedia = [];
  existingMedia = [];

  if (id) {
    document.getElementById('form-title').textContent = 'Edit Project';
    const p = projects.find(x => x.id === id);
    if (!p) return;
    document.getElementById('f-name').value = p.name || '';
    document.getElementById('f-category').value = p.category || 'Commercial';
    document.getElementById('f-location').value = p.location || '';
    document.getElementById('f-coords').value = p.mapX != null ? `${p.mapX.toFixed(3)}, ${p.mapY.toFixed(3)}` : '';
    document.getElementById('f-desc').value = p.description || '';
    document.getElementById('f-date').value = p.date || '';
    document.getElementById('f-enabled').classList.toggle('on', p.enabled !== false);
    existingMedia = [...(p.mediaIds || [])];
    renderMediaThumbs();
  } else {
    document.getElementById('form-title').textContent = 'Add Project';
    ['f-name', 'f-location', 'f-coords', 'f-desc', 'f-date'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-category').value = 'Commercial';
    document.getElementById('f-enabled').classList.add('on');
    document.getElementById('media-thumbs').innerHTML = '';
  }

  document.getElementById('project-form-modal').classList.add('active');
}

function closeForm() {
  document.getElementById('project-form-modal').classList.remove('active');
  editId = null;
  pendingMedia = [];
  existingMedia = [];
}

async function saveProject() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { notify('Enter a project name'); return; }

  const coordsStr = document.getElementById('f-coords').value;
  let mapX = 0.35, mapY = 0.55;
  if (coordsStr) {
    const parts = coordsStr.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      mapX = parts[0];
      mapY = parts[1];
    }
  }

  // Save new media
  const newIds = [];
  for (const m of pendingMedia) {
    const id = 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    await dbPut('media', { id, type: m.type, data: m.data, name: m.name });
    newIds.push(id);
  }

  const project = {
    id: editId || 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8),
    name,
    category: document.getElementById('f-category').value,
    location: document.getElementById('f-location').value.trim(),
    mapX,
    mapY,
    description: document.getElementById('f-desc').value.trim(),
    date: document.getElementById('f-date').value,
    enabled: document.getElementById('f-enabled').classList.contains('on'),
    mediaIds: [...existingMedia, ...newIds],
    order: editId ? (projects.find(p => p.id === editId)?.order ?? projects.length) : projects.length
  };

  await dbPut('projects', project);

  const existingIdx = projects.findIndex(p => p.id === project.id);
  if (existingIdx >= 0) projects[existingIdx] = project;
  else projects.push(project);

  projects.sort((a, b) => (a.order || 0) - (b.order || 0));
  rebuildPins();
  renderProjectList(searchQuery);
  closeForm();
  notify(editId ? 'Project updated' : 'Project added');
  hideEmpty();
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  const p = projects.find(x => x.id === id);
  if (p && p.mediaIds) {
    for (const mid of p.mediaIds) {
      try { await dbDel('media', mid); } catch(e) {}
    }
  }
  await dbDel('projects', id);
  projects = projects.filter(x => x.id !== id);
  removePin(id);
  renderProjectList(searchQuery);
  notify('Project deleted');
  if (projects.length === 0) showEmpty();
}

async function toggleProject(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  p.enabled = !p.enabled;
  await dbPut('projects', p);
  rebuildPins();
  renderProjectList(searchQuery);
  notify(p.enabled ? 'Enabled' : 'Disabled');
}

async function duplicateProject(id) {
  const source = projects.find(x => x.id === id);
  if (!source) return;
  const newProj = {
    ...JSON.parse(JSON.stringify(source)),
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8),
    name: source.name + ' (Copy)',
    order: projects.length
  };
  await dbPut('projects', newProj);
  projects.push(newProj);
  rebuildPins();
  renderProjectList(searchQuery);
  notify('Duplicated');
}

// ══════════════════════════════════════════════════════════════════════
// MEDIA HANDLING
// ══════════════════════════════════════════════════════════════════════
function initMediaDrop() {
  const dropZone = document.getElementById('drop-zone');
  const input = document.getElementById('media-input');

  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
  });

  dropZone.addEventListener('drop', e => processFiles(e.dataTransfer.files));
  input.addEventListener('change', e => { processFiles(e.target.files); input.value = ''; });
}

function processFiles(files) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
  Array.from(files).forEach(file => {
    if (!allowed.includes(file.type)) return;
    const reader = new FileReader();
    reader.onload = e => {
      pendingMedia.push({ type: file.type, data: e.target.result, name: file.name });
      renderMediaThumbs();
    };
    reader.readAsDataURL(file);
  });
}

async function renderMediaThumbs() {
  const container = document.getElementById('media-thumbs');
  container.innerHTML = '';

  // Existing media
  for (let i = 0; i < existingMedia.length; i++) {
    try {
      const m = await dbGet('media', existingMedia[i]);
      if (!m) continue;
      const div = document.createElement('div');
      div.className = 'media-thumb' + (m.type.startsWith('video') ? ' is-video' : '');
      div.innerHTML = (m.type.startsWith('image') ? `<img src="${m.data}">` : `<video src="${m.data}" muted></video>`) +
        `<button class="remove-media" onclick="APP.removeExistingMedia(${i})">✕</button>`;
      container.appendChild(div);
    } catch(e) {}
  }

  // Pending media
  pendingMedia.forEach((m, i) => {
    const div = document.createElement('div');
    div.className = 'media-thumb' + (m.type.startsWith('video') ? ' is-video' : '');
    div.innerHTML = (m.type.startsWith('image') ? `<img src="${m.data}">` : `<video src="${m.data}" muted></video>`) +
      `<button class="remove-media" onclick="APP.removePendingMedia(${i})">✕</button>`;
    container.appendChild(div);
  });
}

function removePendingMedia(index) {
  pendingMedia.splice(index, 1);
  renderMediaThumbs();
}

function removeExistingMedia(index) {
  existingMedia.splice(index, 1);
  renderMediaThumbs();
}

// ══════════════════════════════════════════════════════════════════════
// LOCATION PICKER
// ══════════════════════════════════════════════════════════════════════
function startPick() {
  picking = true;
  document.getElementById('pick-mode-overlay').classList.add('active');
  document.getElementById('pick-mode-hint').classList.add('active');
  document.getElementById('project-form-modal').style.opacity = '0.15';
}

function doPick(e) {
  if (!picking) return;
  const norm = screenToNormalized(e.clientX, e.clientY);
  document.getElementById('f-coords').value = `${norm.x.toFixed(3)}, ${norm.y.toFixed(3)}`;
  endPick();
}

function endPick() {
  picking = false;
  document.getElementById('pick-mode-overlay').classList.remove('active');
  document.getElementById('pick-mode-hint').classList.remove('active');
  document.getElementById('project-form-modal').style.opacity = '1';
}

// ══════════════════════════════════════════════════════════════════════
// LOGO MANAGEMENT
// ══════════════════════════════════════════════════════════════════════
function initLogoUpload() {
  const input = document.getElementById('logo-file-input');
  input.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target.result;
      await dbPut('media', { id: 'company_logo', type: file.type, data: dataUrl, name: file.name });
      applyLogo(dataUrl);
      refreshLogoAdminUI();
      notify('Logo uploaded');
    };
    reader.readAsDataURL(file);
    input.value = '';
  });
}

function uploadLogo() {
  document.getElementById('logo-file-input').click();
}

async function removeLogo() {
  try { await dbDel('media', 'company_logo'); } catch(e) {}
  
  // Reset to placeholder
  document.getElementById('corner-logo-img').style.display = 'none';
  document.getElementById('corner-logo-placeholder').style.display = 'block';
  document.getElementById('startup-logo').style.display = 'none';
  document.getElementById('startup-logo-placeholder').style.display = 'flex';
  
  refreshLogoAdminUI();
  notify('Logo removed');
}

async function loadSavedLogo() {
  try {
    const logo = await dbGet('media', 'company_logo');
    if (logo && logo.data) {
      applyLogo(logo.data);
      return true;
    }
  } catch(e) {}
  return false;
}

function applyLogo(dataUrl) {
  const corner = document.getElementById('corner-logo-img');
  corner.src = dataUrl;
  corner.style.display = '';
  corner.onerror = null;
  document.getElementById('corner-logo-placeholder').style.display = 'none';

  const startup = document.getElementById('startup-logo');
  startup.src = dataUrl;
  startup.style.display = '';
  startup.onerror = null;
  document.getElementById('startup-logo-placeholder').style.display = 'none';
}

function refreshLogoAdminUI() {
  const preview = document.getElementById('admin-logo-preview');
  const status = document.getElementById('logo-status');
  const removeBtn = document.getElementById('remove-logo-btn');
  const corner = document.getElementById('corner-logo-img');
  const hasLogo = corner.style.display !== 'none' && corner.src && !corner.src.includes('iere-logo.png');

  if (hasLogo) {
    preview.innerHTML = `<img src="${corner.src}" alt="Logo">`;
    status.textContent = 'Logo uploaded';
    removeBtn.style.display = '';
  } else {
    preview.innerHTML = '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="12" stroke="#8B5CF6" stroke-width="1.5" opacity="0.3"/><path d="M50 30L60 45H40L50 30Z" stroke="#8B5CF6" stroke-width="1.5" opacity="0.35"/><circle cx="50" cy="60" r="9" stroke="#8B5CF6" stroke-width="1.5" opacity="0.3"/></svg>';
    status.textContent = 'No logo uploaded';
    removeBtn.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════════════════════════════════════════════
async function exportData() {
  try {
    const p = await dbGetAll('projects');
    const m = await dbGetAll('media');
    const blob = new Blob([JSON.stringify({ projects: p, media: m, settings, v: 1 })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `iere-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify('Backup exported');
  } catch(e) {
    notify('Export failed');
  }
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async e => {
    try {
      const text = await e.target.files[0].text();
      const data = JSON.parse(text);
      if (!data.projects) throw new Error('Invalid backup');

      // Clear existing
      const allProjects = await dbGetAll('projects');
      for (const p of allProjects) await dbDel('projects', p.id);
      const allMedia = await dbGetAll('media');
      for (const m of allMedia) await dbDel('media', m.id);

      // Import
      for (const p of data.projects) await dbPut('projects', p);
      if (data.media) for (const m of data.media) await dbPut('media', m);
      if (data.settings) { Object.assign(settings, data.settings); saveSettings(); syncSettingsUI(); }

      projects = data.projects;
      projects.sort((a, b) => (a.order || 0) - (b.order || 0));
      rebuildPins();
      renderProjectList();
      renderModes();
      notify('Imported successfully');
      hideEmpty();
    } catch(e) {
      notify('Import failed');
    }
  };
  input.click();
}

// ══════════════════════════════════════════════════════════════════════
// AUTO-BACKUP
// ══════════════════════════════════════════════════════════════════════
function startAutoBackup() {
  setInterval(async () => {
    try {
      const p = await dbGetAll('projects');
      await dbPut('backups', { ts: Date.now(), data: JSON.stringify({ projects: p, settings }) });
      const all = await dbGetAll('backups');
      if (all.length > 12) {
        const sorted = all.sort((a, b) => b.ts - a.ts);
        for (let i = 12; i < sorted.length; i++) await dbDel('backups', sorted[i].ts);
      }
    } catch(e) {}
  }, 300000); // 5 minutes
}

// ══════════════════════════════════════════════════════════════════════
// NOTIFICATION
// ══════════════════════════════════════════════════════════════════════
function notify(msg) {
  const el = document.getElementById('notification');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ══════════════════════════════════════════════════════════════════════
// ERROR RECOVERY
// ══════════════════════════════════════════════════════════════════════
window.addEventListener('error', () => {
  try { if (!animationId) animate(); } catch(e) {}
});

window.addEventListener('unhandledrejection', e => {
  console.warn('Promise rejection:', e.reason);
});

// ESC key handling
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (picking) endPick();
    else if (selectedProject) deselectProject();
  }
});

// ══════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════
async function init() {
  try {
    await openDB();
    loadSettings();
    projects = await dbGetAll('projects');
    projects.sort((a, b) => (a.order || 0) - (b.order || 0));
    await loadSavedLogo();
    initScene();
    rebuildPins();
    initMediaDrop();
    initLogoUpload();
    initLogoTrigger();
    startAutoBackup();
    
    // Enter key for login
    document.getElementById('login-pw').addEventListener('keydown', e => {
      if (e.key === 'Enter') attemptLogin();
    });

    runStartup();
  } catch(e) {
    console.error('Init error:', e);
    document.getElementById('startup-overlay').style.display = 'none';
    startupDone = true;
    gsap.to('#logo-container', { opacity: 1, duration: 1 });
    showEmpty();
  }
}

document.addEventListener('DOMContentLoaded', init);

// ══════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════
return {
  closeLogin,
  attemptLogin,
  openAdmin,
  closeAdmin,
  openForm,
  closeForm,
  saveProject,
  deleteProject,
  toggleProject,
  duplicateProject,
  filterList,
  setSetting,
  startPick,
  doPick,
  removePendingMedia,
  removeExistingMedia,
  exportData,
  importData,
  notify,
  uploadLogo,
  removeLogo,
  closeCard: hideCard,
  deselectProject
};

})();
