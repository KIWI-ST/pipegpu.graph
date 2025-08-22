import type { Compiler, Context } from "pipegpu";
import { RenderComponent } from "../RenderComponen";
import type { DebugSnippet } from "../snippet/DebugSnippet";
import type { VisibilityBufferSnippet } from "../snippet/VisibilityBufferSnippet";
import type { ViewSnippet } from "../snippet/ViewSnippet";
import type { StorageVec2U32Snippet } from "../snippet/StorageVec2U32Snippet";

/**
 * 
 */
class VisibilityBuffertVisComponent extends RenderComponent {
    /**
     * 
     */
    debugSnippet: DebugSnippet;

    /**
     * 
     */
    visibilityBufferSnippet: VisibilityBufferSnippet;

    /**
     * 
     */
    viewSnippet: ViewSnippet;

    /**
     * 
     */
    runtimeMeshletMapSnippet: StorageVec2U32Snippet;

    /**
     * 
     * @param context 
     * @param compiler 
     * @param debugSnippet 
     * @param visibilityBufferSnippet 
     * @param viewSnippet 
     * @param runtimeMeshletMapSnippet 
     */
    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        visibilityBufferSnippet: VisibilityBufferSnippet,
        viewSnippet: ViewSnippet,
        runtimeMeshletMapSnippet: StorageVec2U32Snippet
    ) {
        super(context, compiler);
        this.debugSnippet = debugSnippet;
        this.visibilityBufferSnippet = visibilityBufferSnippet;
        this.viewSnippet = viewSnippet;
        this.runtimeMeshletMapSnippet = runtimeMeshletMapSnippet
        this.append(this.debugSnippet);
        this.append(this.visibilityBufferSnippet);
        this.append(this.viewSnippet);
        this.append(this.runtimeMeshletMapSnippet);
    }

    override build(): string {
        let wgslCode = super.build();
        wgslCode += `

struct DebugFragment
{
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> DebugFragment
{
    var f: DebugFragment;
    var positions: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, 1.0),
    );
    var uvs: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(0.0, 0.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 0.0)
    );
    f.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
    f.uv = uvs[vertexIndex];
    return f;
}

const colors: array<vec4<f32>, 127> = array<vec4<f32>, 127>(
    vec4<f32>(0.0, 0.0, 0.0, 1.0),
    vec4<f32>(0.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 1.0, 1.0),
    vec4<f32>(1.0, 1.0, 0.0, 1.0),
    vec4<f32>(1.0, 0.0, 1.0, 1.0),
    vec4<f32>(0.0, 1.0, 1.0, 1.0),
    vec4<f32>(1.0, 0.5, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.5, 1.0),
    vec4<f32>(0.5, 0.5, 0.5, 1.0),
    vec4<f32>(1.0, 1.0, 1.0, 1.0),
    vec4<f32>(0.0, 0.0, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.5, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 0.5, 1.0),
    vec4<f32>(1.0, 0.5, 0.5, 1.0),
    vec4<f32>(0.5, 1.0, 0.5, 1.0),
    vec4<f32>(0.5, 0.5, 1.0, 1.0),
    vec4<f32>(1.0, 1.0, 0.5, 1.0),
    vec4<f32>(1.0, 0.5, 1.0, 1.0),
    vec4<f32>(0.5, 1.0, 1.0, 1.0),
    vec4<f32>(0.75, 0.75, 0.75, 1.0),
    vec4<f32>(0.25, 0.25, 0.25, 1.0),
    vec4<f32>(0.8, 0.8, 0.8, 1.0),
    vec4<f32>(1.0, 0.2, 0.2, 1.0),
    vec4<f32>(0.2, 1.0, 0.2, 1.0),
    vec4<f32>(0.2, 0.2, 1.0, 1.0),
    vec4<f32>(1.0, 0.8, 0.2, 1.0),
    vec4<f32>(1.0, 0.2, 1.0, 1.0),
    vec4<f32>(0.2, 1.0, 1.0, 1.0),
    vec4<f32>(0.5, 0.25, 0.0, 1.0),
    vec4<f32>(0.5, 0.5, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.25, 1.0),
    vec4<f32>(0.75, 0.5, 0.25, 1.0),
    vec4<f32>(0.25, 0.75, 0.5, 1.0),
    vec4<f32>(0.75, 0.25, 0.5, 1.0),
    vec4<f32>(0.25, 0.5, 0.75, 1.0),
    vec4<f32>(0.5, 0.75, 0.25, 1.0),
    vec4<f32>(0.75, 0.5, 0.0, 1.0),
    vec4<f32>(0.0, 0.5, 0.5, 1.0),
    vec4<f32>(0.5, 0.0, 0.5, 1.0),
    vec4<f32>(0.0, 0.0, 0.5, 1.0),
    vec4<f32>(0.5, 0.5, 1.0, 1.0),
    vec4<f32>(1.0, 0.75, 0.5, 1.0),
    vec4<f32>(0.5, 1.0, 0.75, 1.0),
    vec4<f32>(1.0, 0.5, 0.75, 1.0),
    vec4<f32>(0.75, 1.0, 0.5, 1.0),
    vec4<f32>(0.5, 0.25, 0.75, 1.0),
    vec4<f32>(0.25, 0.75, 0.5, 1.0),
    vec4<f32>(1.0, 0.25, 0.5, 1.0),
    vec4<f32>(0.75, 1.0, 0.5, 1.0),
    vec4<f32>(1.0, 0.5, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.0, 1.0),
    vec4<f32>(1.0, 0.0, 0.0, 1.0),
    vec4<f32>(0.0, 1.0, 1.0, 1.0),
    vec4<f32>(1.0, 0.5, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.5, 1.0),
    vec4<f32>(0.5, 0.5, 0.5, 1.0),
    vec4<f32>(1.0, 1.0, 1.0, 1.0),
    vec4<f32>(0.0, 0.0, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.5, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 0.5, 1.0),
    vec4<f32>(1.0, 0.5, 0.5, 1.0),
    vec4<f32>(0.5, 1.0, 0.5, 1.0),
    vec4<f32>(0.5, 0.5, 1.0, 1.0),
    vec4<f32>(1.0, 1.0, 0.5, 1.0),
    vec4<f32>(1.0, 0.5, 1.0, 1.0),
    vec4<f32>(0.5, 1.0, 1.0, 1.0),
    vec4<f32>(0.75, 0.75, 0.75, 1.0),
    vec4<f32>(1.0, 0.2, 1.0, 1.0),
    vec4<f32>(0.2, 1.0, 1.0, 1.0),
    vec4<f32>(0.5, 0.25, 0.0, 1.0),
    vec4<f32>(0.25, 0.5, 0.0, 1.0),
    vec4<f32>(0.0, 0.25, 0.5, 1.0),
    vec4<f32>(0.5, 0.5, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.25, 1.0),
    vec4<f32>(0.75, 0.5, 0.25, 1.0),
    vec4<f32>(0.25, 0.75, 0.5, 1.0),
    vec4<f32>(0.75, 0.25, 0.5, 1.0),
    vec4<f32>(0.25, 0.5, 0.75, 1.0),
    vec4<f32>(0.5, 0.75, 0.25, 1.0),
    vec4<f32>(0.75, 0.5, 0.0, 1.0),
    vec4<f32>(1.0, 0.5, 0.75, 1.0),
    vec4<f32>(0.75, 1.0, 0.5, 1.0),
    vec4<f32>(0.5, 1.0, 0.0, 1.0),
    vec4<f32>(1.0, 0.5, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.0, 1.0),
    vec4<f32>(1.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 1.0, 1.0),
    vec4<f32>(0.75, 0.75, 0.75, 1.0),
    vec4<f32>(0.25, 0.25, 0.25, 1.0),
    vec4<f32>(0.8, 0.8, 0.8, 1.0),
    vec4<f32>(1.0, 0.2, 0.2, 1.0),
    vec4<f32>(0.2, 1.0, 0.2, 1.0),
    vec4<f32>(0.2, 0.2, 1.0, 1.0),
    vec4<f32>(1.0, 0.8, 0.2, 1.0),
    vec4<f32>(1.0, 0.2, 1.0, 1.0),
    vec4<f32>(0.2, 1.0, 1.0, 1.0),
    vec4<f32>(0.5, 0.25, 0.0, 1.0),
    vec4<f32>(0.25, 0.5, 0.0, 1.0),
    vec4<f32>(0.0, 0.25, 0.5, 1.0),
    vec4<f32>(0.5, 0.5, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.25, 1.0),
    vec4<f32>(0.75, 0.5, 0.25, 1.0),
    vec4<f32>(0.25, 0.75, 0.5, 1.0),
    vec4<f32>(0.75, 0.25, 0.5, 1.0),
    vec4<f32>(0.25, 0.5, 0.75, 1.0),
    vec4<f32>(0.0, 0.5, 0.5, 1.0),
    vec4<f32>(0.5, 0.0, 0.5, 1.0),
    vec4<f32>(0.0, 0.0, 0.5, 1.0),
    vec4<f32>(0.5, 0.5, 1.0, 1.0),
    vec4<f32>(1.0, 0.75, 0.5, 1.0),
    vec4<f32>(0.5, 1.0, 0.75, 1.0),
    vec4<f32>(1.0, 0.5, 0.75, 1.0),
    vec4<f32>(0.75, 1.0, 0.5, 1.0),
    vec4<f32>(0.5, 1.0, 0.0, 1.0),
    vec4<f32>(1.0, 0.5, 0.0, 1.0),
    vec4<f32>(0.5, 0.0, 0.0, 1.0),
    vec4<f32>(1.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 1.0, 1.0, 1.0),
    vec4<f32>(0.0, 0.0, 1.0, 1.0),
    vec4<f32>(1.0, 0.0, 1.0, 1.0),
    vec4<f32>(1.0, 0.0, 0.0, 1.0),
    vec4<f32>(0.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 1.0, 1.0),
    vec4<f32>(0.5, 0.5, 0.5, 1.0),
    vec4<f32>(0.75, 0.75, 0.75, 1.0)
);

@fragment
fn fs_main(f: DebugFragment) -> @location(0) vec4 <f32> 
{
    let x: u32 = u32(${this.viewSnippet.getVariableName()}.viewport_width * f.uv.x);
    let y: u32 = u32(${this.viewSnippet.getVariableName()}.viewport_height * f.uv.y);
    let xy: vec2<u32> = vec2<u32>(x, y);
    let pack_id: u32 = textureLoad(${this.visibilityBufferSnippet.getVariableName()}, xy).r;
    /////////////////////////////////////DEBUG-START///////////////////////////////////////
    ${this.debugSnippet.getVariableName()}[0].a = f32(pack_id);
    /////////////////////////////////////DEBUG-END///////////////////////////////////////

    if (pack_id == 0u) {
        return colors[0];
    }

    let runtiem_meshlet_id_offset: u32 = 1;
    let runtime_meshlet_id: u32 = (pack_id >> 7u) - runtiem_meshlet_id_offset;
    let instance_id = ${this.runtimeMeshletMapSnippet.getVariableName()}[runtime_meshlet_id].x + 1;
    let meshlet_id = ${this.runtimeMeshletMapSnippet.getVariableName()}[runtime_meshlet_id].y;
    let triangle_id: u32 = pack_id & 0x7Fu;
    let color: vec4<f32> = colors[meshlet_id % 127];

    return color;
}

        `;
        return wgslCode;
    }


}


export {
    VisibilityBuffertVisComponent
}