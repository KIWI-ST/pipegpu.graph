import { GLMatrix, Mat4, Vec3 } from "kiwi.matrix";
import { BaseCamera } from "./BaseCamera";

/**
 * 
 * force right hand coordinate system
 * 
 */
class PerspectiveCamera extends BaseCamera {

    /**
     * 
     */
    private viewportWidth: number;

    /**
     * 
     */
    private viewportHeight: number;

    /**
     * 
     */
    private near: number;

    /**
     * 
     */
    private far: number;

    /**
     * 
     */
    private aspect: number;

    /**
     * aspect in radians
     */
    private fov: number;

    /**
     * 
     */
    private lookAtMat!: Mat4;

    /**
     * the invert of lookAtMat
     */
    private viewMat!: Mat4;

    /**
     * 
     */
    private viewPorjectionMat!: Mat4;

    /**
     * 
     */
    private projectionMat!: Mat4;

    /**
     * 
     */
    private target!: Vec3;

    /**
     * 
     */
    private up: Vec3 = new Vec3().set(0.0, 0.0, 1.0);

    /**
     * 
     * @param fovy fovy view aspect in degree, e.g 60°.
     * @param viewportWidth viewport pixel width, e.g 800px.
     * @param viewportHeight viewport pixel height, e.g 600px.
     * @param near near plane, e.g 0.1m
     * @param far far plane, e.g 100000m
     * 
     */
    constructor(
        fovy: number,
        viewportWidth: number,
        viewportHeight: number,
        near: number,
        far: number
    ) {
        super();
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.near = near;
        this.far = far;
        this.aspect = viewportWidth / viewportHeight;
        this.fov = GLMatrix.toRadian(fovy);
    }

    protected refresh(): void {
        this.projectionMat = Mat4.perspective(this.fov, this.aspect, this.near, this.far);
        this.lookAtMat = new Mat4().lookAt(this.position, this.target, this.up);
        this.viewMat = this.lookAtMat.clone().invert();
        this.viewPorjectionMat = this.projectionMat.clone().multiply(this.viewMat);
    }

    public getViewportWidth(): number {
        return this.viewportWidth;
    }

    public getViewportHeight(): number {
        return this.viewportHeight;
    }

}

export {
    PerspectiveCamera
}