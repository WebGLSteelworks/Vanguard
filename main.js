import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/RGBELoader.js/+esm';

import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/EffectComposer.js/+esm';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/RenderPass.js/+esm';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/ShaderPass.js/+esm';

import { MODEL_CONFIG as BLACK_PRIZM_ROAD } from './configs/black_prizm_road.js';
import { MODEL_CONFIG as WHITE_PRIZM_SAPPHIRE } from './configs/white_prizm_sapphire.js';
import { MODEL_CONFIG as BLACK_PRIZM_24K } from './configs/black_prizm_24k.js';
import { MODEL_CONFIG as WHITE_PRIZM_BLACK } from './configs/white_prizm_black.js';


// ─────────────────────────────────────────────
// VAR
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2); 

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
makeModelButton('White Prizm Sapphire', WHITE_PRIZM_SAPPHIRE);
makeModelButton('Black Prizm 24k', BLACK_PRIZM_24K);
makeModelButton('White Prizm Black', WHITE_PRIZM_BLACK);

// ─────────────────────────────
// POSTPRODUCTION FOR MORE CONTRAST
// ─────────────────────────────

const ContrastShader = {
  uniforms: {
    tDiffuse: { value: null },
    contrast: { value: 1.0 } // 1.0 = neutro
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;
      gl_FragColor = color;
    }
  `
};


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

	loader.load(config.glb + '?v=' + Date.now(), (gltf) => {
	//loader.load(config.glb, (gltf) => {

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
			
			const g = config.glass;

			const mat = new THREE.MeshPhysicalMaterial({
			  color: new THREE.Color(...g.color),
			  roughness: g.roughness,
			  metalness: g.metalness ?? 0.0,

			  transparent: true,
			  opacity: g.opacity,

			  transmission: 0.0,
			  ior: 1.45,
			  depthWrite: false,
			  depthTest: true,

			  envMapIntensity: 1.3
			});

			
			mat.specularIntensity = 1.0;
			mat.specularColor = new THREE.Color(1.0, 1.0, 1.0);



		  // ───── OPACITY GRADIENT
		  if (config.glass.opacityMap) {
			const alphaTex = textureLoader.load(config.glass.opacityMap);
			alphaTex.flipY = false;
			alphaTex.colorSpace = THREE.NoColorSpace;

		  }
  

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
			  0.99
			);

			vec3 coatingColor = mix(
			  colorFront,
			  mix(colorMid, colorEdge, smoothstep(0.1, 1.0, f)),
			  smoothstep(0.0, 0.3, f)
			);

			// saturación fuerte
			coatingColor = pow(coatingColor, vec3(1.6));

			reflectedLight.indirectSpecular.rgb +=
			  coatingColor * f * fresnelIntensity;

			`
		  );
		};

		  mat.needsUpdate = true;

		  glassMaterials.push(mat);
		  originalGlassColors.push(mat.color.clone());
		  obj.material = mat;
		}
		}

		// ───── TRANSLUCENT (TRAS)
		if (
		  obj.isMesh &&
		  obj.material?.name?.toLowerCase().includes('tres') &&
		  config.tras
		) {

		  const t = config.tras;
		  const original = obj.material;

		  const mat = new THREE.MeshPhysicalMaterial({

			// 🔹 mantener texturas originales
			map: original.map || null,
			normalMap: original.normalMap || null,
			roughnessMap: original.roughnessMap || null,
			metalnessMap: original.metalnessMap || null,
			aoMap: original.aoMap || null,
			emissiveMap: original.emissiveMap || null,

			// 🔹 mantener color base si existe
			color: original.color ? original.color.clone() : new THREE.Color(...t.color),

			metalness: 0.0,
			roughness: t.roughness,
			transmission: t.transmission,
			thickness: t.thickness,
			ior: t.ior,

			transparent: true,
			opacity: 1.0,

			envMapIntensity: t.envMapIntensity ?? 1.0,

			attenuationColor: new THREE.Color(...t.attenuationColor),
			attenuationDistance: t.attenuationDistance
		  });

		  obj.material = mat;
		}





		if (!obj.isMesh || !obj.material) return;

		  // 🟢 LOGO CUTOUT
		  if (obj.material.name.toLowerCase().includes('logo')) {

			const mat = obj.material;

			mat.transparent = false;
			mat.alphaTest = 0.5;
			mat.depthWrite = true;
			mat.side = THREE.FrontSide;

			mat.needsUpdate = true;
		  }
	  });

	  // ───── start camera (FUERA del traverse)
	  smoothSwitchCamera(config.startCamera);
	});

}


// ─────────────────────────────
// GLASS (GLOBAL)
// ─────────────────────────────
const glassAnim = {
  state: 'waitGreen',
  timer: 0,

  duration: 1.5,
  waitGreen: 1.0,
  waitClear: 1.0
};
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

renderer.useLegacyLights = false;
renderer.transmissionResolutionScale = 1.0;

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// ─────────────────────────────
// COMPOSER ANTIALIASING
// ─────────────────────────────

const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    samples: 4 
  }
);

const composer = new EffectComposer(renderer, renderTarget);

composer.addPass(new RenderPass(scene, camera));

const contrastPass = new ShaderPass(ContrastShader);
contrastPass.uniforms.contrast.value = 1.0;
composer.addPass(contrastPass);


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

controls.minDistance = 0.5;
controls.maxDistance = 2.0;


// ─────────────────────────────────────────────
// LIGHTING
// ─────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 2.0));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.0);
dirLight.position.set(0, 0, 0);
scene.add(dirLight);

// ─────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────
const pmrem = new THREE.PMREMGenerator(renderer);

new RGBELoader().load('./studio.hdr', (hdr) => {

  // 🔹 Creamos una escena temporal para procesar el HDR
  const tempScene = new THREE.Scene();

  const saturation = 0.0; // 0 = gris total | 1 = original

  const material = new THREE.ShaderMaterial({
    uniforms: {
      tMap: { value: hdr },
      saturation: { value: saturation }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tMap;
      uniform float saturation;
      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(tMap, vUv);

        float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 grey = vec3(luminance);

        color.rgb = mix(grey, color.rgb, saturation);

        gl_FragColor = color;
      }
    `,
    side: THREE.DoubleSide
  });

  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    material
  );

  tempScene.add(quad);

  const renderTarget = new THREE.WebGLRenderTarget(
    hdr.image.width,
    hdr.image.height
  );

  renderer.setRenderTarget(renderTarget);
  renderer.render(tempScene, new THREE.Camera());
  renderer.setRenderTarget(null);

  const processedEnvMap = pmrem.fromEquirectangular(renderTarget.texture).texture;

  scene.environment = processedEnvMap;
  scene.environmentRotation = new THREE.Euler(0, Math.PI * 1.35, 0);
  scene.environmentIntensity = 1.5;

  hdr.dispose();
  renderTarget.dispose();
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
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
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
  
  composer.render();
  //renderer.render(scene, camera);




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




















