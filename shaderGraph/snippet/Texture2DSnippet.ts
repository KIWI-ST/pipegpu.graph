import type { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class Texture2DSnippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'texture_2d_snippet');
    }

    getTexture = (width: number, height: number, mipmapCount: number, textureFormat: GPUTextureFormat) => {
        return this.compiler.createTexture2D({
            width: width,
            height: height,
            mipmapCount: mipmapCount,
            textureFormat: textureFormat
        });
    }

    override initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `texture_2d<f32>`;
        this.shaderCode.variableName = `texture_2d_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
@group(${_groupIndex}) @binding(${_bindingIndex}) var ${this.shaderCode.variableName}: ${this.shaderCode.structName};
        
        `;

        return this.shaderCode;
    }

}

export {
    Texture2DSnippet
}