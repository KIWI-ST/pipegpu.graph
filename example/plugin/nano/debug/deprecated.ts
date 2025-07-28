// vertex buffer.
const vertexBuffer: StorageBuffer = compiler.createStorageBuffer({
    totalByteLength: meshletPackData.vertices.byteLength,
    rawData: [meshletPackData.vertices],
});

// view projection buffer.
let viewProjectionBuffer: UniformBuffer;
// 行主序投影矩阵
let projectionMatrix = new Cesium.Matrix4();
// 行主序视图矩阵
let viewMatrix = new Cesium.Matrix4();
{
    const handler: Handle1D = () => {
        // cesium 默认是列主序，需转换成行主序交给 webgpu
        let projectionData: number[] = [];
        Cesium.Matrix4.transpose(SCENE_CAMERA.frustum.projectionMatrix, projectionMatrix);
        Cesium.Matrix4.toArray(projectionMatrix, projectionData);

        let viewData: number[] = [];
        Cesium.Matrix4.transpose(SCENE_CAMERA.viewMatrix, viewMatrix);
        Cesium.Matrix4.toArray(viewMatrix, viewData);

        const rawDataArr = [...projectionData, ...viewData];
        const rawDataF32 = new Float32Array(rawDataArr);
        return {
            rewrite: true,
            detail: {
                offset: 0, // gpu offset
                size: 32,
                byteLength: 32 * 4,
                rawData: rawDataF32,
            }
        }
    };
    viewProjectionBuffer = compiler.createUniformBuffer({
        totalByteLength: 128,
        handler: handler,
    });
}

// instance order buffer.
const instanceOrderBuffer: StorageBuffer = compiler.createStorageBuffer({
    totalByteLength: 4,
    rawData: [new Uint32Array([0])],
});

// mesh desc buffer.
let meshDescBuffer: StorageBuffer;
{
    const bufferView = new ArrayBuffer(80);
    const f32view = new Float32Array(bufferView, 0, 4);
    const u32View = new Uint32Array(bufferView, f32view.byteLength, 4);
    f32view.set([
        meshletPackData.sphereBound.cx,
        meshletPackData.sphereBound.cy,
        meshletPackData.sphereBound.cz,
        meshletPackData.sphereBound.r
    ]);
    u32View.set([
        0,
        0,
        meshletPackData.meshlets.length,
        0
    ]);
    meshDescBuffer = compiler.createStorageBuffer({
        totalByteLength: 80,
        rawData: [bufferView as any],
    });
}

// model matrix
const spacePosition = Cesium.Cartesian3.fromDegrees(lng, lat, 0);
const locationMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(spacePosition);
let modelMatrix = new Cesium.Matrix4();
Cesium.Matrix4.transpose(locationMatrix, modelMatrix);

// instance desc buffer.
let instanceDescBuffer: StorageBuffer;
{
    const instanceMatrix = Cesium.Matrix4.IDENTITY.clone();

    // Cesium.Matrix4.transpose(
    //     Cesium.Matrix4.fromArray([
    //         0.009999999776482582,
    //         0.0,
    //         0.0,
    //         0.0,
    //         0.0,
    //         -4.3711387287537207e-10,
    //         -0.009999999776482582,
    //         0.0,
    //         0.0,
    //         0.009999999776482582,
    //         -4.3711387287537207e-10,
    //         0.0,
    //         0.0,
    //         0.0,
    //         0.0,
    //         1.0
    //     ]),
    //     instanceMatrix,
    // )

    const bufferView = new ArrayBuffer(80);
    const f32view = new Float32Array(bufferView, 0, 16);
    const u32View = new Float32Array(bufferView, f32view.byteLength, 1);

    let locationInstanceMatrix = new Cesium.Matrix4();
    Cesium.Matrix4.multiply(locationMatrix, instanceMatrix, locationInstanceMatrix);

    let mat4x4 = new Cesium.Matrix4();
    Cesium.Matrix4.transpose(locationInstanceMatrix, mat4x4);

    let mat4x4Data: number[] = [];
    Cesium.Matrix4.toArray(mat4x4, mat4x4Data);

    f32view.set(mat4x4Data);
    u32View.set([0]);
    instanceDescBuffer = compiler.createStorageBuffer({
        totalByteLength: 80,
        rawData: [bufferView as any],
    });
}

// indexed storage buffer
let indexedStorageBuffer: IndexedStorageBuffer;
{
    let byteLength: number = 0;
    const indexData: any[] = [];
    meshletPackData.meshlets.forEach(meshlet => {
        byteLength += meshlet.indices.byteLength;
        indexData.push(new Uint32Array(meshlet.indices));
    });
    indexedStorageBuffer = compiler.createIndexedStorageBuffer({
        totalByteLength: byteLength,
        rawData: indexData,
        // totalByteLength: meshletPackData.meshlets[0].indices.byteLength,
        // rawData: [new Uint32Array(meshletPackData.meshlets[0].indices)]
    });
}

let indexedIndirectBuffer: IndexedIndirectBuffer;
{
    let byteLength: number = 20 * meshletPackData.meshlets.length;
    const diibs: any[] = [];
    let offset: number = 0;
    meshletPackData.meshlets.forEach(meshlet => {
        const diib = new Uint32Array([
            meshlet.indices.length,
            1,
            offset,
            0,
            0
        ]);
        diibs.push(diib);
        offset += meshlet.indices.length;
    });
    indexedIndirectBuffer = compiler.createIndexedIndirectBuffer({
        totalByteLength: byteLength,
        rawData: diibs,
    });
}

let indirectDrawCountBuffer = compiler.createStorageBuffer({
    totalByteLength: 4,
    bufferUsageFlags: GPUBufferUsage.INDIRECT,
    rawData: [new Uint32Array([meshletPackData.meshlets.length])],
});

// color attachment
const surfaceTexture = compiler.createSurfaceTexture2D();
const surfaceColorAttachment = compiler.createColorAttachment({
    texture: surfaceTexture,
    blendFormat: 'opaque',
    colorLoadStoreFormat: 'clearStore',
    clearColor: [0.0, 0.0, 0.0, 1.0]
});

const colorAttachments: ColorAttachment[] = [surfaceColorAttachment];

// depth stencil attachment
const depthTexture = compiler.createTexture2D({
    width: ctx.getViewportWidth(),
    height: ctx.getViewportHeight(),
    textureFormat: ctx.getPreferredDepthTexuteFormat(),
});

const depthStencilAttachment = compiler.createDepthStencilAttachment({
    texture: depthTexture,
    depthCompareFunction: 'less-equal',
    depthLoadStoreFormat: 'clearStore',
});

let dispatch: RenderProperty = new RenderProperty(
    indexedStorageBuffer,
    indexedIndirectBuffer,
    indirectDrawCountBuffer,
    meshletPackData.meshlets.length
);

const WGSLCode = `

struct DEBUG
{
    m0: vec4<f32>,
    m1: vec4<f32>,
    m2: vec4<f32>,
    m3: vec4<f32>,
}; 

@group(0) @binding(0) var<storage, read_write> debug : DEBUG;

struct FRAGMENT
{

    @builtin(position) position:vec4<f32>,
    @location(0) @interpolate(flat) pack_id: u32,
    @location(1) position_ws: vec4<f32>,                // ws = world space
    @location(2) normal_ws: vec3<f32>,                  // ws = world space
    @location(3) uv:vec2<f32>,
    @location(4) @interpolate(flat) instance_id: u32,
    @location(5) @interpolate(flat) meshlet_id: u32,
    @location(6) @interpolate(flat) triangle_id: u32,
    @location(7) @interpolate(flat) need_discard: u32,

    // @location(8) @interpolate(flat) m0: vec4<f32>,      // for debug
    // @location(9) @interpolate(flat) m1: vec4<f32>,      // for debug
    // @location(10) @interpolate(flat) m2: vec4<f32>,     // for debug
    // @location(11) @interpolate(flat) m3: vec4<f32>,     // for debug

};
    
struct VERTEX
{
    px: f32,
    py: f32,
    pz: f32,
    nx: f32,
    ny: f32,
    nz: f32,
    tx: f32,
    ty: f32,
};

@group(0) @binding(1) var<storage, read> vertex_arr: array<VERTEX>;

struct VIEW_PROJECTION
{
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

@group(0) @binding(2) var<uniform> view_projection: VIEW_PROJECTION;

struct INSTANCE_DESC
{
    model: mat4x4<f32>,
    mesh_id: u32,
};

@group(0) @binding(3) var<storage, read> instance_desc_arr: array<INSTANCE_DESC>;

struct MESH_DESC
{
    bounding_sphere:vec4<f32>,
    vertex_offset: u32,
    mesh_id: u32,
    meshlet_count: u32,
    material_id: u32,
};

@group(0) @binding(4) var<storage, read> mesh_desc_arr: array<MESH_DESC>;

@group(0) @binding(5) var<storage, read> storage_arr_u32: array<u32>;

@vertex
fn vs_main(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> FRAGMENT
{
    var f: FRAGMENT;
    let v: VERTEX = vertex_arr[vi];
    let instance_index_order = storage_arr_u32[ii];
    let instance = instance_desc_arr[instance_index_order];

    // let mat4 = view_projection.projection * view_projection.view * instance.model;
    // let mat4 = view_projection.projection * view_projection.view;

    let position = vec4<f32>(v.px, v.py, v.pz, 1.0);

    f.position_ws = instance.model * position;
    f.normal_ws = vec3<f32>(v.nx, v.ny, v.nz);
    f.triangle_id = vi;
    f.instance_id = instance_index_order;
    f.uv = vec2<f32>(v.tx, v.ty);
    f.position = position * instance.model * view_projection.view *  view_projection.projection;
    
    // f.m0 = vec4<f32>(
    //     MVPMatrix[0][0], 
    //     MVPMatrix[0][1], 
    //     MVPMatrix[0][2], 
    //     MVPMatrix[0][3], 
    // );
    // f.m1 = vec4<f32>(
    //     MVPMatrix[1][0], 
    //     MVPMatrix[1][1], 
    //     MVPMatrix[1][2], 
    //     MVPMatrix[1][3], 
    // );
    // f.m2 = vec4<f32>(
    //     MVPMatrix[2][0], 
    //     MVPMatrix[2][1], 
    //     MVPMatrix[2][2], 
    //     MVPMatrix[2][3], 
    // );
    // f.m3 = vec4<f32>(
    //     MVPMatrix[3][0], 
    //     MVPMatrix[3][1], 
    //     MVPMatrix[3][2], 
    //     MVPMatrix[3][3], 
    // );

    return f;
}

@fragment
fn fs_main(f: FRAGMENT)->@location(0) vec4<f32>
{
    debug.m0 = vec4<f32>(f32(f.triangle_id), f32(f.instance_id), f.uv.x, f.uv.y);
    // debug.m1 = f.m1;
    // debug.m2 = f.m2;
    // debug.m3 = f.m3;

    let instance = instance_desc_arr[f.instance_id];
    let mesh_id = instance.mesh_id;
    // f32(f.instance_id)/2000.0
    return vec4<f32>(f.uv.x, f.uv.y, f32(f.triangle_id), 1.0);
}

    `;

let desc: RenderHolderDesc = {
    label: '[DEMO][render]',
    vertexShader: compiler.createVertexShader({
        code: WGSLCode,
        entryPoint: "vs_main"
    }),
    fragmentShader: compiler.createFragmentShader({
        code: WGSLCode,
        entryPoint: "fs_main"
    }),
    attributes: new Attributes(),
    uniforms: new Uniforms(),
    dispatch: dispatch,
    colorAttachments: colorAttachments,
    depthStencilAttachment: depthStencilAttachment,
    primitiveDesc: {
        primitiveTopology: 'triangle-list'
        // cullFormat: 'backCW',
    }
};

desc.uniforms?.assign(`debug`, debugBuffer);
desc.uniforms?.assign(`vertex_arr`, vertexBuffer);
desc.uniforms?.assign(`view_projection`, viewProjectionBuffer);
desc.uniforms?.assign(`storage_arr_u32`, instanceOrderBuffer);
desc.uniforms?.assign(`instance_desc_arr`, instanceDescBuffer);
desc.uniforms?.assign(`mesh_desc_arr`, meshDescBuffer);