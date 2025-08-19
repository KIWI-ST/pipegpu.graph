import type { Compiler, Context } from "pipegpu";
import { ComputeComponent } from "../ComputerComponen";
import { DebugSnippet } from "../snippet/DebugSnippet";
import type { VisibilityBufferSnippet } from "../snippet/VisibilityBufferSnippet";
import type { IndexedStorageSnippet } from "../snippet/IndexedStorageSnippet";
import type { MeshDescSnippet } from "../snippet/MeshDescSnippet";
import type { MeshletDescSnippet } from "../snippet/MeshletSnippet";
import type { InstanceDescSnippet } from "../snippet/InstanceDescSnippet";
import type { StorageAtomicU32Snippet } from "../snippet/StorageAtomicU32Snippet";
import type { StorageVec2U32Snippet } from "../snippet/StorageVec2U32Snippet";
import type { IndirectSnippet } from "../snippet/IndirectSnippet";

/**
 * 
 */
class ReuseVisibilityBufferComponent extends ComputeComponent {

    debugSnippet: DebugSnippet;
    visibilityBufferSnippet: VisibilityBufferSnippet;
    staticIndexedStorageSnippet: IndexedStorageSnippet;
    dynamicIndexedStorageSnippet: IndexedStorageSnippet;
    meshDescSnippet: MeshDescSnippet;
    meshletDescSnippet: MeshletDescSnippet;
    instanceDescSnippet: InstanceDescSnippet;
    triangleCountSnippet: StorageAtomicU32Snippet;
    runtimeMeshletMapSnippet: StorageVec2U32Snippet;
    indirectSnippet: IndirectSnippet;

    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        visibilityBufferSnippet: VisibilityBufferSnippet,
        staticIndexedStorageSnippet: IndexedStorageSnippet,
        dynamicIndexedStorageSnippet: IndexedStorageSnippet,
        meshDescSnippet: MeshDescSnippet,
        meshletDescSnippet: MeshletDescSnippet,
        instanceDescSnippet: InstanceDescSnippet,
        triangleCountSnippet: StorageAtomicU32Snippet,
        runtimeMeshletMapSnippet: StorageVec2U32Snippet,
        indirectSnippet: IndirectSnippet
    ) {
        super(context, compiler);

        this.debugSnippet = debugSnippet;
        this.visibilityBufferSnippet = visibilityBufferSnippet;
        this.staticIndexedStorageSnippet = staticIndexedStorageSnippet;
        this.dynamicIndexedStorageSnippet = dynamicIndexedStorageSnippet;
        this.meshDescSnippet = meshDescSnippet;
        this.meshletDescSnippet = meshletDescSnippet;
        this.instanceDescSnippet = instanceDescSnippet;
        this.triangleCountSnippet = triangleCountSnippet;
        this.runtimeMeshletMapSnippet = runtimeMeshletMapSnippet;
        this.indirectSnippet = indirectSnippet;

        this.append(this.debugSnippet);
        this.append(this.visibilityBufferSnippet);
        this.append(this.staticIndexedStorageSnippet);
        this.append(this.dynamicIndexedStorageSnippet);
        this.append(this.meshDescSnippet);
        this.append(this.meshletDescSnippet);
        this.append(this.instanceDescSnippet);
        this.append(this.triangleCountSnippet);
        this.append(this.runtimeMeshletMapSnippet);
        this.append(this.indirectSnippet);

        this.workGroupSize = [16, 16, 1];
    }

    build(): string {
        let wgslCode = super.build();
        wgslCode += `

@compute @workgroup_size(${this.workGroupSize[0]}, ${this.workGroupSize[1]}, ${this.workGroupSize[2]})
fn cp_main(@builtin(global_invocation_id) global_index: vec3<u32>)
{
    let visbility_viewprot_xyz = textureDimensions(${this.visibilityBufferSnippet.getVariableName()});
    if (global_index.x > visbility_viewprot_xyz.x || global_index.y > visbility_viewprot_xyz.y) {
        return;                
    }

    let rgba: vec4<u32> = textureLoad(${this.visibilityBufferSnippet.getVariableName()}, global_index.xy);
    let pack_id: u32 = rgba.x;

    /////////////////////////////////////DEBUG-START///////////////////////////////////////
    ///// f32(atomicLoad(&${this.triangleCountSnippet.getVariableName()}));
    ${this.debugSnippet.getVariableName()}[0].a = f32(visbility_viewprot_xyz.x);
    ${this.debugSnippet.getVariableName()}[0].b = f32(visbility_viewprot_xyz.y);
    ${this.debugSnippet.getVariableName()}[0].c = f32(global_index.x);
    ${this.debugSnippet.getVariableName()}[0].d = f32(global_index.y);
    ${this.debugSnippet.getVariableName()}[0].e = f32(pack_id);
    /////////////////////////////////////DEBUG-END///////////////////////////////////////

    // missing cached runtime triangle
    if (pack_id == 0u) {
        return;            
    }

    let runtiem_meshlet_id_offset: u32 = 1;
    let runtime_meshlet_id: u32 = (pack_id >> 7u) - runtiem_meshlet_id_offset;
    let triangle_id: u32 = pack_id & 0x7Fu;

    let instance_meshlet_id_pair: vec2<u32> = ${this.runtimeMeshletMapSnippet.getVariableName()}[runtime_meshlet_id];
    let instance_id: u32 = instance_meshlet_id_pair.x;
    let meshlet_id: u32 = instance_meshlet_id_pair.y;

    let meshlet = ${this.meshletDescSnippet.getVariableName()}[meshlet_id];
    let instance = ${this.instanceDescSnippet.getVariableName()}[instance_id];
    let mesh_id = instance.mesh_id;
    let mesh = ${this.meshDescSnippet.getVariableName()}[mesh_id];

    // get global vertex unique runtime index
    let vertex_id_0: u32 = mesh.vertex_offset + ${this.staticIndexedStorageSnippet.getVariableName()}[meshlet.index_offset + triangle_id * 3];
    let vertex_id_1: u32 = mesh.vertex_offset + ${this.staticIndexedStorageSnippet.getVariableName()}[meshlet.index_offset + triangle_id * 3 + 1];
    let vertex_id_2: u32 = mesh.vertex_offset + ${this.staticIndexedStorageSnippet.getVariableName()}[meshlet.index_offset + triangle_id * 3 + 2];

    // regroup index buffer(dynamic index buffer) and indirect buffer according to runtime triangle id
    let index: u32 = atomicAdd(&${this.triangleCountSnippet.getVariableName()}, 1u);
    ${this.dynamicIndexedStorageSnippet.getVariableName()}[index * 3] = vertex_id_0;
    ${this.dynamicIndexedStorageSnippet.getVariableName()}[index * 3 + 1] = vertex_id_1;
    ${this.dynamicIndexedStorageSnippet.getVariableName()}[index * 3 + 2] = vertex_id_2;

    // write indirect draw count buffer 
    ${this.indirectSnippet.getVariableName()}[index] = ${this.indirectSnippet.getStructName()}(3, 1, index * 3, instance_id);



}
        `;

        return wgslCode;
    }

}

export {
    ReuseVisibilityBufferComponent
}