import type { Handle2D } from "pipegpu/src/res/buffer/BaseBuffer";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";
import { Compiler, StorageBuffer, type TypedArray2DFormat } from "pipegpu";

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
    public getBuffer(handler: Handle2D, totalByteLength: number): StorageBuffer {
        const buffer: StorageBuffer = this.compiler.createStorageBuffer({
            totalByteLength: totalByteLength,
            handler: handler,
        });
        return buffer;
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param shaderCodeFormat 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `INSTANCE_DESC`;
        this.shaderCode.structCode = `
        
struct ${this.shaderCode.structName}
{
    model: mat4x4<f32>,
    mesh_id: u32,
};

        `;
        this.shaderCode.variableName = `instance_desc_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;
        
        `;

        return this.shaderCode;
    }
}

export {
    InstanceDescSnippet
}