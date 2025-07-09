import { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class StorageIndexSnippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'storage_index_snippet');
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param shaderCodeFormat 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = "u32";
        this.shaderCode.variableName = `storage_index_buffer_${this.snippetStatsID}`;
        if ('computer' === shaderCodeFormat) {
            this.shaderCode.variableCode = `

            @group(${groupIndex}) @binding(${bindingIndex}) var<storage, read_write> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

            `;
        } else if ('renderer' == shaderCodeFormat) {
            this.shaderCode.variableCode = `

            @group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

            `;
        } else {
            throw new Error(`[E][StorageIndexSnippet][initShaderCode]`);
        }
        return this.shaderCode;
    }
}

export {
    StorageIndexSnippet
}