import { Compiler } from 'pipegpu';
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class MeshDescSnippet extends BaseSnippet {
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
        this.shaderCode.structName = `MESH_DESC`;
        this.shaderCode.structCode = `
        
struct ${this.shaderCode.structName}
{
    ounding_sphere:vec4<f32>,
    vertex_offset: u32,
    mesh_id: u32,
    meshlet_count: u32,
    material_id: u32,
};

        `;
        this.shaderCode.variableName = `mesh_desc_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `;

        return this.shaderCode;
    }
}

export {
    MeshDescSnippet
}