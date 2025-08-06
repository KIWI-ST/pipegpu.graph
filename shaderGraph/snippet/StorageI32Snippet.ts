import type { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class StorageI32Snippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'storage_i32_snippet');
    }

    override initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `i32`;
        this.shaderCode.variableName = `storage_i32_arr_${this.snippetStatsID}`;
        switch (_shaderCodeFormat) {
            case 'renderer':
                this.shaderCode.variableCode = `
@group(${_groupIndex}) @binding(${_bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;
                `;
                break;
            case 'computer':
                this.shaderCode.variableCode = `
@group(${_groupIndex}) @binding(${_bindingIndex}) var<storage, read_write> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;
                `;
                break;
            default:
                throw new Error(`[E][StorageI32Snippet][initShaderCode] unsupported shader code format: ${_shaderCodeFormat}`);
        }

        return this.shaderCode;
    }

}

export {
    StorageI32Snippet
}