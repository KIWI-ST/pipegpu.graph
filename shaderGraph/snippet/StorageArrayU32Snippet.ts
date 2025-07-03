import { Compiler } from "pipegpu";
import { BaseSnippet, IShaderCode, ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class StorageArrayU32Snippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'storage_array_u32_snippet')
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param shaderCodeFormat 
     * @returns 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `u32`;
        this.shaderCode.variableName = `storage_arr_u32_${this.snippetStatsID}`;
        if ('renderer' === shaderCodeFormat) {
            this.shaderCode.variableCode = `
            
            @group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableCode}: array<${this.shaderCode.structName}>;
            
            `;
        } else if ('computer' === shaderCodeFormat) {
            this.shaderCode.variableCode = `
            
            @group(${groupIndex}) @binding(${bindingIndex}) var<storage, read_write> ${this.shaderCode.variableCode}: array<${this.shaderCode.structName}>;
            
            `;
        } else {
            throw new Error(`[E][StorageArrayU32Snippet] unsupport shader type, only support renderer or computer shader.`);
        }

        return this.shaderCode;
    }

}

export {
    StorageArrayU32Snippet
}