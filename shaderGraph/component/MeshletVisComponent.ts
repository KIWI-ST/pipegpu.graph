import type { Compiler, Context } from "pipegpu";
import type { DebugSnippet } from "../snippet/DebugSnippet";
import type { FragmentDescSnippet } from "../snippet/FragmentDescSnippet";
import type { VertexSnippet } from "../snippet/VertexSnippet";
import type { ViewProjectionSnippet } from "../snippet/ViewProjectionSnippet";
import type { ViewSnippet } from "../snippet/ViewSnippet";
import type { InstanceDescSnippet } from "../snippet/InstanceDescSnippet";
import type { MeshDescSnippet } from "../snippet/MeshDescSnippet";
import type { MaterialDescSnippet } from "../snippet/MaterialDescSnippet";
import type { StorageArrayU32Snippet } from "../snippet/StorageArrayU32Snippet";
import type { IndexedStorageSnippet } from "../snippet/IndexedStorageSnippet";
import type { PointLightSnippet } from "../snippet/PointLightSnippet";
import type { Texture2DArraySnippet } from "../snippet/Texture2DArraySnippet";
import type { TextureSamplerSnippet } from "../snippet/TextureSamplerSnippet";
import { RenderComponent } from "../RenderComponen";
import type { IndexedStorageBuffer } from "pipegpu/src/res/buffer/IndexedStorageBuffer";

/**
 * 
 */
class MeshletVisComponent extends RenderComponent {

    private fragmentSnippet: FragmentDescSnippet;
    private vertexSnippet: VertexSnippet;
    private viewProjectionSnippet: ViewProjectionSnippet;
    private viewSnippet: ViewSnippet;
    private instanceDescSnippet: InstanceDescSnippet;
    private meshDescSnippet: MeshDescSnippet;
    private indexedStorageSnippet: IndexedStorageSnippet;
    private instanceOrderSnippet: StorageArrayU32Snippet;

    constructor(
        context: Context,
        compiler: Compiler,
        fragmentSnippet: FragmentDescSnippet,
        vertexSnippet: VertexSnippet,
        instanceDescSnippet: InstanceDescSnippet,
        viewProjectionSnippet: ViewProjectionSnippet,
        viewSnippet: ViewSnippet,
        meshDescSnippet: MeshDescSnippet,
        indexedStorageSnippet: IndexedStorageSnippet,
        instanceOrderSnippet: StorageArrayU32Snippet,
    ) {
        super(context, compiler);
        this.fragmentSnippet = fragmentSnippet;
        this.vertexSnippet = vertexSnippet;
        this.viewProjectionSnippet = viewProjectionSnippet;
        this.viewSnippet = viewSnippet;
        this.instanceDescSnippet = instanceDescSnippet;
        this.meshDescSnippet = meshDescSnippet;
        this.indexedStorageSnippet = indexedStorageSnippet;
        this.instanceOrderSnippet = instanceOrderSnippet;

        this.append(fragmentSnippet);
        this.append(vertexSnippet);
        this.append(viewProjectionSnippet);
        this.append(viewSnippet);
        this.append(instanceDescSnippet);
        this.append(meshDescSnippet);
        this.append(indexedStorageSnippet);
        this.append(instanceOrderSnippet);
    }

    build(): string {
        let renderCode = super.build();
        renderCode += `

@vertex
fn vs_main(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> ${this.fragmentSnippet.getStructName()}
{
    var f: ${this.fragmentSnippet.getStructName()};
    let v: VERTEX = ${this.vertexSnippet.getVariableName()}[vi];
    let instance_index_order = ${this.instanceOrderSnippet.getVariableName()}[ii];
    let instance = ${this.instanceDescSnippet.getVariableName()}[instance_index_order];
    let position = vec4<f32>(v.px, v.py, v.pz, 1.0);
    let view_projection = ${this.viewProjectionSnippet.getVariableName()};

    f.normal_ws = vec3<f32>(v.nx, v.ny, v.nz);
    f.triangle_id = vi;
    f.instance_id = instance_index_order;
    f.uv = vec2<f32>(v.tx, v.ty);
    f.position = position * instance.geo_model * view_projection.view * view_projection.projection;   //  *

    return f;
}

@fragment
fn fs_main(f: ${this.fragmentSnippet.getStructName()}) -> @location(0) vec4<f32>
{
    // return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    return vec4<f32>(f.uv.x, f.uv.y, f32(f.triangle_id), 1.0);
}
        
        `;

        return renderCode;
    }

}

export {
    MeshletVisComponent
}

