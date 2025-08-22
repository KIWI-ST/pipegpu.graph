import type { Compiler } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * ref:
 * https://github.com/KIWI-ST/rci/blob/master/gems/shader_graph/snippet/view_plane_snippet.cc
 */
class ViewPlaneSnippet extends BaseSnippet {


    constructor(compiler: Compiler) {
        super(compiler, 'view_plane_snippet');
    }

    override initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `vec4<f32>`;
        this.shaderCode.variableName = `view_plane_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `

@group(${_groupIndex}) @binding(${_bindingIndex}) var<uniform> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}, 6>;

        `;

        return this.shaderCode;
    }

}

export {
    ViewPlaneSnippet
}