import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/RGBELoader.js/+esm';

import { MODEL_CONFIG as BLACK_PRIZM_ROAD } from './configs/black_prizm_road.js';
import { MODEL_CONFIG as MATTE_BLACK_CLEAR } from './configs/matte_black_clear.js';
import { MODEL_CONFIG as SHINY_BLACK_GREEN } from './configs/shiny_black_green.js';
import { MODEL_CONFIG as MATTE_BLACK_GGRAPH } from './configs/matte_black_ggraph.js';
import { MODEL_CONFIG as SHINY_BLACK_CGREEN } from './configs/shiny_black_cgreen.js';
import { MODEL_CONFIG as MATTE_BLACK_CGREY } from './configs/matte_black_cgrey.js';

// ─────────────────────────────────────────────
// VAR
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2); 

const logoTexture = new THREE.TextureLoader().load('./textures/Coperni_alpha.jpg');
const textureLoader = new THREE.TextureLoader();

logoTexture.colorSpace = THREE.SRGBColorSpace;
logoTexture.flipY = false; // flip glTF

const cameras = {};

const clock = new THREE.Clock();

let currentConfig = BLACK_PRIZM_ROAD;
let currentModel = null;
const loader = new GLTFLoader();

let glassAnimationEnabled = true;
let activeCameraName = null;
let glassAnimateCamera = null;
let wasAnimatingGlass = false;



// ─────────────────────────────
// UI FOR MODEL SELECTION
// ─────────────────────────────

const modelUI = document.createElement('div');
modelUI.style.position = 'fixed';
modelUI.style.right = '20px';
modelUI.style.top = '50%';
modelUI.style.transform = 'translateY(-50%)';
modelUI.style.display = 'flex';
modelUI.style.flexDirection = 'column';
modelUI.style.gap = '10px';
modelUI.style.zIndex = '20';

document.body.appendChild(modelUI);

function makeModelButton(label, config) {
  const btn = document.createElement('button');
  btn.textContent = label;

  btn.style.padding = '10px 16px';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.style.background = '#222';
  btn.style.color = '#fff';
  btn.style.fontSize = '14px';

  btn.onclick = () => {
    currentConfig = config;
    loadModel(config);
  };

  modelUI.appendChild(btn);
}

makeModelButton('Black Prizm Road', BLACK_PRIZM_ROAD);
//makeModelButton('Matte Black Clear', MATTE_BLACK_CLEAR);
//makeModelButton('Shiny Black Green', SHINY_BLACK_GREEN);
//makeModelButton('Matte Black Gradient Graphite', MATTE_BLACK_GGRAPH);
//makeModelButton('Shiny Black Clear to Green', SHINY_BLACK_CGREEN);
//makeModelButton('Matte Black Clear to Grey', MATTE_BLACK_CGREY);


// ─────────────────────────────
// LOAD GLB MODEL
// ─────────────────────────────

function loadModel(config) {
	
  glassAnimationEnabled = config.glass.animate === true;
  glassAnimateCamera = config.glass.animateCamera || null;
  
  // ───── clean last model
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  // state reset
  glassMaterials.length = 0;
  originalGlassColors.length = 0;
  glassAnim.state = 'waitGreen';
  glassAnim.timer = 0;
  Object.keys(cameraTargets).forEach(k => delete cameraTargets[k]);

	loader.load(config.glb, (gltf) => {

	  currentModel = gltf.scene;
	  scene.add(currentModel);

	  // ───── calculate model pivot
	  const box = new THREE.Box3().setFromObject(currentModel);
	  const modelCenter = new THREE.Vector3();
	  box.getCenter(modelCenter);

	  // ───── load cameras + materials
	  gltf.scene.traverse(obj => {

		// ───── cameras
		if (obj.isCamera) {

		  const pos = obj.getWorldPosition(new THREE.Vector3());
		  const quat = obj.getWorldQuaternion(new THREE.Quaternion());

		  cameraTargets[obj.name] = {
			position: pos,
			quaternion: quat,
			target: modelCenter.clone(),
			fov: obj.getEffectiveFOV()
		  };
		}

		// ───── glass
		if (obj.isMesh && obj.material?.name?.toLowerCase().includes('glass')) {

		  const mat = new THREE.MeshPhysicalMaterial({
			  color: new THREE.Color(0.05, 0.05, 0.05),
			  roughness: 0.05,
			  metalness: 0.0,

			  transparent: true,
			  alphaTest: 0.01,
			  opacity: 0.85,
			  transmission: 0.0,
			  ior: 1.45,

			  depthWrite: false,

			  // 🔑 CLAVE
			  envMapIntensity: 2.2
			});
			
			mat.specularIntensity = 1.0;
			mat.specularColor = new THREE.Color(1.0, 1.0, 1.0);



		  // ───── OPACITY GRADIENT
		  if (config.glass.opacityMap) {
			const alphaTex = textureLoader.load(config.glass.opacityMap);
			alphaTex.flipY = false;
			alphaTex.colorSpace = THREE.NoColorSpace;
			mat.alphaMap = alphaTex;
			mat.alphaTest = 0.01;
		  }
		  
		  

		  // ───── LOGO
		  mat.emissiveMap = logoTexture;
		  mat.emissive = new THREE.Color(1, 1, 1);
		  mat.emissiveIntensity = 0.6;

		  // ───── FRESNEL CROMÁTICO
		  if (config.glass.fresnel?.enabled) {

			const fresnelCfg = config.glass.fresnel;

		mat.onBeforeCompile = (shader) => {

		  shader.uniforms.fresnelIntensity = { value: fresnelCfg.intensity };

		  shader.uniforms.colorFront = { value: new THREE.Color(...fresnelCfg.colorFront) };
		  shader.uniforms.colorMid   = { value: new THREE.Color(...fresnelCfg.colorMid) };
		  shader.uniforms.colorEdge  = { value: new THREE.Color(...fresnelCfg.colorEdge) };

		  // 1️⃣ Declarar uniforms en GLSL
		  shader.fragmentShader = shader.fragmentShader.replace(
			'#include <common>',
			`
			#include <common>

			uniform float fresnelIntensity;
			uniform vec3 colorFront;
			uniform vec3 colorMid;
			uniform vec3 colorEdge;
			`
		  );

		  // 2️⃣ Usarlos en el punto correcto
		  shader.fragmentShader = shader.fragmentShader.replace(
			'#include <lights_fragment_end>',
			`
			#include <lights_fragment_end>

			float f = pow(
			  1.0 - dot(geometryNormal, normalize(vViewPosition)),
			  0.8
			);

			vec3 fresnelColor = mix(
			  colorFront,
			  mix(colorMid, colorEdge, smoothstep(0.3, 0.9, f)),
			  smoothstep(0.02, 0.6, f)
			);

			reflectedLight.indirectSpecular.rgb += fresnelColor * f * fresnelIntensity;

			vec3 frontTint = colorFront * (1.0 - f) * 0.35;

			reflectedLight.indirectSpecular.rgb +=
			  frontTint +
			  fresnelColor * f * fresnelIntensity;

			`
		  );
		};

		  mat.needsUpdate = true;

		  glassMaterials.push(mat);
		  originalGlassColors.push(mat.color.clone());
		  obj.material = mat;
		}
		}	
	  });

	  // ───── start camera (FUERA del traverse)
	  smoothSwitchCamera(config.startCamera);
	});

}


// ─────────────────────────────
// GLASS ANIMATION
// ─────────────────────────────
const glassAnim = {
  state: 'waitGreen',
  timer: 0,

  duration: 1.5,
  waitGreen: 1.0,
  waitClear: 1.0
};


// ─────────────────────────────
// GLASS MAT (GLOBAL)
// ─────────────────────────────
const glassMaterials = [];
const originalGlassColors = [];



// ─────────────────────────────────────────────
// CAMERAS
// ─────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  80,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);

const cameraTargets = {};
let pendingFreeCamera = false;



// ─────────────────────────────────────────────
// ACTIVE CAMERA + TRANSITION STATE
// ─────────────────────────────────────────────

let transition = {
  active: false,
  startTime: 0,
  duration: 0.8,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromQuat: new THREE.Quaternion(),
  toQuat: new THREE.Quaternion()
};



// ─────────────────────────────────────────────
// RENDERER
// ─────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// ─────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false; 

controls.enableDamping = true;
controls.dampingFactor = 0.08;

controls.enableRotate = true;
controls.enableZoom = true;
controls.enablePan = false;

controls.minDistance = 0.2;
controls.maxDistance = 10;


// ─────────────────────────────────────────────
// LIGHTING
// ─────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ─────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────
const pmrem = new THREE.PMREMGenerator(renderer);

new RGBELoader().load('./studio.hdr', (hdr) => {
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  scene.environment = envMap;
  scene.environmentIntensity = 1.5;
  hdr.dispose();
});

function smoothSwitchCamera(name) {
  activeCameraName = name;

  const camData = cameraTargets[name];
  if (!camData) return;

  // ───── CAM_FREE (NO TRANSITION)
  if (name === 'Cam_Free') {

    transition.active = false;

    camera.position.copy(camData.position);
    controls.target.copy(camData.target);

    camera.lookAt(controls.target);
    camera.updateMatrixWorld();

    controls.update();
    controls.enabled = true;

    return;
  }

  // ───── CAMERA TRANSITION
  controls.enabled = false; 
  
  if (camData.fov !== undefined) {
    camera.fov = camData.fov;
    camera.updateProjectionMatrix();
  }


  transition.fromPos.copy(camera.position);
  transition.fromQuat.copy(camera.quaternion);

  transition.toPos.copy(camData.position);
  transition.toQuat.copy(camData.quaternion);

  transition.startTime = performance.now();
  transition.active = true;
}


// ─────────────────────────────────────────────
// RESIZE
// ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─────────────────────────────────────────────
// LOOP ANIMATE
// ─────────────────────────────────────────────
function animate(time) {
  requestAnimationFrame(animate);

  // ─────────────────────────────────────────
  // CAMERA TRANSITIONS (Still Cameras)
  // ─────────────────────────────────────────
  if (transition.active) {

    const elapsed = (time - transition.startTime) / 1000;
    const t = Math.min(elapsed / transition.duration, 1);
    const ease = t * t * (3 - 2 * t);

    camera.position.lerpVectors(
      transition.fromPos,
      transition.toPos,
      ease
    );

    if (activeCameraName !== 'Cam_Free') {
      camera.quaternion
        .copy(transition.fromQuat)
        .slerp(transition.toQuat, ease);
    }

    if (t >= 1) {
      transition.active = false;
    }
  }

  // ─────────────────────────────────────────
  // ORBIT CONTROLS (only Cam_Free)
  // ─────────────────────────────────────────
  if (controls.enabled) {
    controls.update();
  }

  // ─────────────────────────────────────────
  // GLASS ANIMATION (controlled by config)
  // ─────────────────────────────────────────
  const shouldAnimateGlass =
    glassAnimationEnabled &&
    glassMaterials.length > 0 &&
    activeCameraName === glassAnimateCamera;

  if (shouldAnimateGlass) {

    wasAnimatingGlass = true;

    const delta = clock.getDelta();
    glassAnim.timer += delta;

    glassMaterials.forEach((mat, i) => {

      const originalColor = originalGlassColors[i];

      switch (glassAnim.state) {

        case 'waitGreen':
          if (glassAnim.timer > glassAnim.waitGreen) {
            glassAnim.timer = 0;
            glassAnim.state = 'toClear';
          }
          break;

        case 'toClear': {
          const t = Math.min(glassAnim.timer / glassAnim.duration, 1);
          const ease = t * t * (3 - 2 * t);

          mat.color.lerpColors(
            originalColor,
            new THREE.Color(1, 1, 1),
            ease
          );

          if (t >= 1) {
            glassAnim.timer = 0;
            glassAnim.state = 'waitClear';
          }
          break;
        }

        case 'waitClear':
          if (glassAnim.timer > glassAnim.waitClear) {
            glassAnim.timer = 0;
            glassAnim.state = 'toGreen';
          }
          break;

        case 'toGreen': {
          const t = Math.min(glassAnim.timer / glassAnim.duration, 1);
          const ease = t * t * (3 - 2 * t);

          mat.color.lerpColors(
            new THREE.Color(1, 1, 1),
            originalColor,
            ease
          );

          if (t >= 1) {
            glassAnim.timer = 0;
            glassAnim.state = 'waitGreen';
          }
          break;
        }
      }
    });

  } else {

    // Reset ONLY when leave animate
    if (wasAnimatingGlass) {
      glassMaterials.forEach((mat, i) => {
        mat.color.copy(originalGlassColors[i]);
      });

      glassAnim.state = 'waitGreen';
      glassAnim.timer = 0;
      wasAnimatingGlass = false;
    }
  }

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  renderer.render(scene, camera);
}


// ─────────────────────────────────────────────
// CAMERA BUTTONS UI
// ─────────────────────────────────────────────
const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.bottom = '20px';
ui.style.left = '50%';
ui.style.transform = 'translateX(-50%)';
ui.style.display = 'flex';
ui.style.gap = '10px';
ui.style.zIndex = '10';

document.body.appendChild(ui);

const cameraButtons = [
  { label: 'Front', name: 'Cam_Front' },
  { label: 'Side', name: 'Cam_Side' },
  { label: 'Camera', name: 'Cam_Camera' },
  { label: 'Capture', name: 'Cam_Capture' },
  { label: 'Power', name: 'Cam_Power' },
  { label: 'Lenses', name: 'Cam_Lenses' },
  { label: 'Free', name: 'Cam_Free' }
];

cameraButtons.forEach(({ label, name }) => {
  const btn = document.createElement('button');
  btn.textContent = label;

  btn.style.padding = '8px 14px';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.style.background = '#111';
  btn.style.color = '#fff';
  btn.style.fontSize = '13px';

  btn.addEventListener('click', () => smoothSwitchCamera(name));
  ui.appendChild(btn);
});


loadModel(currentConfig);
animate();




















