import { Compiler } from 'pipegpu';
import { Vec4 } from 'pipegpu.matrix';
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
interface IMESHDESC {
    boundingSphere: Vec4,
    vertexOffset: number,
    meshId: number,
    meshletCount: number,
    materialId: number,
}

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
    override initShaderCode(groupIndex: number, bindingIndex: number, shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `MESH_DESC`;
        this.shaderCode.structCode = `
        
        struct ${this.shaderCode.structName}
        {
            bounding_sphere:vec4<f32>,
            vertex_offset: u32,
            mesh_id: u32,
            meshlet_count: u32,
	        material_id: u32,
        }

        `;
        this.shaderCode.variableName = `mesh_desc_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
        @group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `;

        return this.shaderCode;
    }
}

export {
    type IMESHDESC,
    MeshDescSnippet
}