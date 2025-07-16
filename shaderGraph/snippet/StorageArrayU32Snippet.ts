import { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";
import type { Handle2D } from "pipegpu/src/res/buffer/BaseBuffer";

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

    getBuffer = (handler: Handle2D, totalByteLength: number) => {
        return this.compiler.createStorageBuffer({
            totalByteLength: totalByteLength,
            handler: handler
        });
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
            
@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;
            
            `;
        } else if ('computer' === shaderCodeFormat) {
            this.shaderCode.variableCode = `
            
@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read_write> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;
            
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