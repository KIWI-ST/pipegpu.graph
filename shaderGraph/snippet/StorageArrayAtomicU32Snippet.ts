import type { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class StorageArrayAtomicU32Snippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'storage_array_atomic_u32_snippet')
    }

    override initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = 'atomic<u32>';
        this.shaderCode.variableName = `storage_array_atomic_u32_buffer_${this.snippetStatsID}`;
        switch (_shaderCodeFormat) {
            case 'renderer':
                {
                    this.shaderCode.variableCode = `

@group(${_groupIndex}) @binding(${_bindingIndex}) var<storage, read > ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `;
                    break;
                }
            case 'computer':
                {
                    this.shaderCode.variableCode = `

@group(${_groupIndex}) @binding(${_bindingIndex}) var<storage, read_write > ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `;
                    break;
                }
            default:
                throw new Error(`[E][StorageArrayAtomicU32Snippet][initShaderCode] unsupported shader code format: ${_shaderCodeFormat}`)
        }

        return this.shaderCode;
    }

}

export {
    StorageArrayAtomicU32Snippet
}