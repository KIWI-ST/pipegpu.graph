import type { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class StorageAtomicU32Snippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'storage_atomic_u32_snippet');
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param _shaderCodeFormat 
     * @returns 
     */
    initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `atomic<u32>`;
        this.shaderCode.variableName = `storage_u32_atmoic_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read_write> ${this.shaderCode.variableName}: ${this.shaderCode.structName};

        `

        return this.shaderCode;
    }

}

export {
    StorageAtomicU32Snippet
}