import type { Compiler, Context } from "pipegpu";
import { ComputeComponent } from "../ComputerComponen";
import type { DebugSnippet } from "../snippet/DebugSnippet";
import type { ViewProjectionSnippet } from "../snippet/ViewProjectionSnippet";
import type { ViewPlaneSnippet } from "../snippet/ViewPlaneSnippet";
import type { ViewSnippet } from "../snippet/ViewSnippet";
import type { Texture2DSnippet } from "../snippet/Texture2DSnippet";
import type { MeshDescSnippet } from "../snippet/MeshDescSnippet";
import type { InstanceDescSnippet } from "../snippet/InstanceDescSnippet";
import type { StorageArrayU32Snippet } from "../snippet/StorageArrayU32Snippet";
import type { StorageAtomicU32Snippet } from "../snippet/StorageAtomicU32Snippet";

/**
 * 
 * instance culling:
 * - mesh frustum culling
 * - mesh occlusion culling
 * 
 */
class CullingInstanceComponent extends ComputeComponent {
    /**
     * 
     */
    debugSnippet: DebugSnippet;

    /**
     * 
     */
    viewProjectionSnippet: ViewProjectionSnippet;

    /**
     * 
     */
    viewPlaneSnippet: ViewPlaneSnippet;

    /**
     * 
     */
    viewSnippet: ViewSnippet;

    /**
     * 
     */
    hzbTextureSnippet: Texture2DSnippet;

    /**
     * 
     */
    meshDescSnippet: MeshDescSnippet;

    /**
     * 
     */
    instanceDescSnippet: InstanceDescSnippet;

    /**
     * 
     */
    instanceOrderSnippet: StorageArrayU32Snippet;

    /**
     * 
     */
    instanceCountSnippet: StorageAtomicU32Snippet;

    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        viewProjectionSnippet: ViewProjectionSnippet,
        viewPlaneSnippet: ViewPlaneSnippet,
        viewSnippet: ViewSnippet,
        hzbTextureSnippet: Texture2DSnippet,
        meshDescSnippet: MeshDescSnippet,
        instanceDescSnippet: InstanceDescSnippet,
        instanceOrderSnippet: StorageArrayU32Snippet,
        instanceCountSnippet: StorageAtomicU32Snippet
    ) {
        super(context, compiler);
        this.debugSnippet = debugSnippet;
        this.viewProjectionSnippet = viewProjectionSnippet;
        this.viewPlaneSnippet = viewPlaneSnippet;
        this.viewSnippet = viewSnippet;
        this.hzbTextureSnippet = hzbTextureSnippet;
        this.meshDescSnippet = meshDescSnippet;
        this.instanceDescSnippet = instanceDescSnippet;
        this.instanceOrderSnippet = instanceOrderSnippet;
        this.instanceCountSnippet = instanceCountSnippet;
        this.append(this.debugSnippet);
        this.append(this.viewProjectionSnippet);
        this.append(this.viewPlaneSnippet);
        this.append(this.viewSnippet);
        this.append(this.hzbTextureSnippet);
        this.append(this.meshDescSnippet);
        this.append(this.instanceDescSnippet);
        this.append(this.instanceOrderSnippet);
        this.append(this.instanceCountSnippet);
        this.workGroupSize = [1, 1, 1];
    }

    private instanceOcclusionCullingCode = (): string => {

        // TODO:: only support perspective camera
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
    let levels = u32(textureNumLevels(texture));
    return clamp(level, 0u, levels - 1u);   
}

fn ShpereAABB(projection: mat4x4<f32>, center_view_space: vec3<f32>, r: f32) -> vec4<f32>
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
    let min_y = (vy * c.y - cr.z) / (vy * c.z + cr.y);
    let max_y = (vy * c.y + cr.z) / (vy * c.z - cr.y);

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
    let point_array: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
        vec2<f32>(aabb.x, aabb.y),
        vec2<f32>(aabb.x, aabb.w),
        vec2<f32>(aabb.z, aabb.y),
        vec2<f32>(aabb.z, aabb.w)
    );
    var depth: f32 = textureLoad(texture, vec2<u32>(point_array[0] * mip_size.xy), level).x;
    for (var k = 1; k < 4; k++) {
        let point: vec2<u32> = vec2<u32>(point_array[k] * mip_size.xy);
        let d: f32 = textureLoad(texture, point, level).x;
        depth = max(d, depth);    
    }
    return depth;
}

fn IsPassOcclusion(view_projection: ${this.viewProjectionSnippet.getStructName()}, model: mat4x4<f32>, bounding_sphere: vec4<f32>) -> bool
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
    let aabb_level: u32 = AABBMipLevel(aabb, ${this.viewSnippet.getVariableName()}.viewport_width, ${this.viewSnippet.getVariableName()}.viewport_height);
    let level: u32 = Clamp2MipLevels(aabb_level, ${this.hzbTextureSnippet.getVariableName()});
    let depth: f32 = PickDetph(aabb, ${this.hzbTextureSnippet.getVariableName()}, level);
    let linear_depth = LinearizeDepth(depth);

    return closest_point_z <= linear_depth;
}

`
    }

    private instanceFrustumCullingCode = (): string => {
        // force left hand coordinate
        return `

fn IsPassFrustum(planes: array<vec4<f32>, 6>, model: mat4x4<f32>, bounding_sphere: vec4<f32>) ->bool
{
    /////////////////////////////////////DEBUG-START///////////////////////////////////////
    // ${this.debugSnippet.getVariableName()}[0].b = f32(bounding_sphere.w);
    // ${this.debugSnippet.getVariableName()}[0].b = f32(instance.model[0][0]);
    // ${this.debugSnippet.getVariableName()}[0].b = model[0][0]; // planes[0].x;
    // ${this.debugSnippet.getVariableName()}[0].c = model[1][1]; // planes[0].y;
    // ${this.debugSnippet.getVariableName()}[0].d = model[2][2]; //planes[0].z;
    // ${this.debugSnippet.getVariableName()}[0].e = planes[0].w;
    // ${this.debugSnippet.getVariableName()}[0].g = f32(${this.meshDescSnippet.getVariableName()}[mesh_id].bounding_sphere.w);
    /////////////////////////////////////DEBUG-END////////////////////////////////////////

    let s: f32 = max(max(abs(model[0][0]), abs(model[1][1])), abs(model[2][2]));
    let r: f32 = bounding_sphere.w * s;
    let c: vec4<f32> = model * vec4<f32>(bounding_sphere.xyz, 1.0);
    for(var k = 0; k < 6; k ++) {
        if(dot(c, planes[k]) > r) {
            return false;
        }
    }
    return true;
}

    `;
    }

    override build(): string {
        let wgslCode = super.build();
        wgslCode += this.instanceOcclusionCullingCode();
        wgslCode += this.instanceFrustumCullingCode();
        wgslCode += `
        
@compute @workgroup_size(${this.workGroupSize[0]}, ${this.workGroupSize[1]}, ${this.workGroupSize[2]})
fn cp_main(@builtin(global_invocation_id) global_index: vec3<u32>)
{

    let instance_id = global_index.x;
    let instance_num = arrayLength(&${this.instanceDescSnippet.getVariableName()});
    if(instance_id >= instance_num) {
        return;
    }

    let instance = ${this.instanceDescSnippet.getVariableName()}[instance_id];
    let mesh_id = instance.mesh_id;
    let mesh = ${this.meshDescSnippet.getVariableName()}[mesh_id];

    let model: mat4x4<f32> = instance.model;
    let bounding_sphere: vec4<f32> = mesh.bounding_sphere;

    // REAL::
    if(IsPassFrustum(${this.viewPlaneSnippet.getVariableName()}, model, bounding_sphere) && IsPassOcclusion(${this.viewProjectionSnippet.getVariableName()}, model, bounding_sphere)) {
        let index: u32 = atomicAdd(&${this.instanceCountSnippet.getVariableName()}, 1u);
        ${this.instanceOrderSnippet.getVariableName()}[index] = instance_id;
    }

    /////////////////////////////////////DEBUG-START///////////////////////////////////////
    // ${this.debugSnippet.getVariableName()}[0].a = f32(mesh_id);    // bounding_sphere.x;
    // ${this.debugSnippet.getVariableName()}[0].b = f32(instance.model[0][0]);
    // ${this.debugSnippet.getVariableName()}[0].c = f32(${this.meshDescSnippet.getVariableName()}[mesh_id].meshlet_count);
    // ${this.debugSnippet.getVariableName()}[0].d = f32(${this.meshDescSnippet.getVariableName()}[1].bounding_sphere.x);
    // ${this.debugSnippet.getVariableName()}[0].e = f32(${this.meshDescSnippet.getVariableName()}[1].bounding_sphere.y);
    // ${this.debugSnippet.getVariableName()}[0].f = f32(${this.meshDescSnippet.getVariableName()}[1].bounding_sphere.z);
    // ${this.debugSnippet.getVariableName()}[0].g = f32(${this.meshDescSnippet.getVariableName()}[1].bounding_sphere.w);
    // ${this.debugSnippet.getVariableName()}[0].a = f32(atomicLoad(&${this.instanceCountSnippet.getVariableName()}));
    /////////////////////////////////////DEBUG-END///////////////////////////////////////

}

        `;

        return wgslCode;
    }

}

export {
    CullingInstanceComponent
}