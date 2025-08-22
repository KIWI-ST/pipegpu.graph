import type { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class IndexedIndirectSnippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'indexed_indirect_snippet');
    }

    initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `DRAW_INDEXED_INDIRECT`;
        this.shaderCode.structCode = `

struct ${this.shaderCode.structName}
{
    index_count: u32,
    instance_count: u32,
    first_index: u32,
    vertex_offset: u32,
    first_instance: u32,
};

        `
        this.shaderCode.variableName = `draw_indexed_indirect_arr_buffer_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read_write> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `

        return this.shaderCode;
    }

}

export {
    IndexedIndirectSnippet
}