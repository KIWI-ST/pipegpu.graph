import { Mat4 } from "kiwi.matrix";
import { BaseSnippet, IShaderCode, ShaderCodeFormat } from "../BaseSnippet";
import { Compiler, StorageBuffer, TypedArray2DFormat } from "pipegpu";

/**
 * 
 */
interface IINSTANCEDESC {
    model: Mat4,
    meshId: number
}

/**
 * 
 */
class InstanceDescSnippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'instance_desc_snippet');
    }

    /**
     * 
     * @param rawData 
     * @returns 
     */
    public getBuffer(rawData: TypedArray2DFormat): StorageBuffer {
        const buffer: StorageBuffer = this.compiler.createStorageBuffer({ rawData: rawData });
        return buffer;
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param shaderCodeFormat 
     */
    initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `INSTANCEDESC`;
        this.shaderCode.structCode = `
        
        struct ${this.shaderCode.structCode}
        {
            model: mat4x4<f32>,
            mesh_id: u32,
        }

        `;
        this.shaderCode.variableName = `instance_desc_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
        @group(${groupIndex}}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableCode}: array<${this.shaderCode.structName}>;
        
        `;

        return this.shaderCode;
    }
}

export {
    type IINSTANCEDESC,
    InstanceDescSnippet
}