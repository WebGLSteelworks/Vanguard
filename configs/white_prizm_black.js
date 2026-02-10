export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/white_prizm_sapphire.glb',

  glass: {
	  color: [0.2, 0.2, 0.2],   
	  roughness: 0.3,
	  metalness: 0.1,
	  opacity: 0.97,

	  fresnel: {
		enabled: true,
		intensity: 0.15,           
		colorFront: [0.2, 0.2, 0.2],
		colorMid:   [0.1, 0.1, 0.1],
		colorEdge:  [0.0, 0.0, 0.0]
	  }
	},


  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
