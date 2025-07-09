import type { Compiler, Context } from "pipegpu";
import type { DebugSnippet } from "../snippet/DebugSnippet";
import type { FragmentDescSnippet } from "../snippet/FragmentDescSnippet";
import type { VertexSnippet } from "../snippet/VertexSnippet";
import type { ViewProjectionSnippet } from "../snippet/ViewProjectionSnippet";
import type { ViewSnippet } from "../snippet/ViewSnippet";
import type { InstanceDescSnippet } from "../snippet/InstanceDescSnippet";
import type { MeshDescSnippet } from "../snippet/MeshDescSnippet";
import type { MaterialPhongDescSnippet } from "../snippet/MaterialPhongSnippet";
import type { StorageArrayU32Snippet } from "../snippet/StorageArrayU32Snippet";
import type { StorageIndexSnippet } from "../snippet/StorageIndexSnippet";
import type { PointLightSnippet } from "../snippet/PointLightSnippet";
import type { Texture2DArraySnippet } from "../snippet/Texture2DArraySnippet";
import type { TextureSamplerSnippet } from "../snippet/TextureSamplerSnippet";
import { RenderComponent } from "../RenderComponen";

/**
 * 
 */
class MeshPhongBindlessComponent extends RenderComponent {

    private debugSnippet: DebugSnippet;
    private fragmentSnippet: FragmentDescSnippet;
    private vertexSnippet: VertexSnippet;
    private viewProjectionSnippet: ViewProjectionSnippet;
    private viewSnippet: ViewSnippet;
    private instanceDescSnippet: InstanceDescSnippet;
    private meshDescSnippet: MeshDescSnippet;
    private materialPhongSnippet: MaterialPhongDescSnippet;
    private instanceOrderSnippet: StorageArrayU32Snippet;
    private pointLightSnippet: PointLightSnippet;
    private materialTexture2DArraySnippet: Texture2DArraySnippet;
    private textureSamplerSnippet: TextureSamplerSnippet;

    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        fragmentSnippet: FragmentDescSnippet,
        vertexSnippet: VertexSnippet,
        viewProjectionSnippet: ViewProjectionSnippet,
        viewSnippet: ViewSnippet,
        instanceDescSnippet: InstanceDescSnippet,
        meshDescSnippet: MeshDescSnippet,
        materialPhongSnippet: MaterialPhongDescSnippet,
        instanceOrderSnippet: StorageArrayU32Snippet,
        pointLightSnippet: PointLightSnippet,
        materialTexture2DArraySnippet: Texture2DArraySnippet,
        textureSamplerSnippet: TextureSamplerSnippet
    ) {
        super(context, compiler);
        this.debugSnippet = debugSnippet;
        this.fragmentSnippet = fragmentSnippet;
        this.vertexSnippet = vertexSnippet;
        this.viewProjectionSnippet = viewProjectionSnippet;
        this.viewSnippet = viewSnippet;
        this.instanceDescSnippet = instanceDescSnippet;
        this.meshDescSnippet = meshDescSnippet;
        this.materialPhongSnippet = materialPhongSnippet;
        this.instanceOrderSnippet = instanceOrderSnippet;
        this.pointLightSnippet = pointLightSnippet;
        this.materialTexture2DArraySnippet = materialTexture2DArraySnippet;
        this.textureSamplerSnippet = textureSamplerSnippet;
        this.append(debugSnippet);
        this.append(fragmentSnippet);
        this.append(vertexSnippet);
        this.append(viewProjectionSnippet);
        this.append(viewSnippet);
        this.append(instanceDescSnippet);
        this.append(meshDescSnippet);
        this.append(materialPhongSnippet);
        this.append(instanceOrderSnippet);
        this.append(pointLightSnippet);
        this.append(materialTexture2DArraySnippet);
        this.append(textureSamplerSnippet);
    }

    build(): string {
        let renderCode = super.build();
        renderCode += `

        @vertex
        fn vs_main(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> {0}
        {
            var f: ${this.fragmentSnippet.getStructName()};
            let v: VERTEX = ${this.vertexSnippet.getVariableName()}[vi];
            let instance_index_order = ${this.instanceOrderSnippet.getVariableName()}[ii];
            let instance = ${this.instanceDescSnippet.getVariableName()}[instance_index_order];
            let mat4 = ${this.viewProjectionSnippet.getVariableName()}.projection * ${this.viewProjectionSnippet.getVariableName()}.view * instance.model;
            let position = vec4<f32>(v.px, v.py, v.pz, 1.0);
            f.position = mat4 * position;
            f.position_ws = instance.model * position;
            f.normal_ws = vec3<f32>(v.nx, v.ny, v.nz);
            f.triangle_id = vi;
	        f.instance_id = instance_index_order;
	        f.uv = vec2<f32>(v.u, v.v);
            return f;
        }

        @fragment
        fn fs_main(input: ${this.fragmentSnippet.getStructName()})->@location(0) vec4<f32>
        {
	        let instance = ${this.instanceDescSnippet.getVariableName()}[input.instance_id];
	        let mesh_id = instance.mesh_id;
	        let material_id = ${this.meshDescSnippet.getVariableName()}[mesh_id].material_id;
	        let material = ${this.materialPhongSnippet.getVariableName()}[material_id];

	        // ambient
	        var ambient: f32 = 0.2;

	        // diffuse
	        let light_dir = normalize(${this.pointLightSnippet.getVariableName()}.position - input.position_ws.xyz);
	        let diffuse_factor =max(dot(input.normal_ws, light_dir),0.0);
            let diffuse: vec3<f32> = (diffuse_factor + ambient) * textureSample(${this.materialTexture2DArraySnippet.getVariableName()}, ${this.textureSamplerSnippet.getVariableName()}, input.uv, material.diffuse_texture_id).rgb * ${this.pointLightSnippet.getVariableName()}.color;

	        // specular
	        let view_dir = normalize(${this.viewSnippet.getVariableName()}.camera_position.xyz - input.position_ws.xyz);
	        let reflect_dir: vec3<f32> = reflect(-light_dir, input.normal_ws);
	        let shininess: f32 = 32.0f;
	        let spec: f32 = pow(max(dot(view_dir, reflect_dir), 0.0), shininess);
	        let specular: vec3<f32> = textureSample(${this.materialTexture2DArraySnippet.getVariableName()}, ${this.textureSamplerSnippet.getVariableName()}, input.uv, material.specular_texture_id).rgb * spec * ${this.pointLightSnippet.getVariableName()}.color;  
	
	        // emissive
	        // var emissive:vec3<f32> = textureSample(${this.materialTexture2DArraySnippet.getVariableName()}, ${this.textureSamplerSnippet.getVariableName()}, input.uv, material.emissive_texture_id).rgb;	

	        // shading
	        let color = ambient + diffuse + specular;

	        // let color3 = textureSample(${this.materialTexture2DArraySnippet.getVariableName()}, ${this.textureSamplerSnippet.getVariableName()}, input.uv, material.diffuse_texture_id).rgb;
            return vec4<f32>(color, 1.0);
        }
        
        `;

        return renderCode;
    }

}

export {
    MeshPhongBindlessComponent
}

