import { Compiler, StorageBuffer, type TypedArray2DFormat } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";
import type { Handle2D } from "pipegpu/src/res/buffer/BaseBuffer";

/**
 * VertexSnippet class for handling vertex shader snippets.
 */
class VertexSnippet extends BaseSnippet {

    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'vertex_snippet')
    }

    /**
     * 
     * @param rawData 
     * @returns 
     */
    public getBuffer = (handler: Handle2D, maximumByteLength: number): StorageBuffer => {
        const buffer = this.compiler.createStorageBuffer({
            totalByteLength: maximumByteLength,
            handler: handler,
        });
        return buffer;
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param _shaderCodeFormat 
     * @returns 
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `VERTEX`;
        this.shaderCode.structCode = `
        
struct ${this.shaderCode.structName}
{
    px:f32,
    py:f32,
    pz:f32,
    nx:f32,
    ny:f32,
    nz:f32,
    u:f32,
    v:f32,
};
        
        `;
        this.shaderCode.variableName = `vertex_arr_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `

@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;
        
        `;

        return this.shaderCode;
    }

}

export {
    VertexSnippet
}
