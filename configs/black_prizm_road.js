export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/black_prizm.glb',

  glass: {
	  color: [0.43, 0.1, 0.45],   
	  roughness: 0.2,
	  metalness: 0.5,
	  opacity: 0.90,

	  fresnel: {
		enabled: true,
		intensity: 1.7,           
		colorFront: [0.46, 0.20, 0.54],
		colorMid:   [1, 0.1, 0.1],
		colorEdge:  [1.0, 0.9, 0.2]
	  }
	},


  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
