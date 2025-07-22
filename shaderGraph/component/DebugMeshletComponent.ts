import type { Compiler, Context } from "pipegpu";
import type { DebugSnippet } from "../snippet/DebugSnippet";
import type { FragmentDescSnippet } from "../snippet/FragmentDescSnippet";
import type { VertexSnippet } from "../snippet/VertexSnippet";
import type { ViewProjectionSnippet } from "../snippet/ViewProjectionSnippet";
import type { ViewSnippet } from "../snippet/ViewSnippet";
import type { InstanceDescSnippet } from "../snippet/InstanceDescSnippet";
import type { MeshDescSnippet } from "../snippet/MeshDescSnippet";
import type { MaterialSnippet } from "../snippet/MaterialSnippet";
import type { StorageArrayU32Snippet } from "../snippet/StorageArrayU32Snippet";
import type { StorageIndexSnippet } from "../snippet/StorageIndexSnippet";
import type { PointLightSnippet } from "../snippet/PointLightSnippet";
import type { Texture2DArraySnippet } from "../snippet/Texture2DArraySnippet";
import type { TextureSamplerSnippet } from "../snippet/TextureSamplerSnippet";
import { RenderComponent } from "../RenderComponen";
import type { IndexedStorageBuffer } from "pipegpu/src/res/buffer/IndexedStorageBuffer";

/**
 * 
 */
class DebugMeshletComponent extends RenderComponent {

    private fragmentSnippet: FragmentDescSnippet;
    private vertexSnippet: VertexSnippet;
    private viewProjectionSnippet: ViewProjectionSnippet;
    private viewSnippet: ViewSnippet;
    private instanceDescSnippet: InstanceDescSnippet;
    private meshDescSnippet: MeshDescSnippet;
    private storageIndexedSnippet: StorageIndexSnippet;
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
        storageIndexedSnippet: StorageIndexSnippet,
        instanceOrderSnippet: StorageArrayU32Snippet,
    ) {
        super(context, compiler);
        this.fragmentSnippet = fragmentSnippet;
        this.vertexSnippet = vertexSnippet;
        this.viewProjectionSnippet = viewProjectionSnippet;
        this.viewSnippet = viewSnippet;
        this.instanceDescSnippet = instanceDescSnippet;
        this.meshDescSnippet = meshDescSnippet;
        this.storageIndexedSnippet = storageIndexedSnippet;
        this.instanceOrderSnippet = instanceOrderSnippet;

        this.append(fragmentSnippet);
        this.append(vertexSnippet);
        this.append(viewProjectionSnippet);
        this.append(viewSnippet);
        this.append(instanceDescSnippet);
        this.append(meshDescSnippet);
        this.append(storageIndexedSnippet);
        this.append(instanceOrderSnippet);
    }

    build(): string {
        let renderCode = super.build();
        renderCode += `

@vertex
fn vs_main(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> ${this.fragmentSnippet.getStructName()}
{
    var f: ${this.fragmentSnippet.getStructName()};
    // let v: VERTEX = ${this.vertexSnippet.getVariableName()}[vi];
    // let instance_index_order = ${this.instanceOrderSnippet.getVariableName()}[ii];
    // let instance = ${this.instanceDescSnippet.getVariableName()}[instance_index_order];
    // let mat4 = ${this.viewProjectionSnippet.getVariableName()}.projection * ${this.viewProjectionSnippet.getVariableName()}.view * instance.model;
    // let position = vec4<f32>(v.px, v.py, v.pz, 1.0);
    // f.position = vec4<f32>(f32(vi)/1024.0, f32(ii)/1024.0, 0.0, 1.0);
        if(ii == 0 ){
            f.position = vec4<f32>(0.0, 0.0, 0.0, 1.0);
        }
        else if(ii == 1){
            f.position = vec4<f32>(1.0, 1.0, 0.0, 1.0);
        }
        else{
            f.position = vec4<f32>(0.0, 1.0, 0.0, 1.0);
        }
    

    // if(u32(ii%3) == 0u){
    //     f.position = vec4<f32>(0.5, 0.5, 0.99999, 1.0);
    // }
    // if(u32(ii%3) == 1u){
    //     f.position = vec4<f32>(0.0, 0.0, 0.99999, 1.0);
    // }
    // if(u32(ii%3) == 2u){
    //     f.position = vec4<f32>(-0.5, -0.9, 0.99999, 1.0);
    // }
    // f.position = mat4 * position;
    // f.position_ws = instance.model * position;
    // f.normal_ws = vec3<f32>(v.nx, v.ny, v.nz);
    // f.triangle_id = vi;
    // f.instance_id = instance_index_order;
    // f.uv = vec2<f32>(v.u, v.v);

    return f;
}

@fragment
fn fs_main(input: ${this.fragmentSnippet.getStructName()}) -> @location(0) vec4<f32>
{
    return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    // let instance = ${this.instanceDescSnippet.getVariableName()}[input.instance_id];
    // let mesh_id = instance.mesh_id;
    // return vec4<f32>(input.normal_ws, 1.0);
}
        
        `;

        return renderCode;
    }

}

export {
    DebugMeshletComponent
}

