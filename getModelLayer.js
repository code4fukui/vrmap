import { maplibregl } from "https://taisukef.github.io/maplibre-gl-js/maplibre-gl-es.js";

//import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
//import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js';
//THREE.GLTFLoader = GLTFLoader;

export const getModelLayer = (map, id, modelurl, lat, lng, alt, rotate, scale) => {
  const modelOrigin = [lng, lat];
  const modelAltitude = alt;
  //const modelRotate = [rotate, 0, 0];
  const modelRotate = [Math.PI / 2, rotate, 0];
  
  const gltfurl = modelurl;
  
  const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    modelOrigin,
    modelAltitude
  );
  //console.log(modelAsMercatorCoordinate)
  
  // transformation parameters to position, rotate and scale the 3D model onto the map
  //const scale = modelAsMercatorCoordinate.meterInMercatorCoordinateUnits(); // 3e-8
  const modelTransform = {
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
    /* Since our 3D model is in real world meters, a scale transform needs to be
    * applied since the CustomLayerInterface expects units in MercatorCoordinates.
    */
    scale,
  };

  //const THREE = window.THREE;
  
  // configuration of the custom layer for a 3D model per the CustomLayerInterface
  const customLayer = {
    id,
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map, gl) {
      this.camera = new THREE.Camera();
      this.scene = new THREE.Scene();
      
      // create two three.js lights to illuminate the model
      const directionalLight = new THREE.DirectionalLight(0xffffff);
      directionalLight.position.set(0, -70, 100).normalize();
      this.scene.add(directionalLight);
      
      const directionalLight2 = new THREE.DirectionalLight(0xffffff);
      directionalLight2.position.set(0, 70, 100).normalize();
      this.scene.add(directionalLight2);
      
      // use the three.js GLTF loader to add the 3D model to the three.js scene
      const loader = new THREE.GLTFLoader();
      //const loader = new GLTFLoader();
      loader.load(
        gltfurl,
        function (gltf) {
          this.scene.add(gltf.scene);
        }.bind(this)
      );
      this.map = map;
      
      // use the MapLibre GL JS map canvas for three.js
      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        //antialias: true,
      });
      this.renderer.gammaOutput = true; // old
      this.renderer.gammaFactor = 2.2; // old
      //this.render.outputEncoding = THREE.sRGBEncoding; // new
      this.renderer.autoClear = false;
    },
    render: function (gl, matrix) {
      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX
      );
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY
      );
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ
      );
      
      const m = new THREE.Matrix4().fromArray(matrix);
      const l = new THREE.Matrix4()
        .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ,
        )
        .scale(
          new THREE.Vector3(
            modelTransform.scale,
            -modelTransform.scale,
            modelTransform.scale,
          )
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);
      
      this.camera.projectionMatrix = m.multiply(l);
      this.renderer.state.reset();
      this.renderer.render(this.scene, this.camera);
      this.map.triggerRepaint();
    }
  };
  return customLayer;
};
