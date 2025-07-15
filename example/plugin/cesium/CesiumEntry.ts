import * as Cesium from 'cesium'

let SCENE_CAMERA: Cesium.Camera;

const cesiumEntry = async () => {
    // 114.305392, 30.593098, 3000, wuhan
    const lnglat = Cesium.Cartesian3.fromDegrees(114.305392, 30.593098, 3000);
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

    SCENE_CAMERA = viewer.scene.camera;
    SCENE_CAMERA.setView({ destination: lnglat });
    SCENE_CAMERA.changed.addEventListener(() => {

        const sseDenominator = (SCENE_CAMERA as any).frustum.sseDenominator;
        // console.log(SCENE_CAMERA);
        console.log(sseDenominator);
    });
}

export {
    cesiumEntry,
    SCENE_CAMERA
}