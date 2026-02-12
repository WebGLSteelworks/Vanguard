export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/white_prizm_shapphire.glb',

  glass: {
	  color: [0.46, 0.68, 0.78],   
	  roughness: 0.1,
	  metalness: 0.5,
	  opacity: 0.90,

	  fresnel: {
		enabled: true,
		intensity: 2.3,           
		colorFront: [0.46, 0.68, 0.78],
		colorMid:   [0.23, 0.1, 0.95],
		colorEdge:  [0.43, 0.1, 0.45]
	  }
	},


  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
