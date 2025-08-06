import type { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class TextureStorage2DR32FSnippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'texture_storage_2d_snippet');
    }

    override initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.requireExtentCode = "requires readonly_and_readwrite_storage_textures;";
        this.shaderCode.structName = `texture_storage_2d`;
        this.shaderCode.variableName = `texture_storage_2d_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
@group(${_groupIndex}) @binding(${_bindingIndex}) var ${this.shaderCode.variableName}: ${this.shaderCode.structName}<r32float, read_write >;
        `;

        return this.shaderCode;
    }

}

export {
    TextureStorage2DR32FSnippet
}