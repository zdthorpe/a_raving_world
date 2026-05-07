import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js"; // imports orbit controls (ability to drag/zoom around scene with mouse)
import GUI from 'lil-gui';
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "jsm/postprocessing/OutputPass.js";




// Create renderer and set renderer size
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // softer shadow edges
document.body.appendChild(renderer.domElement); // appends renderer to the "dom" (aka HTML) element

// Create camera with fov, aspect, near, and far parameters
const fov = 75; // This is measured in degrees (like shallow/deep depth of field for aperture)
const aspect = w / h; // aspect ratio (?)
const near = 0.1; // How close to the camera the renderer will begin
const far = 20; // How far away to the camera the renderer will end
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 4; // changes position of camera on z-axis by 2 unites

// Create Audio Listener
const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.Audio(listener);
const technoSound = new THREE.Audio(listener);
const trance = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('audio/passion.mp3', function(buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
});
audioLoader.load('audio/torque.mp3', function(buffer) {
    technoSound.setBuffer(buffer);
    technoSound.setLoop(true);
    technoSound.setVolume(0.5);
});
audioLoader.load('audio/driftingaway.mp3', function(buffer) {
    trance.setBuffer(buffer);
    trance.setLoop(true);
    trance.setVolume(0.5);
});


// Low-pass filter — applied outside the inner sphere, bypassed inside
const lowPassFilter = listener.context.createBiquadFilter();
lowPassFilter.type = 'lowpass';
lowPassFilter.frequency.value = 300; // start filtered (camera begins outside)
sound.setFilter(lowPassFilter);
technoSound.setFilter(lowPassFilter);
trance.setFilter(lowPassFilter);

// Create scene / add fog
const scene = new THREE.Scene();
const outerFog = new THREE.FogExp2(0x111111, .3);
const innerFog = new THREE.FogExp2(0x111111, 1); // dark grey haze, layer 1 only
scene.fog = outerFog;

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // allows controls to have smooth/longer release; must be added to animate function
controls.dampingFactor = 0.03;


// Postprocessing renderer and composer
const renderScene = new RenderPass(scene, camera);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);

// Outer bloom settings
const OUTER_BLOOM = { strength: 0.2, radius: 1, threshold: 0.1 };
// Inner bloom settings (exposed to GUI)
let INNER_BLOOM_STRENGTH  = 0.15;
let INNER_BLOOM_RADIUS    = 0.7;
let INNER_BLOOM_THRESHOLD = 0.39;

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    OUTER_BLOOM.strength,
    OUTER_BLOOM.radius,
    OUTER_BLOOM.threshold
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// skysphere
const skysphereRadius = 5
const skyGeometry = new THREE.SphereGeometry(skysphereRadius, 30, 30);
const skyTexture = new THREE.TextureLoader().load("assets/fog_skyphere.png");
const skyMaterial = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
});
const skySphere = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(skySphere);


// Raycaster for click-to-enter interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let cameraTargetPos = null;
let controlsTargetPos = null;
let transitioning = false;

let mouseDownPos = null;
const DRAG_THRESHOLD = 4; // pixels

renderer.domElement.addEventListener('mousedown', (event) => {
    mouseDownPos = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('mouseup', (event) => {
    if (!mouseDownPos) return;

    const dx = event.clientX - mouseDownPos.x;
    const dy = event.clientY - mouseDownPos.y;
    const moved = Math.sqrt(dx * dx + dy * dy);
    mouseDownPos = null;

    if (moved > DRAG_THRESHOLD) return; // was a drag, not a click

    mouse.x = (event.clientX / w) * 2 - 1;
    mouse.y = -(event.clientY / h) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(pointsGroup.children);

    if (intersects.length > 0) {
        const worldPos = new THREE.Vector3();
        intersects[0].object.getWorldPosition(worldPos);

        // Move camera inside the sphere toward the direction of the clicked point
        cameraTargetPos = worldPos.clone().normalize().multiplyScalar(0.8);
        controlsTargetPos = new THREE.Vector3(0, 0, 0);
        transitioning = true;
        controls.enabled = false;
    }
});

// Create main sphere
const geo = new THREE.SphereGeometry(2, 30, 30 ); // geometry parameters
const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    flatShading: false,
    transparent: true,
    opacity: 0.03
}); // creates material for geometry-- MeshStandardMaterial interacts with light, basic material does not 
const mesh = new THREE.Mesh(geo, mat); // compiles geometry and material into a "mesh" (aka 3D Object)
mesh.receiveShadow = true;
scene.add(mesh); // adds mesh object to scene

// Create inner sphere
const rave_sphere = new THREE.SphereGeometry(1.9, 30, 30 ); // geometry parameters
const rave_mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff, // ADD COLOR CHANGING PARAMETER
    emissiveIntensity: 0,
    side: THREE.BackSide,
    flatShading: false,
    transparent: true,
    fog: true,
    opacity: 1.0
}); // creates material for geometry-- MeshStandardMaterial interacts with light, basic material does not 
const rave_mesh = new THREE.Mesh(rave_sphere, rave_mat); // compiles geometry and material into a "mesh" (aka 3D Object)
rave_mesh.receiveShadow = true;
rave_mesh.layers.set(1); // assign inner sphere to layer 1
scene.add(rave_mesh); // adds mesh object to scene


// Rave sphere lights (layer 1) ------------------------------
const innerLight = new THREE.PointLight(0x000000, 2, 50);
innerLight.position.set(0, 0, 0);
innerLight.layers.set(1);
scene.add(innerLight);
camera.layers.enable(1);


// ---- Laser Strobe tuning -----------------------------------------------
const LASER_INTENSITY_MIN  = 0;    // off at the bottom of the pulse
const LASER_INTENSITY_MAX  = 15;   // peak brightness
// const LASER_STROBE_SPEED   = 0.005; // higher = faster strobe (try 0.002–0.05)
let LASER_STROBE_SPEED   = 0.005;
// ---- Laser Pivot tuning ------------------------------------------------
const LASER_PIVOT_SPEED    = 0.001; // how fast lasers sweep in/out (try 0.0005–0.005)
const LASER_PIVOT_ANGLE_MIN = -0.5; // most vertical (inward) angle in radians
const LASER_PIVOT_ANGLE_MAX = Math.PI / 2.5; // most outward angle in radians
// ---- Inner Ambient Light tuning ----------------------------------------
const INNER_AMBIENT_MIN    = -3;    // minimum brightness (0 = fully off)
let INNER_AMBIENT_MAX    = 1;    // maximum brightness
let INNER_AMBIENT_SPEED  = 0.01; // pulse speed (try 0.001–0.01)
// ------------------------------------------------------------------------

// Pulsing glow — driven via rave_mat emissive so it works on the black inner surface

// Lasers
const cylHeight = 9;
const cylGeo = new THREE.CylinderGeometry(0.01, 0.02, cylHeight, 16);
const cylMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x88ccff,
    transparent: true,
    depthWrite: false,
    emissiveIntensity: LASER_INTENSITY_MAX
});

const laserGroup = new THREE.Group();
laserGroup.layers.set(1);
scene.add(laserGroup);
laserGroup.position.y = 1.9;

const laserPivots = [];
const laserInnerPivots = []; // stored separately for pivot animation
const numLasers = 10;

for (let i = 0; i < numLasers; i++) {
    // Outer pivot: spreads each laser evenly around the Y axis
    const outerPivot = new THREE.Group();
    outerPivot.rotation.y = (i / numLasers) * Math.PI * 2;

    // Inner pivot: tilt angle is animated — stored for access in animate()
    const innerPivot = new THREE.Group();
    innerPivot.rotation.z = Math.PI / 4;

    const cylMesh = new THREE.Mesh(cylGeo, cylMat);
    // Pull cylinder down so its top cap sits at innerPivot's origin (the rotation center)
    cylMesh.position.y = -cylHeight / 2;
    cylMesh.layers.set(1);

    innerPivot.add(cylMesh);
    outerPivot.add(innerPivot);
    laserGroup.add(outerPivot);
    laserPivots.push(outerPivot);
    laserInnerPivots.push(innerPivot);
}


// ----------------------------------------------


// Adding points group
const pointsGroup = new THREE.Group();
const points = [];
const numPoints = 50; // Adjust number of points as needed


// Create grayscale radial gradient for alpha control (white center = opaque, black edge = transparent)
const gradientCanvas = document.createElement('canvas');
gradientCanvas.width = 64;
gradientCanvas.height = 64;
const gradientCtx = gradientCanvas.getContext('2d');
const radialGradient = gradientCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
radialGradient.addColorStop(0, 'white');
radialGradient.addColorStop(1, 'black');
gradientCtx.fillStyle = radialGradient;
gradientCtx.fillRect(0, 0, 64, 64);
const pointAlphaMap = new THREE.CanvasTexture(gradientCanvas);

// ---- Point Pulse tuning -----------------------------------------------
const PULSE_SCALE_MIN  = 0;  // smallest a point can shrink to
const PULSE_SCALE_MAX  = 4;  // largest a point can grow to
const PULSE_SPEED_MIN  = 0.00001; // slowest pulse rate  (~16s full cycle)
const PULSE_SPEED_MAX  = 0.0002; // fastest pulse rate  (~5s full cycle)
// -----------------------------------------------------------------

// Create point geometry
const pointGeometry = new THREE.CircleGeometry(0.1, 32);

// Generate points on sphere surface
for (let i = 0; i < numPoints; i++) {
    const brightness = 0.2 + Math.random() * 0.8; // range: 0.2 (dim) to 1.0 (full white)
    const pointMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(brightness, brightness, brightness),
        alphaMap: pointAlphaMap,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    
    // Generate random spherical coordinates
    const phi = Math.random() * Math.PI * 2; // azimuthal angle
    const theta = Math.acos(2 * Math.random() - 1); // polar angle (uniform distribution)
    
    // Convert to Cartesian coordinates on sphere surface (radius = 2)
    const radius = 2; // Match your sphere radius
    point.position.x = radius * Math.sin(theta) * Math.cos(phi);
    point.position.y = radius * Math.cos(theta);
    point.position.z = radius * Math.sin(theta) * Math.sin(phi);

    // Orient disc to face outward along sphere surface normal
    const outward = point.position.clone().normalize();
    point.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);

    // Build a random tangent velocity vector (no spherical coords, no pole problem)
    const vDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    vDir.sub(outward.clone().multiplyScalar(vDir.dot(outward))).normalize(); // make tangent to sphere
    const speed = 0.002 + Math.random() * 0.002;
    const scaleSpeed = PULSE_SPEED_MIN + Math.random() * (PULSE_SPEED_MAX - PULSE_SPEED_MIN);
    const scalePhase = Math.random() * Math.PI * 2; // random starting point in the pulse cycle
    point.userData = {
        velocity: vDir.multiplyScalar(speed),
        speed,
        scaleSpeed,
        scalePhase
    };

    
    
    points.push(point);
    pointsGroup.add(point);
}
// Add points group to the same parent as the sphere so they rotate together
scene.add(pointsGroup);

// Dim ambient fill so the back of the sphere isn't pure black
const hemiLight = new THREE.HemisphereLight(0x223344, 0x223344, 100);
scene.add(hemiLight);


// animate object
function animate(t = 0) {
    requestAnimationFrame(animate);
    mesh.rotation.y = t * 0.0001;
    // Update points positions and rotate them with the sphere
    points.forEach(point => {
        const radius = 2;
        const posNorm = point.position.clone().normalize();

        // Gently steer with a small random tangent nudge each frame
        const steer = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        steer.sub(posNorm.clone().multiplyScalar(steer.dot(posNorm))); // project onto tangent plane
        point.userData.velocity.add(steer.multiplyScalar(0.000002));

        // Remove any radial drift and hold constant speed
        point.userData.velocity.sub(posNorm.clone().multiplyScalar(point.userData.velocity.dot(posNorm)));
        point.userData.velocity.normalize().multiplyScalar(point.userData.speed);

        // Move and snap back onto sphere surface
        point.position.add(point.userData.velocity);
        point.position.normalize().multiplyScalar(radius);

        // Keep disc facing outward as it moves
        const outward = point.position.clone().normalize();
        point.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);

        // laser Pulse scale using a sine wave (0.5 + 0.5*sin maps -1..1 → 0..1)
        const pulse = 0.5 + 0.5 * Math.sin(t * point.userData.scaleSpeed + point.userData.scalePhase);
        const scale = PULSE_SCALE_MIN + pulse * (PULSE_SCALE_MAX - PULSE_SCALE_MIN);
        point.scale.setScalar(scale);
    });
    
    // Rotate points group with the sphere
    pointsGroup.rotation.y = t * 0.0001;

    // Spin all lasers around the Y axis (top-vertex pivot)
    laserGroup.rotation.y = t * 0.0005;

    // Alternate pivot: even lasers and odd lasers are PI out of phase so they sweep opposite directions
    laserInnerPivots.forEach((pivot, i) => {
        const phase = (i % 2 === 0) ? 0 : Math.PI;
        const swing = 0.5 + 0.5 * Math.sin(t * LASER_PIVOT_SPEED + phase);
        pivot.rotation.z = LASER_PIVOT_ANGLE_MIN + swing * (LASER_PIVOT_ANGLE_MAX - LASER_PIVOT_ANGLE_MIN);
    });

    // Strobe: pulse emissiveIntensity with a sine wave
    const strobe = 0.5 + 0.5 * Math.sin(t * LASER_STROBE_SPEED);
    cylMat.emissiveIntensity = LASER_INTENSITY_MIN + strobe * (LASER_INTENSITY_MAX - LASER_INTENSITY_MIN);
    cylMat.opacity = strobe; // fade out completely so the base color doesn't show through

    // Pulse inner sphere glow via emissive
    const ambientPulse = 0.5 + 0.5 * Math.sin(t * INNER_AMBIENT_SPEED);
    rave_mat.emissiveIntensity = INNER_AMBIENT_MIN + ambientPulse * (INNER_AMBIENT_MAX - INNER_AMBIENT_MIN);

    // Smooth camera transition into the sphere on click
    if (transitioning && cameraTargetPos) {
        camera.position.lerp(cameraTargetPos, 0.04);
        controls.target.lerp(controlsTargetPos, 0.04);
        if (camera.position.distanceTo(cameraTargetPos) < 0.05) {
            camera.position.copy(cameraTargetPos);
            controls.target.copy(controlsTargetPos);
            transitioning = false;
            controls.enabled = true;
        }
    }

    // Show lasers and lift audio filter only when camera is inside the inner sphere (radius 1.9)
    const insideSphere = camera.position.length() < 1.9;
    laserGroup.visible = insideSphere;
    lowPassFilter.frequency.value = insideSphere ? 20000 : 300;

    // Swap bloom params and fog based on camera position, render both layers
    if (insideSphere) {
        bloomPass.strength  = INNER_BLOOM_STRENGTH;
        bloomPass.radius    = INNER_BLOOM_RADIUS;
        bloomPass.threshold = INNER_BLOOM_THRESHOLD;
        scene.fog = innerFog;
    } else {
        bloomPass.strength  = OUTER_BLOOM.strength;
        bloomPass.radius    = OUTER_BLOOM.radius;
        bloomPass.threshold = OUTER_BLOOM.threshold;
        scene.fog = outerFog;
    }
    camera.layers.enable(0);
    camera.layers.enable(1);
    composer.render();

    controls.update();
}
animate();

// GUI
const gui = new GUI();
gui.close();

const houseLabel  = document.getElementById('house-label');
const technoLabel = document.getElementById('techno-label');
const tranceLabel = document.getElementById('trance-label');
houseLabel.classList.add('hidden');
technoLabel.classList.add('hidden');
tranceLabel.classList.add('hidden');

const hideAllLabels = () => {
    houseLabel.classList.add('hidden');
    technoLabel.classList.add('hidden');
    tranceLabel.classList.add('hidden');
};

const params = {
    strobeSpeed: LASER_STROBE_SPEED,
    glowColor: '#8d8d8d',
    ambientMax: INNER_AMBIENT_MAX,
    ambientSpeed: INNER_AMBIENT_SPEED,
    toggleAudio: () => {
        if (technoSound.isPlaying) technoSound.stop();
        if (trance.isPlaying) trance.stop();
        if (sound.isPlaying) {
            sound.pause();
            hideAllLabels();
        } else {
            sound.play();
            hideAllLabels();
            houseLabel.classList.remove('hidden');
        }
    },
    playTechno: () => {
        if (sound.isPlaying) sound.stop();
        if (trance.isPlaying) trance.stop();
        if (technoSound.isPlaying) {
            technoSound.stop();
            hideAllLabels();
        } else {
            technoSound.play();
            hideAllLabels();
            technoLabel.classList.remove('hidden');
        }
    },
    trance: () => {
        if (sound.isPlaying) sound.stop();
        if (technoSound.isPlaying) technoSound.stop();
        if (trance.isPlaying) {
            trance.stop();
            hideAllLabels();
        } else {
            trance.play();
            hideAllLabels();
            tranceLabel.classList.remove('hidden');
        }
    }
};
gui.add(params, 'strobeSpeed', 0.001, 0.05, 0.001)
    .name('laser strobe speed')
    .onChange(v => { LASER_STROBE_SPEED = v; });
gui.addColor(params, 'glowColor')
    .name('ambient strobe color')
    .onChange(v => { rave_mat.emissive.set(v); });
gui.add(params, 'ambientMax', 0, 20, 0.5)
    .name('ambient brightness')
    .onChange(v => { INNER_AMBIENT_MAX = v; });
gui.add(params, 'ambientSpeed', 0.001, 0.05, 0.001)
    .name('ambient pulse speed')
    .onChange(v => { INNER_AMBIENT_SPEED = v; });
const innerBloomFolder = gui.addFolder('inner bloom');
innerBloomFolder.add({ strength: INNER_BLOOM_STRENGTH }, 'strength', 0, 5, 0.05)
    .name('strength')
    .onChange(v => { INNER_BLOOM_STRENGTH = v; });
innerBloomFolder.add({ radius: INNER_BLOOM_RADIUS }, 'radius', 0, 2, 0.05)
    .name('radius')
    .onChange(v => { INNER_BLOOM_RADIUS = v; });
innerBloomFolder.add({ threshold: INNER_BLOOM_THRESHOLD }, 'threshold', 0, 1, 0.01)
    .name('threshold')
    .onChange(v => { INNER_BLOOM_THRESHOLD = v; });
gui.add(params, 'toggleAudio').name('house');
gui.add(params, 'playTechno').name('techno');
gui.add(params, 'trance').name('trance');

// Side Bar
const trigger = document.getElementById("overlay-right");
const sidebar = document.getElementById("sidebar");
const closeBtn = document.getElementById("close-btn");

// Open sidebar
trigger.addEventListener("click", () => {
  sidebar.classList.add("active");
});

// Close sidebar
closeBtn.addEventListener("click", () => {
  sidebar.classList.remove("active");
});

// Return to outer view
const return_view = document.getElementById("overlay-left");
return_view.addEventListener("click", () => {
    cameraTargetPos = new THREE.Vector3(0, 0, 4);
    controlsTargetPos = new THREE.Vector3(0, 0, 0);
    transitioning = true;
    controls.enabled = false;
})