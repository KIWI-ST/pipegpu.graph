import { Compiler, UniformBuffer } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";
import { type Handle1D } from "pipegpu/src/res/buffer/BaseBuffer";

/**
 * 
 */
interface IVIEW {
    cameraPositionX: number,
    cameraPositionY: number,
    cameraPositionZ: number,
    cameraVerticalScalingFactor: number,
    viewportWidth: number,
    viewportHeight: number,
    nearPlane: number,
    farPlane: number,
    pixelThreshold: number,
    softwareRasterizerThreshold: number
}

/**
 * 
 */
class ViewSnippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'view_snippet');
    }

    /**
     * 
     * @param handler 
     * @returns 
     */
    public getBuffer(handler: Handle1D): UniformBuffer {
        // const view: IVIEW = {
        //     cameraPositionX: 0,
        //     cameraPositionY: 0,
        //     cameraPositionZ: 0,
        //     cameraVerticalScalingFactor: 0,
        //     viewportWidth: 0,
        //     viewportHeight: 0,
        //     nearPlane: 0,
        //     farPlane: 0,
        //     pixelThreshold: 0,
        //     softwareRasterizerThreshold: 0
        // };
        // const viewData: Float32Array = new Float32Array([
        //     view.cameraPositionX, view.cameraPositionY, view.cameraPositionZ, view.cameraVerticalScalingFactor,
        //     view.viewportWidth, view.viewportHeight,
        //     view.nearPlane, view.farPlane,
        //     view.pixelThreshold, view.softwareRasterizerThreshold
        // ]);
        const buffer = this.compiler.createUniformBuffer({
            totalByteLength: 10 * 4,
            handler: handler
        });
        return buffer;
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param shaderCodeFormat 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `VIEW`;
        this.shaderCode.structCode = `
        
struct ${this.shaderCode.structName}
{
    camera_position_x: f32,
    camera_position_y: f32,
    camera_position_z: f32,
    camera_vertical_scaling_factor: f32,
    viewport_width: f32,
    viewport_height: f32,
    near_plane: f32,
    far_plane: f32,
    pixel_threshold: f32,
    software_rasterizer_threshold: f32
};
        
        `;
        this.shaderCode.variableName = `view_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `

@group(${groupIndex}) @binding(${bindingIndex}) var<uniform> ${this.shaderCode.variableName}: ${this.shaderCode.structName};

        `;

        return this.shaderCode;
    }

}

export {
    type IVIEW,
    ViewSnippet
}