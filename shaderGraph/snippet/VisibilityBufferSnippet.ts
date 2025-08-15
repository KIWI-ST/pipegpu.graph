import type { Compiler, Texture2D } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class VisibilityBufferSnippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'visibility_buffer_snippet')
    }

    /**
     * 
     * @param width 
     * @param height 
     * @returns 
     */
    getVisbilityTexture = (width: number, height: number): Texture2D => {
        return this.compiler.createTexture2D({
            width: width,
            height: height,
            textureFormat: 'r32uint',
            mipmapCount: 1,
            appendixTextureUsages: GPUTextureUsage.STORAGE_BINDING
        });
    }

    /**
     * 
     */
    getVisibilityColorAttachment = (visbilityTexture: Texture2D) => {
        return this.compiler.createColorAttachment({
            texture: visbilityTexture,
            blendFormat: 'opaque',
            colorLoadStoreFormat: 'clearStore',
            clearColor: [0.0, 0.0, 0.0, 1.0]
        });
    }


    override initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        // r32uint
        // visibility buffer, use rg32uint format, https://www.w3.org/TR/WGSL/'
        // old r -> depth (32bit)
        // new r-> runtime cluster id (25) + triangle id (7)
        this.shaderCode.requireExtentCode = `requires readonly_and_readwrite_storage_textures;`;
        this.shaderCode.structName = `texture_storage_2d`;
        this.shaderCode.variableName = `visibility_buffer_texture_2d_${this.snippetStatsID}`;

        this.shaderCode.variableCode = `
@group(${_groupIndex}) @binding(${_bindingIndex}) var ${this.shaderCode.variableName}: ${this.shaderCode.structName}<r32uint, read_write>;
        `;

        return this.shaderCode;
    }

}

export {
    VisibilityBufferSnippet
}