export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/white_prizm_sapphire.glb',

  glass: {
	  color: [0.36, 0.58, 0.68],   
	  roughness: 0.3,
	  metalness: 0.1,
	  opacity: 0.97,

	  fresnel: {
		enabled: true,
		intensity: 3.3,           
		colorFront: [0.36, 0.58, 0.68],
		colorMid:   [0.1, 0.1, 0.65],
		colorEdge:  [0.3, 0.12, 0.45]
	  }
	},


  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
