import { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class TextureSamplerSnippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'texture_sampler_snippet');
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param _shaderCodeFormat 
     * @returns 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `sampler`;
        this.shaderCode.variableName = `texture_sampler_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `

@group(${groupIndex}) @binding(${bindingIndex}) var ${this.shaderCode.variableName}: ${this.shaderCode.structName};

        `;

        return this.shaderCode;
    }

}

export {
    TextureSamplerSnippet
}