import { Compiler, StorageBuffer, type TypedArray2DFormat } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * 
 */
class MaterialDescSnippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'material_desc_snippet');
    }

    /**
     * 
     * @param rawData 
     * @returns 
     */
    public getBuffer(rawData: TypedArray2DFormat): StorageBuffer {
        let totalByteLength = 0;
        rawData.forEach(row => {
            totalByteLength += row.byteLength;
        });
        return this.compiler.createStorageBuffer({
            totalByteLength: totalByteLength,
            rawData: rawData,
        });
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param _shaderCodeFormat 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `MATERIAL_DESC`;
        this.shaderCode.structCode = `
        
struct ${this.shaderCode.structName}
{
    material_id: u32,
    material_type: i32,
    // pbr
    albedo_texture_id:i32,
            
    // phong
    ambient_texture_id: i32,
    diffuse_texture_id: i32,
    specular_texture_id: i32,
    shininess_texture_id: i32,
    emissive_texture_id: i32,
};

        `;
        this.shaderCode.variableName = `material_desc_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `;

        return this.shaderCode;
    }
}

export {
    MaterialDescSnippet
}