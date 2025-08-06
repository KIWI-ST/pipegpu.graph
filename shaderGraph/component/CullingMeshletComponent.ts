import type { Compiler, Context } from "pipegpu";
import { ComputeComponent } from "../ComputerComponen";
import type { DebugSnippet } from "../snippet/DebugSnippet";
import type { ViewProjectionSnippet } from "../snippet/ViewProjectionSnippet";
import type { ViewPlaneSnippet } from "../snippet/ViewPlaneSnippet";
import type { ViewSnippet } from "../snippet/ViewSnippet";
import type { Texture2DSnippet } from "../snippet/Texture2DSnippet";
import type { MeshDescSnippet } from "../snippet/MeshDescSnippet";
import type { MeshletDescSnippet } from "../snippet/MeshletSnippet";
import type { InstanceDescSnippet } from "../snippet/InstanceDescSnippet";
import type { StorageArrayU32Snippet } from "../snippet/StorageArrayU32Snippet";
import type { StorageU32Snippet } from "../snippet/StorageU32Snippet";
import type { StorageAtomicU32Snippet } from "../snippet/StorageAtomicU32Snippet";
import type { StorageVec2U32Snippet } from "../snippet/StorageVec2U32Snippet";
import type { IndirectSnippet } from "../snippet/IndirectSnippet";

class CullingMeshletComponent extends ComputeComponent {

    debugSnippet: DebugSnippet;
    viewProjectionSnippet: ViewProjectionSnippet;
    viewPlaneSnippet: ViewPlaneSnippet;
    viewSnippet: ViewSnippet;
    hzbTextureSnippet: Texture2DSnippet;
    meshDescSnippet: MeshDescSnippet;
    meshletDescSnippet: MeshletDescSnippet;
    instanceDescSnippet: InstanceDescSnippet;
    instanceOrderSnippet: StorageArrayU32Snippet;
    instanceCountSnippet: StorageU32Snippet;
    meshletCountSnippet: StorageAtomicU32Snippet;
    runtimeMeshletMapSnippet: StorageVec2U32Snippet;
    indirectSnippet: IndirectSnippet;

    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        viewProjectionSnippet: ViewProjectionSnippet,
        viewPlaneSnippet: ViewPlaneSnippet,
        viewSnippet: ViewSnippet,
        hzbTextureSnippet: Texture2DSnippet,
        meshDescSnippet: MeshDescSnippet,
        meshletDescSnippet: MeshletDescSnippet,
        instanceDescSnippet: InstanceDescSnippet,
        instanceOrderSnippet: StorageArrayU32Snippet,
        instanceCountSnippet: StorageU32Snippet,
        meshletCountSnippet: StorageAtomicU32Snippet,
        runtimeMeshletMapSnippet: StorageVec2U32Snippet,
        indirectSnippet: IndirectSnippet
    ) {
        super(context, compiler);

        this.debugSnippet = debugSnippet;
        this.viewProjectionSnippet = viewProjectionSnippet;
        this.viewPlaneSnippet = viewPlaneSnippet;
        this.viewSnippet = viewSnippet;
        this.hzbTextureSnippet = hzbTextureSnippet;
        this.meshDescSnippet = meshDescSnippet;
        this.meshletDescSnippet = meshletDescSnippet;
        this.instanceDescSnippet = instanceDescSnippet;
        this.instanceOrderSnippet = instanceOrderSnippet;
        this.instanceCountSnippet = instanceCountSnippet;
        this.meshletCountSnippet = meshletCountSnippet;
        this.runtimeMeshletMapSnippet = runtimeMeshletMapSnippet;
        this.indirectSnippet = indirectSnippet;

        this.append(this.debugSnippet);
        this.append(this.viewProjectionSnippet);
        this.append(this.viewPlaneSnippet);
        this.append(this.viewSnippet);
        this.append(this.hzbTextureSnippet);
        this.append(this.meshDescSnippet);
        this.append(this.meshletDescSnippet);
        this.append(this.instanceDescSnippet);
        this.append(this.instanceOrderSnippet);
        this.append(this.meshletCountSnippet);
        this.append(this.runtimeMeshletMapSnippet);
        this.append(this.indirectSnippet);

        this.workGroupSize = [1, 1, 1];
    }

    private meshletBoundsCullingCode = (): string => {
        return `
        
fn IsPassBoundsError(view: ${this.viewSnippet.getStructName()}, meshlet: ${this.meshletDescSnippet.getStructName()}) ->bool
{
    let camera_position: vec4<f32> = view.camera_position;
    let factor: f32 = view.camera_vertical_scaling_factor * 0.5;
    let znear: f32 = view.near_plane;
    let threshold: f32 = view.pixel_threshold;

    let self_dx: f32 = meshlet.self_bounding_sphere.x - camera_position.x;
    let self_dy: f32 = meshlet.self_bounding_sphere.y - camera_position.y;
    let self_dz: f32 = meshlet.self_bounding_sphere.z - camera_position.z;
    let self_d: f32 = sqrt(self_dx * self_dx + self_dy * self_dy + self_dz * self_dz) - meshlet.self_bounding_sphere.w;

    var self_err: f32;
    var parent_err: f32;

    if(self_d > znear) {
        self_err = meshlet.self_error / self_d * factor;
    } else {
        self_err = meshlet.self_error / znear * factor;
    }

    let parent_dx: f32 = meshlet.parent_bounding_sphere.x - camera_position.x;
    let parent_dy: f32 = meshlet.parent_bounding_sphere.y - camera_position.y;
    let parent_dz: f32 = meshlet.parent_bounding_sphere.z - camera_position.z;
    let parent_d: f32 = sqrt(parent_dx * parent_dx + parent_dy * parent_dy + parent_dz * parent_dz) - meshlet.parent_bounding_sphere.w;

    if(parent_d > znear) {
        parent_err = meshlet.parent_error / parent_d * factor;
    } else {
        parent_err = meshlet.parent_error / znear * factor;
    }

    return self_err <= threshold && parent_err > threshold;
}
        
        `;
    }


    private meshletFrustumCullingCode = (): string => {
        // force left hand
        return `

fn IsPassFrustum(planes: array<vec4<f32>, 6>, model: mat4x4<f32>, bounding_sphere: vec4<f32>) ->bool
{
    let r: f32 = bounding_sphere.w;
    let c: vec4<f32> = model * vec4<f32>(bounding_sphere.xyz, 1.0);
    for(var k = 0; k < 6; k++) {
        if(dot(c, planes[k]) < -r) {
            return false;
        }
    }
    return true;
}
        
        `;
    }


    private meshletOcclusionCullingCode = (): string => {
        return `
        
fn LinearizeDepth(depth: f32) -> f32
{
    let near = ${this.viewSnippet.getVariableName()}.near_plane;
    let far = ${this.viewSnippet.getVariableName()}.far_plane;
    let d2 = near * far / (far + (near - far) * depth);
    return d2; // remove adjust value to: [0, 1] by 1.0 - d2 / (far - near);
}

fn Clamp2MipLevels(level: u32, texture: texture_2d<f32>) -> u32
{
    let levels =u32(textureNumLevels(texture));
    return clamp(level, 0u, levels - 1u);
}

fn ShpereAABB(projection: mat4x4<f32>, center_view_space: vec3<f32> , r: f32) -> vec4<f32>
{
    // WARNING: This code only works for perspective camera
    // 0: perspective; 1: orthography. 
    // minx, miny, maxx, maxy
    var aabb = vec4<f32>(0.0, 0.0, 0.0, 0.0);

    // use left hand, webgpu coordinate
    let c = vec3f(center_view_space.xy, -center_view_space.z);
    let cr = c * r;
    let czr2 = c.z * c.z - r * r;

    let vx = sqrt(c.x * c.x + czr2);
    let min_x = (vx * c.x - cr.z) / (vx * c.z + cr.x);
    let max_x = (vx * c.x + cr.z) / (vx * c.z - cr.x);

    let vy = sqrt(c.y * c.y + czr2);
    let min_y = (vy * c.y - cr.z) / ( vy * c.z + cr.y );
    let max_y = (vy * c.y +  cr.z) / (vy * c.z - cr.y);

    let p00 = projection[0][0];
    let p11 = projection[1][1];
    aabb = vec4(min_x * p00, min_y * p11, max_x * p00, max_y * p11);
    aabb = aabb.xwzy * vec4(0.5, -0.5, 0.5, -0.5) + vec4(0.5);

    return aabb;
}

fn AABBMipLevel(aabb: vec4<f32>, viewport_x: f32, viewport_y: f32) -> u32
{
    let pixel_span_w: f32 = abs(aabb.z - aabb.x) * viewport_x;
    let pixel_span_h: f32 = abs(aabb.w - aabb.y) * viewport_y;
    let pixel_span: f32 = max(pixel_span_w, pixel_span_h) / 2.0;
    let level: u32 = u32(ceil(log2(pixel_span)));
    return level;
}

fn PickDetph(aabb: vec4<f32>, texture: texture_2d<f32>, level: u32) -> f32
{
    let mip_size = vec2f(textureDimensions(texture, level));
    let point_array: array<vec2<f32>, 4> =  array<vec2<f32>, 4>(
        vec2<f32>(aabb.x, aabb.y),
        vec2<f32>(aabb.x, aabb.w),
        vec2<f32>(aabb.z, aabb.y),
        vec2<f32>(aabb.z, aabb.w)
    );
    var depth: f32 = textureLoad(texture, vec2<u32>(point_array[0] * mip_size.xy), level).x;
    for(var k = 1; k< 4; k++) {{
        let point: vec2<u32> = vec2<u32>(point_array[k] * mip_size.xy);
        let d: f32 = textureLoad(texture, point, level).x;
        depth = max(d, depth);
    }}
    return depth;
}

fn IsPassOcclusion(view_projection: ${this.viewProjectionSnippet.getStructName()}, model:  mat4x4<f32>, bounding_sphere: vec4<f32>) -> bool 
{
    let CLOSE_RANGE_NEAR_CAMERA: f32 = 4.0;
    let center = view_projection.view * model * vec4<f32>(bounding_sphere.xyz, 1.0);
    let r = bounding_sphere.w;
    let closest_point_z = abs(center.z) - r;
    let z_near: f32 = ${this.viewSnippet.getVariableName()}.near_plane;

    // close to near plane always visible
    if (closest_point_z < z_near + CLOSE_RANGE_NEAR_CAMERA) {
        return true;
    }
               
    // - mip level. If meshlet spans 50px, we round it to 64px and then sample log2(64) = 6 mip.
    // - calc span in fullscreen, and pyramid level 0 is half.
    // - add extra 1 level.
    let aabb: vec4<f32> = ShpereAABB(view_projection.projection, center.xyz, r);
    let aabb_level: u32 = AABBMipLevel(aabb, view.viewport_width, view.viewport_height);
    let level: u32 = Clamp2MipLevels(aabb_level, ${this.hzbTextureSnippet.getVariableName()});

    let depth: f32 = PickDetph(aabb, ${this.hzbTextureSnippet.getVariableName()}, level);
    let linear_depth = LinearizeDepth(depth);

    return closest_point_z <= linear_depth;
}
    `;
    }

    override build(): string {
        let wgslCode = super.build();
        wgslCode += this.meshletBoundsCullingCode();
        wgslCode += this.meshletFrustumCullingCode();
        wgslCode += this.meshletOcclusionCullingCode();
        wgslCode += `

@compute @workgroup_size(${this.workGroupSize[0]}, ${this.workGroupSize[1]}, ${this.workGroupSize[2]})
fn cp_main(@builtin(global_invocation_id) global_index: vec3<u32>)
{
    let instance_index = global_index.x;
    if(instance_index >= ${this.instanceCountSnippet.getVariableName()}) {
        return;
    }

    let instance_id = ${this.instanceOrderSnippet.getVariableName()}[instance_index];
    let instance = ${this.instanceDescSnippet.getVariableName()}[instance_id];
    let mesh_id = instance.mesh_id;
    let mesh = ${this.meshDescSnippet.getVariableName()}[mesh_id];
    let meshlet_id = global_index.y;
    if (meshlet_id >= mesh.meshlet_count) {        
        return;    
    }

    let meshlet = ${this.meshletDescSnippet.getVariableName()}[meshlet_id];
    let model: mat4x4<f32> = instance.model;
    let bounding_sphere: vec4<f32> = meshlet.self_bounding_sphere;

    if (IsPassFrustum(${this.viewPlaneSnippet.getVariableName()}, model, bounding_sphere) && IsPassOcclusion(${this.viewProjectionSnippet.getVariableName()}, model, bounding_sphere) && IsPassBoundsError(${this.viewSnippet.getVariableName()}, meshlet)) {
        let index: u32 = atomicAdd(&${this.meshletCountSnippet.getVariableName()}, 1u);
        ${this.runtimeMeshletMapSnippet.getVariableName()}[index] = vec2<u32>(instance_id, meshlet_id);
        // vertex_count, instance_count, first_vertex, first_instance
        ${this.indirectSnippet.getVariableName()} [index] = ${this.indirectSnippet.getStructName()}(meshlet.index_count, 1, 0, index); 
    }

    //////////////////////////////////////////
    ${this.debugSnippet.getVariableName()}.instance_count = u32(atomicLoad(& ${this.meshletCountSnippet.getVariableName()}));
    ${this.debugSnippet.getVariableName()}.total_instance_count = mesh.meshlet_count;
    //////////////////////////////////////////
}`;

        return wgslCode;
    }

}

export {
    CullingMeshletComponent
}