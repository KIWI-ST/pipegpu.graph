import { Compiler, StorageBuffer, TypedArray2DFormat } from "pipegpu";
import { BaseSnippet, IShaderCode, ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
interface IMATERIAL_PHONG_DESC {
    materialId: number,
    ambientTextureId: number,
    diffuseTextureId: number,
    specularTextureId: number,
    shininessTextureId: number,
    emissiveTextureId: number,
}

/**
 * 
 */
class MaterialPhongDescSnippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'material_phone_desc_snippet');
    }

    /**
     * 
     * @param rawData 
     * @returns 
     */
    public getBuffer(rawData: TypedArray2DFormat): StorageBuffer {
        return this.compiler.createStorageBuffer({ rawData: rawData });
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param shaderCodeFormat 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `MATERIAL_PHONG_DESC`;
        this.shaderCode.structCode = `
        
        struct ${this.shaderCode.structName}
        {
            material_id: u32,
	        ambient_texture_id: i32,
            diffuse_texture_id: i32,
            specular_texture_id: i32,
            shininess_texture_id: i32,
	        emissive_texture_id: i32,
        }

        `;
        this.shaderCode.variableName = `material_phong_desc_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
        @group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `;

        return this.shaderCode;
    }
}

export {
    type IMATERIAL_PHONG_DESC,
    MaterialPhongDescSnippet
}