export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/black_prizm.glb',

  glass: {
	  color: [0.94, 0.72, 0.30],   
	  roughness: 0.2,
	  metalness: 0.5,
	  opacity: 0.90,

	  fresnel: {
		enabled: true,
		intensity: 0.3,           
		colorFront: [0.60, 0.50, 0.30],
		colorMid:   [0.60, 0.50, 0.30],
		colorEdge:  [0.5, 0.9, 0.2]
	  }
	},


  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
