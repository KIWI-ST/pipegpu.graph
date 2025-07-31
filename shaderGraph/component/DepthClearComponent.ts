import type { Compiler, Context } from "pipegpu";
import { RenderComponent } from "../RenderComponen";

class DepthClearComponent extends RenderComponent {

    constructor(
        context: Context,
        compiler: Compiler
    ) {
        super(context, compiler);
    }

    build(): string {
        let renderCode = super.build();
        renderCode += `

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {{
    var positions: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, 1.0), 
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0, 1.0)
    );
    return vec4<f32>(positions[vertexIndex], 1.0, 1.0);
}}

@fragment
fn fs_main() -> @location(0) vec4<f32> {{
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
}}

        `;

        return renderCode;
    }

}

export {
    DepthClearComponent
}