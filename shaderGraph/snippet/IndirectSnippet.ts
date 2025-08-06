import type { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

class IndirectSnippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'indirect_snippet');
    }

    override initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `DRAW_INDIRECT`;
        this.shaderCode.structCode = `

struct ${this.shaderCode.structName}
{
    vertex_count: u32,
    instance_count: u32,
    first_vertex: u32,
    first_instance: u32,
};

        `
        this.shaderCode.variableName = `draw_indirect_arr_buffer_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
@group(${_groupIndex}) @binding(${_bindingIndex}) var<storage, read_write> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `

        return this.shaderCode;
    }

}


export {
    IndirectSnippet
}