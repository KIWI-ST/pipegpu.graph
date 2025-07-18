import { Compiler } from 'pipegpu';
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class MeshletDescSnippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'mesh_desc_snippet');
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param shaderCodeFormat 
     * @returns 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `MESHLET_DESC`;
        this.shaderCode.structCode = `
        
struct ${this.shaderCode.structName}
{
    self_bounding_sphere: vec4<f32>,
    parent_bounding_sphere: vec3<f32>,
    self_error: f32,
    parent_error: f32,
    cluster_id: u32,
    mesh_id: u32,
    index_count: u32,
    index_offset: u32,
};

        `;
        this.shaderCode.variableName = `mesh_let_desc_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `;

        return this.shaderCode;
    }
}

export {
    MeshletDescSnippet
}