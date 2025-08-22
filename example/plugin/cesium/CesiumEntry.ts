import * as Cesium from 'cesium'

let SCENE_CAMERA: Cesium.Camera;

const cesiumEntry = async () => {
    // 114.305392, 30.593098, 3000, wuhan
    // const lnglat = Cesium.Cartesian3.fromDegrees(114.305392, 30.593098, 3000);
    // Cesium.Cartesian3.fromDegrees(116.3955392, 39.916, 200);
    const lnglat = Cesium.Cartesian3.fromDegrees(116.3975392, 39.916, 100);
    Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzZWUzZWU5NC0wNjE4LTQ1Y2EtOGIxYS1kMWM5ZjhkYzE1M2EiLCJpZCI6NjI3OTIsImlhdCI6MTc0NDkzODc4NH0.W_zorWz5pbtH4ZLYql9ZWLgtp0hfIAPPZdF6IDAPzak";
    var viewer = new Cesium.Viewer("CesiumContainer", {
        infoBox: false,
        shouldAnimate: true,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        scene3DOnly: true,
        // globe: new Cesium.Globe(new Cesium.Ellipsoid(6378137, 6378137, 6378137)),
        // mapProjection: new Cesium.WebMercatorProjection(),
        contextOptions: {
            requestWebgl1: false,
            allowTextureFilterAnisotropic: true,
            webgl: {
                alpha: false,
                depth: true,
                stencil: false,
                antialias: true,
                powerPreference: "high-performance",
                premultipliedAlpha: true,
                preserveDrawingBuffer: false,
                failIfMajorPerformanceCaveat: false,
            },
        },
    });
    viewer.canvas.width = 400 * devicePixelRatio;
    viewer.canvas.height = 400 * devicePixelRatio;
    viewer.canvas.style.width = `400px`;
    viewer.canvas.style.height = `400px`;

    // const r = viewer.scene.ellipsoid.cartographicToCartesian(new Cesium.Cartographic(
    //     Cesium.Math.toRadians(114.2978538661029179491913330511),
    //     Cesium.Math.toRadians(30.77193874122344863588183053804),
    //     0
    // ));

    // console.log(r);



    SCENE_CAMERA = viewer.scene.camera;
    SCENE_CAMERA.setView({ destination: lnglat });

    const imgLayer = new Cesium.UrlTemplateImageryProvider({
        url:
          "https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
        minimumLevel: 3,
        maximumLevel: 18,
      });
      viewer.imageryLayers.addImageryProvider(imgLayer);




    const context = (viewer.scene as any).context;


  
    let primitive  , postProcess;

    let canvas = document.getElementById("GeoSketchpadConainter")  as HTMLCanvasElement;
    let texture =new (Cesium as any).Texture({
        context: context,
        source: canvas,
    });
   

      const instance = new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: Cesium.Rectangle.fromDegrees(115.20, 39.28,117.30, 41.05),
        }),
      });

      primitive = viewer.scene.primitives.add(
        new Cesium.Primitive({
          geometryInstances: instance,
          appearance: new Cesium.MaterialAppearance({
            material: new Cesium.Material({
              fabric: {
                type: "Image",
                uniforms: {
               // image: "http://10.11.11.32:1121/Examples/fluidCustomwame/view.png",
                   image:canvas
                },
              },
            }),
          }),
        })
      );

    

    

const fragmentShaderSource = `
  uniform sampler2D colorTexture; 
  uniform sampler2D depthTexture; 
  uniform sampler2D textureWebgpuColor; 
  in vec2 v_textureCoordinates; 

  void main(void) 
  { 
      vec4 webgpuColor = texture(textureWebgpuColor, v_textureCoordinates);
      vec4 cesiumColor = texture(colorTexture, v_textureCoordinates);
      
      out_FragColor =  webgpuColor + cesiumColor  ; 

      }
  `;

  postProcess = viewer.scene.postProcessStages.add(
  new Cesium.PostProcessStage({
    fragmentShader: fragmentShaderSource,
    uniforms:{
        textureWebgpuColor : texture,  
    }
  })
);
let  flag = false
viewer.camera.changed.addEventListener(function() {
   // flag = true
    postProcess.uniforms.textureWebgpuColor = canvas.toDataURL("image/png")
});


//postRender   postUpdate  preRender 

// viewer.scene.preUpdate.addEventListener(function () {
    
   // (document.getElementById("imgId") as HTMLImageElement).src = canvas.toDataURL("image/png");
    
   // primitive.appearance.material.uniforms.image = canvas.toDataURL("image/png")
    // postProcess.uniforms.textureWebgpuColor = canvas.toDataURL("image/png")
  //  postProcess.uniforms.textureWebgpuColor = "http://10.11.11.32:1121/Examples/fluidCustomwame/view.png"
 
  // if (texture && !texture.isDestroyed()) {
  //   texture.destroy();
  // }

  // if(flag){

  //     texture= new (Cesium as any).Texture({
  //         context: context,
  //         source: canvas,
  //     });
  //     postProcess.uniforms.textureWebgpuColor = texture
  // }

  //});

  

}

export {
    cesiumEntry,
    SCENE_CAMERA
}