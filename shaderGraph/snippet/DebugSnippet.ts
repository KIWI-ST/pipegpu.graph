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
    total_instance_count: f32,
    instance_count: f32,
    depth: f32,
    depth1: f32,
    mip_level: f32,
    view_port_x: f32,
    view_port_y: f32,
    x: f32,
    y: f32,
    z: f32,
    w: f32,
    u: f32,
    v: f32,
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