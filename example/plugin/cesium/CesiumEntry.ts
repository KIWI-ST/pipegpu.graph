import * as Cesium from 'cesium'

let SCENE_CAMERA: Cesium.Camera;

const cesiumEntry = async () => {
    // 114.305392, 30.593098, 3000, wuhan
    // const lnglat = Cesium.Cartesian3.fromDegrees(114.305392, 30.593098, 3000);
    // Cesium.Cartesian3.fromDegrees(116.3955392, 39.916, 200);
    const lnglat = Cesium.Cartesian3.fromDegrees(116.3955392, 39.916, 200);
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

    const r = viewer.scene.ellipsoid.cartographicToCartesian(new Cesium.Cartographic(
        Cesium.Math.toRadians(114.2978538661029179491913330511),
        Cesium.Math.toRadians(30.77193874122344863588183053804),
        0
    ));

    console.log(r);

    SCENE_CAMERA = viewer.scene.camera;
    SCENE_CAMERA.setView({ destination: lnglat });
}

export {
    cesiumEntry,
    SCENE_CAMERA
}