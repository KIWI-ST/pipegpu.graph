
import * as Cesium from 'cesium'

class NanoQuadTree {

    private camera!: Cesium.Camera

    constructor(camera: Cesium.Camera) {
        this.camera = camera;
    }

}

export {
    NanoQuadTree
}