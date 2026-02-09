export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/black_prizm_road.glb',

  glass: {
	  color: [0.3, 0.12, 0.45],   
	  roughness: 1.0,
	  metalness: 1.5,
	  opacity: 0.97,

	  fresnel: {
		enabled: true,
		intensity: 0.3,           
		colorFront: [0.6, 0.25, 0.9],
		colorMid:   [1.0, 0.1, 0.3],
		colorEdge:  [1.0, 0.9, 0.2]
	  }
	},


  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
