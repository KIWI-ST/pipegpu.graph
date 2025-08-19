import type { Compiler, Context, Texture2D } from "pipegpu";
import { RenderComponent } from "../RenderComponen";
import type { DebugSnippet } from "../snippet/DebugSnippet";

class DepthClearComponent extends RenderComponent {

    debugSnippet: DebugSnippet;

    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
    ) {
        super(context, compiler);
        this.debugSnippet = debugSnippet;
        this.append(this.debugSnippet);
    }

    /**
     * 
     * @param depthTexture 
     */
    createClearDepthStencilAttachment = (depthTexture: Texture2D) => {
        return this.compiler.createDepthStencilAttachment({
            texture: depthTexture,
            depthLoadStoreFormat: 'loadStore',
            depthCompareFunction: 'less-equal',
            depthReadOnly: false,
            depthClearValue: 1.0,
        });
    }

    build(): string {
        let renderCode = super.build();
        renderCode += `

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
    var positions: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, 1.0), 
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0, 1.0)
    );
    return vec4<f32>(positions[vertexIndex], 1.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
}

        `;

        return renderCode;
    }

}

export {
    DepthClearComponent
}