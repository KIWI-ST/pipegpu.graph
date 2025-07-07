import { Vec3 } from "kiwi.matrix"

/**
 * 
 */
abstract class BaseCamera {
    /**
     * 
     */
    protected position: Vec3 = new Vec3().set(0.0, 0.0, 0.0);

    /**
     * 
     */
    constructor() {

    }

    protected abstract refresh(): void;

    /**
     * 
     * @returns 
     */
    public getPosition(): Vec3 {
        return this.position;
    }

    /**
     * 
     */
    public set Position(v: Vec3) {
        this.position.set(v.x, v.y, v.z);
        this.refresh();
    }
}

export {
    BaseCamera
}
