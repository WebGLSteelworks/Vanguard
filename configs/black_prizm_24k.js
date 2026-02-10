export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/black_prizm_road.glb',

  glass: {
	  color: [0.85, 0.55, 0.30],   
	  roughness: 0.3,
	  metalness: 0.1,
	  opacity: 0.97,

	  fresnel: {
		enabled: true,
		intensity: 0.15,           
		colorFront: [0.85, 0.55, 0.30],
		colorMid:   [0.85, 0.55, 0.30],
		colorEdge:  [0.5, 0.9, 0.2]
	  }
	},


  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
