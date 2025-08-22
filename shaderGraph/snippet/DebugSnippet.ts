import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet"
import { Compiler, MapBuffer } from "pipegpu";

/**
 * DebugSnippet is a shader snippet that defines a structure for debugging data.
 */
class DebugSnippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'debug_snippet');
    }

    override initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = "DEBUG";
        this.shaderCode.structCode = `

struct ${this.shaderCode.structName}
{
    a: f32,
    b: f32,
    c: f32,
    d: f32,
    e: f32,
    f: f32,
    g: f32,
    h: f32,
    i: f32,
    j: f32,
    k: f32,
    l: f32,
    m: f32,
};
        
        `;
        this.shaderCode.variableName = `debug_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
@group(${groupIndex}) @binding(${bindingIndex}) var<storage, read_write> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `;

        return this.shaderCode;
    }

    public getBuffer(): MapBuffer {
        const debugDataArray = new Float32Array([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ]);
        const buffer = this.compiler.createMapBuffer({
            totalByteLength: 13 * 4,
            rawData: [debugDataArray],
        });
        return buffer;
    }

}

export {
    DebugSnippet
}