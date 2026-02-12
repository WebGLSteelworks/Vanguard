export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/black_prizm_24k.glb',

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

  tras: {
	  enabled: true,

	  color: [1.0, 1.0, 1.0],     // tono cálido translúcido
	  roughness: 0.1,              // bajo → nitidez
	  transmission: 1.0,
	  thickness: 0.5,               // importante
	  ior: 1.1,                    // policarbonato real

	  attenuationColor: [1.0, 1.0, 1.0],
	  attenuationDistance: 5.5,

	  envMapIntensity: 2.7
	},

  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
