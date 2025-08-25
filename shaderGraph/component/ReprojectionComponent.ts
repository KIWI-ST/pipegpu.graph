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

/**
 * 
 */
class ReprojectionComponent extends RenderComponent {

    /**
     * 
     */
    private debugSnippet: DebugSnippet;

    /**
     * 
     */
    private fragmentDescSnippet: FragmentDescSnippet;

    /**
     * 
     */
    private viewProjectionSnippet: ViewProjectionSnippet;

    /**
     * 
     */
    private meshDescSnippet: MeshDescSnippet;

    /**
     * 
     */
    private meshletDescSnippet: MeshletDescSnippet;

    /**
     * 
     */
    private instanceDescSnippet: InstanceDescSnippet;

    /**
     * 
     */
    private vertexSnippet: VertexSnippet;

    /**
     * 
     */
    private indexedStorageSnippet: IndexedStorageSnippet;

    /**
     * 
     * @param context 
     * @param compiler 
     * @param debugSnippet 
     * @param fragmentDescSnippet 
     * @param viewProjectionSnippet 
     * @param meshDescSnippet 
     * @param meshletDescSnippet 
     * @param instanceDescSnippet 
     * @param vertexSnippet 
     * @param indexedStorageSnippet 
     */
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
        this.append(this.debugSnippet);
        this.append(this.fragmentDescSnippet);
        this.append(this.viewProjectionSnippet);
        this.append(this.meshDescSnippet);
        this.append(this.meshletDescSnippet);
        this.append(this.instanceDescSnippet);
        this.append(this.vertexSnippet);
        this.append(this.indexedStorageSnippet);
    }

    build(): string {
        let renderCode = super.build();
        renderCode += `

struct ReprojectionFragment
{
    @builtin(position) position: vec4<f32>,
    @location(0) @interpolate(flat) vertex_id: u32,
    @location(1) @interpolate(flat) instance_id: u32
};

@vertex
fn vs_main(
    @builtin(vertex_index) in_vertex_index: u32,  // [0, 3], fixed num of 3 for 1 triangle
    @builtin(instance_index) in_instance_index: u32,
) -> ReprojectionFragment
{
    var f: ReprojectionFragment;

    let instance_id: u32 = in_instance_index;
    let instance = ${this.instanceDescSnippet.getVariableName()}[instance_id];
    let mesh = ${this.meshDescSnippet.getVariableName()}[instance.mesh_id];
    let model: mat4x4<f32> = instance.model;

    // let vertex_id = in_vertex_index;
    let vertex_id = ${this.indexedStorageSnippet.getVariableName()}[in_vertex_index];
    let vertex = ${this.vertexSnippet.getVariableName()}[vertex_id];
    let vertex_position = vec4<f32>(vertex.px, vertex.py, vertex.pz, 1.0);

    // let vertex_normal = vec3<f32>(vertex.nx, vertex.ny, vertex.nz);
    // let vertex_uv = vec2<f32>(vertex.u, vertex.v);
    // let normal_ws = model * vec4<f32>(vertex_normal, 0.0);

    let position: vec4<f32> = ${this.viewProjectionSnippet.getVariableName()}.projection * ${this.viewProjectionSnippet.getVariableName()}.view * model * vertex_position;
    f.position= position;
    f.vertex_id = vertex_id;
    f.instance_id = instance_id;
    
    return f;
}

@fragment
fn fs_main(f: ReprojectionFragment) -> @location(0) vec4<f32> {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
}

        `;
        return renderCode;
    }

}

export {
    ReprojectionComponent
}