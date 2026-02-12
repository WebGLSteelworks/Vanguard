export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/white_prizm_black.glb',

  glass: {
	  color: [0.4, 0.4, 0.4],   
	  roughness: 0.1,
	  metalness: 0.5,
	  opacity: 0.90,

	  fresnel: {
		enabled: true,
		intensity: 3.7,           
		colorFront: [0.4, 0.4, 0.4],
		colorMid:   [0.2, 0.2, 0.2],
		colorEdge:  [0.0, 0.0, 0.0]
	  }
	},


  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
