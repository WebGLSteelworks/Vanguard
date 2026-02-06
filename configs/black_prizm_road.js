export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/black_prizm_road.glb',

  glass: {
	  color: [0.18, 0.12, 0.22],
	  roughness: 0.08,
	  metalness: 0.0,
	  opacity: 0.55,

	  fresnel: {
		enabled: true,
		intensity: 1.5,
		colorFront: [0.55, 0.25, 0.8],
		colorMid:   [0.85, 0.15, 0.25],
		colorEdge:  [1.0, 0.85, 0.2]
	  }
	},


  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
