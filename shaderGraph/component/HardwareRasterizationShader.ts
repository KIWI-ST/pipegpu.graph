import type { Compiler, Context } from "pipegpu";
import { RenderComponent } from "../RenderComponen";
import type { DebugSnippet } from "../snippet/DebugSnippet";
import type { FragmentDescSnippet } from "../snippet/FragmentDescSnippet";
import type { ViewProjectionSnippet } from "../snippet/ViewProjectionSnippet";
import type { MeshDescSnippet } from "../snippet/MeshDescSnippet";
import type { MeshletDescSnippet } from "../snippet/MeshletSnippet";
import type { InstanceDescSnippet } from "../snippet/InstanceDescSnippet";
import type { VertexSnippet } from "../snippet/VertexSnippet";
import type { IndexedStorageSnippet } from "../snippet/IndexedStorageSnippet";
import type { StorageVec2U32Snippet } from "../snippet/StorageVec2U32Snippet";

/**
 * 
 */
class HardwareRasterizationComponent extends RenderComponent {

    debugSnippet: DebugSnippet;
    fragmentDescSnippet: FragmentDescSnippet;
    viewProjectionSnippet: ViewProjectionSnippet;
    meshDescSnippet: MeshDescSnippet;
    meshletDescSnippet: MeshletDescSnippet;
    instanceDescSnippet: InstanceDescSnippet;
    vertexSnippet: VertexSnippet;
    indexedStorageSnippet: IndexedStorageSnippet;
    runtimeMeshletMapSnippet: StorageVec2U32Snippet;

    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        fragmentDescSnippet: FragmentDescSnippet,
        viewProjectionSnippet: ViewProjectionSnippet,
        meshDescSnippet: MeshDescSnippet,
        meshletDescSnippet: MeshletDescSnippet,
        instanceDescSnippet: InstanceDescSnippet,
        vertexSnippet: VertexSnippet,
        indexedStorageSnippet: IndexedStorageSnippet,
        runtimeMeshletMapSnippet: StorageVec2U32Snippet,
    ) {
        super(context, compiler);

        this.debugSnippet = debugSnippet;
        this.fragmentDescSnippet = fragmentDescSnippet;
        this.viewProjectionSnippet = viewProjectionSnippet;
        this.meshDescSnippet = meshDescSnippet;
        this.meshletDescSnippet = meshletDescSnippet;
        this.instanceDescSnippet = instanceDescSnippet;
        this.vertexSnippet = vertexSnippet;
        this.indexedStorageSnippet = indexedStorageSnippet;
        this.runtimeMeshletMapSnippet = runtimeMeshletMapSnippet;

        this.append(this.debugSnippet);
        this.append(this.fragmentDescSnippet);
        this.append(this.viewProjectionSnippet);
        this.append(this.meshDescSnippet);
        this.append(this.meshletDescSnippet);
        this.append(this.instanceDescSnippet);
        this.append(this.vertexSnippet);
        this.append(this.indexedStorageSnippet);
        this.append(this.runtimeMeshletMapSnippet);
    }

    override build(): string {
        let wgslCode = super.build();
        wgslCode += `

// [0, 3 * triangle_count] / [0, indices_count]
@vertex
fn vs_main(
    @builtin(vertex_index) in_vertex_index: u32,                    
    @builtin(instance_index) in_instance_index: u32,
) -> ${this.fragmentDescSnippet.getStructName()}
{
    var f: ${this.fragmentDescSnippet.getStructName()};

    let instance_and_meshlet: vec2<u32> = ${this.runtimeMeshletMapSnippet.getVariableName()}[in_instance_index];
    let meshlet_id = instance_and_meshlet.y;
    let instance_id = instance_and_meshlet.x;
    let meshlet = ${this.meshletDescSnippet.getVariableName()}[meshlet_id];
    let instance = ${this.instanceDescSnippet.getVariableName()}[instance_id];
    let mesh = ${this.meshDescSnippet.getVariableName()}[instance.mesh_id];
    let model: mat4x4<f32> = instance.model;

    if(in_vertex_index >= meshlet.index_count) {{
        f.position = vec4<f32>(0.0, 0.0, 0.0, 1.0);
        return f;
    }}

    let vertex_id: u32 = mesh.vertex_offset + ${this.indexedStorageSnippet.getVariableName()}[meshlet.index_offset + in_vertex_index];
    let vertex: ${this.vertexSnippet.getStructName()} = ${this.vertexSnippet.getVariableName()}[vertex_id];
    let vertex_position = vec4<f32>(vertex.px, vertex.py, vertex.pz, 1.0);
    let vertex_normal = vec3<f32>(vertex.nx, vertex.ny, vertex.nz);
    let vertex_uv = vec2<f32>(vertex.u, vertex.v);
    let normal_ws = model * vec4<f32>(vertex_normal, 0.0);

    f.position = {7}.projection * {7}.view * model * vertex_position;

    //f.position_ws = model * vertex_position;
    //f.normal_ws = normalize(normal_ws.xyz);
    //f.uv = vertex_uv;
    //f.instance_id = instance_id;
    //f.meshlet_id = meshlet_id;

    let triangle_id: u32 = u32(in_vertex_index/3u);

    // WARNING, pack [0, 0] pair will make mistake with default R32Uint texture, set offset for runtime meshlet_id
    let runtiem_meshlet_id_offset: u32 = 1;
    let runtiem_meshlet_id: u32 = in_instance_index + runtiem_meshlet_id_offset;
    f.pack_id = ((runtiem_meshlet_id & 0x1FFFFFFu) << 7u) | (triangle_id & 0x7Fu);

    return f;
}

@fragment
fn fs_main(f: {1}) -> @location(0) u32 {
    // bitcast<u32>( f.position.z / f.position.w), 
    return f.pack_id;
}

        `;

        return wgslCode;
    }

}

export {
    HardwareRasterizationComponent
}