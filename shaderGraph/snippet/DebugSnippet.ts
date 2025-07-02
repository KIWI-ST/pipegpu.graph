import { BaseSnippet, IShaderCode, ShaderCodeFormat } from "../BaseSnippet"
import { Compiler, MapBuffer } from "pipegpu";

interface IDebug {
    x: number,
    y: number,
    z: number,
    w: number,
    u: number,
    v: number,
    r: number,
    g: number,
    b: number,
    a: number,
}

class DebugSnippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'debug_snippet');
    }

    initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = "Debug";
        this.shaderCode.structCode = `

            struct ${this.shaderCode.structName}
            {
                x: f32,
                y: f32,
                z: f32,
                w: f32,
                u: f32,
                v: f32,
                r: f32,
                g: f32,
                b: f32,
                a: f32,
            }
        
        `;
        this.shaderCode.variableName = `debug_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
        @group(${groupIndex}) @binding(${bindingIndex}) var<storage, read_write> ${this.shaderCode.variableName}: array<${this.shaderCode.structName}>;

        `;

        return this.shaderCode;
    }

    public getBuffer(): MapBuffer {
        const debugData: IDebug = {
            x: 0,
            y: 0,
            z: 0,
            w: 0,
            u: 0,
            v: 0,
            r: 0,
            g: 0,
            b: 0,
            a: 0
        };
        const debugDataArray = new Float32Array([
            debugData.x, debugData.y, debugData.z, debugData.w,
            debugData.u, debugData.v,
            debugData.r, debugData.g, debugData.b, debugData.a
        ]);
        const buffer = this.compiler.createMapBuffer({
            rawData: [debugDataArray]
        });
        return buffer;
    }

}

export {
    type IDebug,
    DebugSnippet
}