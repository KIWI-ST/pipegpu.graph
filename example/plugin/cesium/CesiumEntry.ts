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



    // 方法一：断言 scene 为 any 类型
    const context = (viewer.scene as any).context;

    // 使用类型断言创建纹理
  
    let primitive  , postProcess;

    let canvas = document.getElementById("GeoSketchpadConainter")  as HTMLCanvasElement;
    //   viewer.scene.preUpdate.addEventListener(function () {
    //     primitive.appearance.material.uniforms.image = canvas
    //   });

 
      let targetCanvas  = document.getElementById("myCanvas") as HTMLCanvasElement;
      let targetCtx = targetCanvas.getContext('2d'); // 获取 2D 上下文
        if (targetCtx ) {
            var grad = targetCtx.createRadialGradient(200, 200, 50, 260, 260, 200) // 创建一个渐变色径向/圆对象
            grad.addColorStop(0, "rgba(240,250,40,1)"); // 设置渐变颜色
            grad.addColorStop(0.25, "rgba(327,201,64,1)");
            grad.addColorStop(0.5, "rgba(22,184,200,1)");
            grad.addColorStop(1, "rgba(82,67,192,1)");
            targetCtx.fillStyle = grad; // 设置fillStyle为当前的渐变对象
            targetCtx.fillRect(0, 0, 500, 500); // 绘制渐变图形
      }
      

       // 复制函数
    function copyCanvas() {
        let targetCanvas2  = document.getElementById("myCanvas2") as HTMLCanvasElement;
        let targetCtx2 = targetCanvas2.getContext('2d'); // 获取 2D 上下文
        if(targetCtx2){
           
            // targetCtx2.clearRect(0, 0, targetCanvas.width, targetCanvas.height);                  
            // targetCtx2.drawImage(
            //     targetCanvas, 0, 0, 
            //     targetCanvas.width, targetCanvas.height,
            //     0, 0, 
            //     targetCanvas.width, targetCanvas.height
            // );

            targetCtx2.clearRect(0, 0, canvas.width, canvas.height);                  
            targetCtx2.drawImage(
                canvas, 0, 0, 
                canvas.width, canvas.height,
                0, 0, 
                canvas.width, canvas.height
            );
        }
      }
  
    
 


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

    
      const texture = new (Cesium as any).Texture({
        context: context,
        source: canvas,
    });

const fragmentShaderSource = `
  uniform sampler2D colorTexture; 
  uniform sampler2D depthTexture; 
  uniform sampler2D textureWebgpuColor; 
  in vec2 v_textureCoordinates; 
 
  void main(void) 
  { 
      vec4 webgpuColor = texture(textureWebgpuColor, v_textureCoordinates);
      out_FragColor = texture(colorTexture, v_textureCoordinates) + webgpuColor ; 

      }
  `;
  postProcess = viewer.scene.postProcessStages.add(
  new Cesium.PostProcessStage({
    fragmentShader: fragmentShaderSource,
    uniforms:{
        textureWebgpuColor : "http://10.11.11.32:1121/Examples/fluidCustomwame/view.png"
    }
  })
);


viewer.scene.postUpdate.addEventListener(function () {
    
    //copyCanvas()
 
    (document.getElementById("imgId") as HTMLImageElement).src = canvas.toDataURL("image/png");
    

    primitive.appearance.material.uniforms.image = canvas.toDataURL("image/png")

    postProcess.uniforms.textureWebgpuColor = canvas.toDataURL("image/png")
  });



}

export {
    cesiumEntry,
    SCENE_CAMERA
}