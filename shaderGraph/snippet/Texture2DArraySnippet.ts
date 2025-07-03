import { Compiler } from "pipegpu";
import { BaseSnippet, IShaderCode, ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class Texture2DArraySnippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'texture_2d_array_snippet');
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param shaderCodeFormat 
     * @returns 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, shaderCodeFormat: ShaderCodeFormat): IShaderCode {

        this.shaderCode.structName = `texture_2d_array<f32>`;
        this.shaderCode.variableName = `texture_2d_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
        @group(${groupIndex}) @binding(${bindingIndex}) var ${this.shaderCode.variableName}: ${this.shaderCode.structName};

        `;

        return this.shaderCode;
    }
}

export {
    Texture2DArraySnippet
}