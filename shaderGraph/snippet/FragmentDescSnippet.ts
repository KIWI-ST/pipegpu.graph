import { Compiler } from "pipegpu";
import { BaseSnippet, IShaderCode, ShaderCodeFormat } from "../BaseSnippet";

/**
 * FragmentDescSnippet is a shader snippet that defines the structure for fragment shader data.
 */
class FragmentDescSnippet extends BaseSnippet {

    constructor(compiler: Compiler) {
        super(compiler, 'fragment_desc_snippet')
    }

    initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        if (_shaderCodeFormat !== 'renderer') {
            throw new Error("FragmentDescSnippet can only be used with renderer shader code format.");
        }
        this.shaderCode.structName = "FRAGMENT";
        this.shaderCode.structCode = `

            struct ${this.shaderCode.structName}
            {
                @builtin(position) position:vec4<f32>,
                @location(0) @interpolate(flat) pack_id: u32,
                @location(1) position_ws: vec4<f32>,            // ws = world space
                @location(2) normal_ws: vec3<f32>,              // ws = world space
                @location(3) uv:vec2<f32>,
                @location(4) @interpolate(flat) instance_id: u32,
                @location(5) @interpolate(flat) meshlet_id: u32,
                @location(6) @interpolate(flat) triangle_id: u32,
                @location(7) @interpolate(flat) need_discard: u32
            };

        `;

        return this.shaderCode;
    }
}

export {
    FragmentDescSnippet
}