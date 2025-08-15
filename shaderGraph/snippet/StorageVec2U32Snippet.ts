import type { Compiler, StorageBuffer } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class StorageVec2U32Snippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'storage_vec2_u32_snippet');
    }

    /**
     * 
     */
    getRuntimeBuffer = (): StorageBuffer => {
        return this.compiler.createStorageBuffer({
            totalByteLength: 2560 * 1440 * (4 + 4),
            rawData: []
        });
    }

    /**
     * 
     * @param _groupIndex 
     * @param _bindingIndex 
     * @param _shaderCodeFormat 
     * @returns 
     */
    override initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `vec2<u32>`;
        this.shaderCode.variableName = `storage_vec2_u32_arr_${this.snippetStatsID}`;

        switch (_shaderCodeFormat) {
            case 'computer':
                this.shaderCode.variableCode = `
@group(${_groupIndex}) @binding(${_bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;
                `;
                break;
            case 'renderer':
                this.shaderCode.variableCode = `
@group(${_groupIndex}) @binding(${_bindingIndex}) var<storage, read_write> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;
                `;
                break;
            default:
                throw new Error(`[E][StorageVec2U32Snippet][initShaderCode] invalid shader code format: ${_shaderCodeFormat}`)
        }

        return this.shaderCode;
    }

}

export {
    StorageVec2U32Snippet
}