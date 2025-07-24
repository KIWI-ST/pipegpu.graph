import {
    type RenderHolderDesc, type RenderHolder, type TypedArray1DFormat,
    Compiler,
    RenderProperty,
    ColorAttachment,
    Context,
    Attributes,
    Uniforms,
    IndexedBuffer,
    UniformBuffer,
    StorageBuffer,
    MapBuffer
} from 'pipegpu';

import * as Cesium from 'cesium'

import { OrderedGraph } from '../../../index'
import { VertexSnippet } from '../../../shaderGraph/snippet/VertexSnippet';
import { FragmentDescSnippet } from '../../../shaderGraph/snippet/FragmentDescSnippet';
import { ViewProjectionSnippet } from '../../../shaderGraph/snippet/ViewProjectionSnippet';
import { MeshDescSnippet } from '../../../shaderGraph/snippet/MeshDescSnippet';
import { MaterialSnippet } from '../../../shaderGraph/snippet/MaterialSnippet';
import { Texture2DArraySnippet } from '../../../shaderGraph/snippet/Texture2DArraySnippet';
import { InstanceDescSnippet } from '../../../shaderGraph/snippet/InstanceDescSnippet';
import { StorageArrayU32Snippet } from '../../../shaderGraph/snippet/StorageArrayU32Snippet';
import { StorageIndexSnippet } from '../../../shaderGraph/snippet/StorageIndexSnippet';
import { IndexedIndirectSnippet } from '../../../shaderGraph/snippet/IndexedIndirectSnippet';
import { StorageAtomicU32Snippet } from '../../../shaderGraph/snippet/StorageAtomicU32Snippet';
import { TextureSamplerSnippet } from '../../../shaderGraph/snippet/TextureSamplerSnippet';
import { PointLightSnippet } from '../../../shaderGraph/snippet/PointLightSnippet';
import { ViewSnippet } from '../../../shaderGraph/snippet/ViewSnippet';
import { DebugSnippet } from '../../../shaderGraph/snippet/DebugSnippet';
import { DebugMeshComponent } from '../../../shaderGraph/component/DebugMeshComponent';
import { fetchHDMF, type BoundingSphere, type Material, type MaterialType, type MeshDataPack } from '../../util/fetchHDMF';
import { MeshletDescSnippet } from '../../../shaderGraph/snippet/MeshletSnippet';
import { EarthManager } from './EarthManager';
import { webMercatorTileSchema } from './earth/QuadtreeTileSchema';
import { PSEUDOMERCATOR, WGS84 } from './earth/Ellipsoid';
import { fetchJSON, type Instance, type InstanceDataPack } from '../../util/fetchJSON';
import { fetchKTX2AsBc7RGBA, type KTXPackData } from '../../util/fetchKTX';
import { DebugMeshletComponent } from '../../../shaderGraph/component/DebugMeshletComponent';
import { GLMatrix, Vec4, type Mat4 } from 'pipegpu.matrix';
import { GeodeticCoordinate } from './earth/GeodeticCoordinate';

import { IndexedStorageBuffer } from 'pipegpu/src/res/buffer/IndexedStorageBuffer';
import type { IndexedIndirectBuffer } from 'pipegpu/src/res/buffer/IndexedIndirectBuffer';
import type { Handle1D, Handle2D } from 'pipegpu/src/res/buffer/BaseBuffer';
import { parseRenderDispatch } from 'pipegpu/src/compile/parseRenderDispatch';
import { EarthScene } from './EarthScene';

type InstanceDesc = {
    model: Mat4,
    mesh_id: number,
};

type MeshDesc = {
    bounding_sphere: BoundingSphere,
    vertex_offset: number,
    mesh_id: number,
    meshlet_count: number,
    material_id: number,
};

type MeshletDesc = {
    self_bounding_sphere: Vec4,
    parent_bounding_sphere: Vec4,
    self_error: number,
    parent_error: number,
    cluster_id: number,
    mesh_id: number,
    index_count: number,
    index_offset: number,
};

const nanoEntry = async (
    SCENE_CAMERA: Cesium.Camera
) => {
    const lng: number = 116.3975392;
    const lat: number = 39.916;
    const alt: number = 100;
    const viewportWidth = 400;
    const viewportHeight = 400;

    const ctx: Context = new Context({
        selector: "GeoSketchpadConainter",
        width: viewportWidth,
        height: viewportHeight,
        devicePixelRatio: devicePixelRatio,
        requestFeatures: ['chromium-experimental-multi-draw-indirect']
    });

    await ctx.init();

    const compiler: Compiler = new Compiler({ ctx: ctx });
    {
        const canvas: HTMLCanvasElement = document.getElementById('GeoSketchpadConainter') as HTMLCanvasElement;
        canvas.style.left = `400px`;
        canvas.style.position = `fixed`;
    }

    // const earthScene: EarthScene = new EarthScene(
    //     `http://127.0.0.1/output/Azalea_LowPoly/`,
    //     SCENE_CAMERA,
    //     viewportWidth,
    //     viewportHeight,
    //     ctx,
    //     compiler,
    //     {
    //         lng: lng,
    //         lat: lat,
    //         alt: alt
    //     }
    // );

    const meshletPackData: MeshDataPack = await fetchHDMF(
        // `http://127.0.0.1/output/Jinx/9f36373bab2b3f20c6d9b765ae57e81650f31d876081bb00bdefc4ea516ce69a.hdmf`
        // `http://127.0.0.1/output/BistroExterior/7d8ee9820fca60a5ca677fb0ebf9fcfaec56b7c6956428e5e632329466ec22ef.hdmf`
        `http://127.0.0.1/output/Azalea_LowPoly/8bc8d8adeb08b02a2161dd2b06c67585621d4f9bb98e73279155d498f40e5d92.hdmf`
    );

    //
    const debugBuffer: MapBuffer = compiler.createMapBuffer({
        totalByteLength: 16 * 4,
        rawData: [
            new Float32Array([
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
            ])
        ],
    });

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
        meshletPackData.meshlets.length,
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
    u: f32,
    v: f32,
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
    f.uv = vec2<f32>(v.u, v.v);
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
    return vec4<f32>(f.uv.x, f.uv.y, 0.0, 1.0);
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
            primitiveTopology: 'triangle-list',
            cullFormat: 'backCCW',
        }
    };

    desc.uniforms?.assign(`debug`, debugBuffer);
    desc.uniforms?.assign(`vertex_arr`, vertexBuffer);
    desc.uniforms?.assign(`view_projection`, viewProjectionBuffer);
    desc.uniforms?.assign(`storage_arr_u32`, instanceOrderBuffer);
    desc.uniforms?.assign(`instance_desc_arr`, instanceDescBuffer);
    desc.uniforms?.assign(`mesh_desc_arr`, meshDescBuffer);

    // debug
    {
        const printDebugInfo = async () => {

            console.log(`projection matrix:`);
            console.log(`${SCENE_CAMERA.frustum.projectionMatrix}`);

            console.log(`view matrix:`);
            console.log(`${SCENE_CAMERA.viewMatrix}`);

            let vpMatrix = new Cesium.Matrix4();
            Cesium.Matrix4.multiply(SCENE_CAMERA.frustum.projectionMatrix, SCENE_CAMERA.viewMatrix, vpMatrix);
            console.log(`vp matrix:`);
            console.log(`${vpMatrix}`);

            console.log(`model matrix:`);
            console.log(`${locationMatrix}`);

            let mvpMatrix = new Cesium.Matrix4();
            Cesium.Matrix4.multiply(vpMatrix, locationMatrix, mvpMatrix);
            console.log(`MVP matrix`);
            console.log(`${mvpMatrix}`);

            for (let k = 0; k < 9; k += 9) {
                const position = new Cesium.Cartesian4(
                    meshletPackData.vertices[k],
                    meshletPackData.vertices[k + 1],
                    meshletPackData.vertices[k + 2],
                    1.0
                );
                let ndc = new Cesium.Cartesian4();
                Cesium.Matrix4.multiplyByVector(mvpMatrix, position, ndc);
                console.log(`vertex: ${position}`);
                console.log(`step: ${k} | ( x: ${ndc.x / ndc.w} , y: ${ndc.y / ndc.w} , z: ${ndc.z / ndc.w} )`);
            }

            // let mvpMatrix = new Cesium.Matrix4();
            // Cesium.Matrix4.multiply(vpMatrix, modelMatrix, mvpMatrix);
            // console.log(`cpu: vpmatrix:`);
            // console.log(`${mvpMatrix}`);

            // console.log(`cpu: modelMatrix:`);
            // console.log(`${modelMatrix}`);

            // pulled?.forEach(v => console.log(v));
            // for (let k = 0; k < meshletPackData.vertices.length; k += 9) {
            //     let vpMatrix = new Cesium.Matrix4();
            //     Cesium.Matrix4.multiply(SCENE_CAMERA.frustum.projectionMatrix, SCENE_CAMERA.viewMatrix, vpMatrix);
            //     let mvpMatrix = new Cesium.Matrix4();
            //     Cesium.Matrix4.multiply(vpMatrix, modelMatrix, mvpMatrix);
            //     const position = new Cesium.Cartesian4(
            //         meshletPackData.vertices[k],
            //         meshletPackData.vertices[k + 1],
            //         meshletPackData.vertices[k + 2],
            //         1.0
            //     );
            //     let ndc = new Cesium.Cartesian4();
            //     Cesium.Matrix4.multiplyByVector(mvpMatrix, position, ndc);
            //     console.log(`step: ${k} | ( x: ${ndc.x / ndc.w} , y: ${ndc.y / ndc.w} , z: ${ndc.z / ndc.w} )`);
            // }
        };
        setTimeout(() => { printDebugInfo() }, 3000);
    }

    // raf
    {
        // earthScene.forceUpdateSceneManager();
        const holder: RenderHolder | undefined = compiler.compileRenderHolder(desc);
        const graph: OrderedGraph = new OrderedGraph(ctx);
        let seed = 0;
        const renderLoop = async () => {

            ctx.refreshFrameResource();
            const encoder = ctx.getCommandEncoder();
            holder.build(encoder);
            ctx.submitFrameResource();

            if (180 == seed) {
                const pulled = await debugBuffer.PullDataAsync(0, 16 * 4);
                const f32Array = new Float32Array(pulled as ArrayBuffer);
                console.log(`------------------------------------------------------------------------------------------------------------------------`);
                console.log(`debug info:`);
                for (let k = 0; k < 4; k++) {
                    const index = k * 4;
                    console.log(`(${f32Array[index]}, ${f32Array[index + 1]}, ${f32Array[index + 2]}, ${f32Array[index + 3]})`);
                }
            }

            seed++;
            requestAnimationFrame(renderLoop);
            // earth scene update
            // earthScene.refreshBuffer();
            // earthScene.updateSceneData();
            // earthScene.printDebugInfo();
            // gpu render
            // graph.append(holder);
            // graph.build();
            // loop
        };
        requestAnimationFrame(renderLoop);
    }

}

export {
    nanoEntry
}