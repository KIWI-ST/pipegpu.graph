import {
    type RenderHolderDesc, type RenderHolder, type TypedArray1DFormat,
    Compiler,
    RenderProperty,
    ColorAttachment,
    Context,
    Attributes,
    Uniforms,
    IndexedBuffer
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
import type { Handle1D, Handle2D } from 'pipegpu/src/res/buffer/BaseBuffer';
import { SceneManagement } from './earth/SceneManagement';
import { webMercatorTileSchema } from './earth/QuadtreeTileSchema';
import { PSEUDOMERCATOR, WGS84 } from './earth/Ellipsoid';
import { fetchJSON, type Instance, type InstanceDataPack } from '../../util/fetchJSON';
import { fetchKTX2AsBc7RGBA, type KTXPackData } from '../../util/fetchKTX';
import { DebugMeshletComponent } from '../../../shaderGraph/component/DebugMeshletComponent';
import { GLMatrix, type Mat4, type Vec4 } from 'pipegpu.matrix';
import { GeodeticCoordinate } from './earth/GeodeticCoordinate';
import { IndexedStorageBuffer } from 'pipegpu/src/res/buffer/IndexedStorageBuffer';


type InstanceDesc = {
    model: Mat4
    mesh_id: number,
};

type MeshDesc = {
    bounding_sphere: BoundingSphere,
    vertex_offset: number,
    mesh_id: number,
    meshlet_count: number,
    material_id: number
};

const nanoEntry = async (SCENE_CAMERA: Cesium.Camera) => {

    {
        const spacePosition = Cesium.Cartesian3.fromDegrees(116.3955392, 39.916, 0);
        const serverModelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(spacePosition);

        const projection_matrix = Cesium.Matrix4.fromArray([
            1.7320508075688774,
            0,
            0,
            0,
            0,
            1.7320508075688774,
            0,
            0,
            0,
            0,
            -1.00000000002,
            -1,
            0,
            0,
            -0.200000000002,
            0
        ]);

        const inverse_view_matrix = Cesium.Matrix4.fromArray([
            -0.8957463748843745,
            -0.44456544161855593,
            -3.33066907387547e-16,
            0,
            0.28526160358279085,
            -0.5747681294629972,
            0.7669859287333648,
            0,
            -0.3409754381225668,
            0.6870248652502368,
            0.6416639191391532,
            0,
            -2177859.8296980904,
            4388127.966843162,
            4070964.737855963,
            1
        ]);

        const view_matrix = Cesium.Matrix4.fromArray([
            -0.8957463748843745,
            0.28526160358279085,
            -0.3409754381225668,
            0,
            -0.44456544161855593,
            -0.5747681294629972,
            0.6870248652502368,
            0,
            -3.33066907387547e-16,
            0.7669859287333648,
            0.6416639191391532,
            0,
            1.5887342789753114e-9,
            21043.220439694356,
            -6369540.923092016,
            1
        ]);

        const vertex_position = Cesium.Cartesian4.fromArray([
            -4.571963310241699,
            4.105109691619873,
            10.755314826965332,
            1.0
        ]);

        let mvp_matrix = new Cesium.Matrix4();
        Cesium.Matrix4.multiply(projection_matrix, view_matrix, mvp_matrix);
        Cesium.Matrix4.multiply(mvp_matrix, serverModelMatrix, mvp_matrix);

        let ndc_Cartesian4 = new Cesium.Cartesian4();
        Cesium.Matrix4.multiplyByVector(mvp_matrix, vertex_position, ndc_Cartesian4);
        console.warn(`ndc x: ${ndc_Cartesian4.x / ndc_Cartesian4.w}`);
        console.warn(`ndc y: ${ndc_Cartesian4.y / ndc_Cartesian4.w}`);
        console.warn(`ndc z: ${ndc_Cartesian4.z / ndc_Cartesian4.w}`);
    }

    // const r = WGS84.geographicToSpace(new GeodeticCoordinate(114.2978538661029179491913330511, 30.77193874122344863588183053804, 0));
    // console.log(` ---- ${r} ---`);

    const viewportWidth = 400, viewportHeight = 400;

    const sceneManagement: SceneManagement = new SceneManagement({
        camera: SCENE_CAMERA,
        quadtreeTileSchema: webMercatorTileSchema,
        ellipsoid: WGS84,
        viewportWidth: viewportWidth,
        viewportHeight: viewportHeight,
    });

    const ctx: Context = new Context({
        selector: "GeoSketchpadConainter",
        width: viewportWidth,
        height: viewportHeight,
        devicePixelRatio: devicePixelRatio
    });

    await ctx.init();

    const compiler: Compiler = new Compiler({ ctx: ctx });
    {
        const canvas: HTMLCanvasElement = document.getElementById('GeoSketchpadConainter') as HTMLCanvasElement;
        canvas.style.left = `400px`;
        canvas.style.position = `fixed`;
    }
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
        texture: depthTexture
    });

    // snippets
    const debugSnippet: DebugSnippet = new DebugSnippet(compiler);
    const vertexSnippet: VertexSnippet = new VertexSnippet(compiler);
    const fragmentSnippet: FragmentDescSnippet = new FragmentDescSnippet(compiler);
    const viewProjectionSnippet: ViewProjectionSnippet = new ViewProjectionSnippet(compiler);
    const meshDescSnippet: MeshDescSnippet = new MeshDescSnippet(compiler);
    const materialPhongSnippet: MaterialSnippet = new MaterialSnippet(compiler);
    const materialTexture2DArraySnippet: Texture2DArraySnippet = new Texture2DArraySnippet(compiler);
    const instanceDescSnippet: InstanceDescSnippet = new InstanceDescSnippet(compiler);
    const instanceOrderSnippet: StorageArrayU32Snippet = new StorageArrayU32Snippet(compiler);
    const indexedIndirectSnippet: IndexedIndirectSnippet = new IndexedIndirectSnippet(compiler);
    const instanceCountAtomicSnippet: StorageAtomicU32Snippet = new StorageAtomicU32Snippet(compiler);
    const textureSamplerSnippet: TextureSamplerSnippet = new TextureSamplerSnippet(compiler);
    const pointLightSnippet: PointLightSnippet = new PointLightSnippet(compiler);
    const viewSnippet: ViewSnippet = new ViewSnippet(compiler);
    const indexedStorageSnippet = new StorageIndexSnippet(compiler);

    // const meshPhongComponent: DebugMeshComponent = new DebugMeshComponent(
    //     ctx,
    //     compiler,
    //     debugSnippet,
    //     fragmentSnippet,
    //     vertexSnippet,
    //     viewProjectionSnippet,
    //     viewSnippet,
    //     instanceDescSnippet,
    //     meshDescSnippet,
    //     materialPhongSnippet,
    //     instanceOrderSnippet,
    //     pointLightSnippet,
    //     materialTexture2DArraySnippet,
    //     textureSamplerSnippet
    // );

    // const WGSLCode: string = meshPhongComponent.build();

    const rootDir = `http://127.0.0.1/output/Azalea_LowPoly/`;
    const sceneTileMap: Map<string, InstanceDataPack> = new Map();  // instance data
    const sceneMeshMap: Map<string, MeshDataPack> = new Map();      // mesh desc and mesh vertex
    const sceneTextureMap: Map<string, KTXPackData> = new Map();    // texture
    const sceneTaskLimit = 3;
    const UpdateSceneCPUData = async () => {
        const visualRevealTiles = sceneManagement.getVisualRevealTiles();
        let remain = sceneTaskLimit;
        let tile = visualRevealTiles?.shift();
        const tileKey = `${rootDir}${tile?.X}_${tile?.Y}_${tile?.Level}.json`;
        while (remain-- && tile && !sceneTileMap.has(tileKey)) {
            const jsonPackData = await fetchJSON(tileKey, tileKey);
            jsonPackData?.instances.forEach(async instancePack => {
                sceneTileMap.set(tileKey, jsonPackData);
                const meshKey = `${rootDir}${instancePack.mesh_id}.hdmf`;
                const meshPackData = await fetchHDMF(meshKey, instancePack.mesh_id);
                sceneMeshMap.set(meshPackData.meshId, meshPackData);
                const material: any = meshPackData.material;
                switch (material?.material_type as MaterialType) {
                    case 'kMaterialPBR':
                        {
                            const albedo_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.albedo_texture}`, material.albedo_texture);
                            sceneTextureMap.set(material.albedo_texture, albedo_texture!);

                            const metal_roughness_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.metal_roughness_texture}`, material.metal_roughness_texture);
                            sceneTextureMap.set(material.metal_roughness_texture, metal_roughness_texture!);

                            const normal_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.normal_texture}`, material.normal_texture);
                            sceneTextureMap.set(material.normal_texture, normal_texture!);

                            const emissive_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.emissive_texture}`, material.emissive_texture);
                            sceneTextureMap.set(material.emissive_texture, emissive_texture!);

                            const ambient_occlusion_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.ambient_occlusion_texture}`, material.ambient_occlusion_texture);
                            sceneTextureMap.set(material.ambient_occlusion_texture, ambient_occlusion_texture!);

                            break;
                        }
                    case 'kMaterialPBR1':
                        {
                            const albedo_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.albedo_texture}`, material.albedo_texture);
                            sceneTextureMap.set(material.albedo_texture, albedo_texture!);

                            const metal_roughness_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.metal_roughness_texture}`, material.metal_roughness_texture);
                            sceneTextureMap.set(material.metal_roughness_texture, metal_roughness_texture!);

                            const normal_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.normal_texture}`, material.normal_texture);
                            sceneTextureMap.set(material.normal_texture, normal_texture!);

                            const ambient_occlusion_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.ambient_occlusion_texture}`, material.ambient_occlusion_texture);
                            sceneTextureMap.set(material.ambient_occlusion_texture, ambient_occlusion_texture!);

                            break;
                        }
                    case 'kMaterialPBR2':
                        {
                            const albedo_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.albedo_texture}`, material.albedo_texture);
                            sceneTextureMap.set(material.albedo_texture, albedo_texture!);

                            const metal_roughness_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.metal_roughness_texture}`, material.metal_roughness_texture);
                            sceneTextureMap.set(material.metal_roughness_texture, metal_roughness_texture!);

                            const normal_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.normal_texture}`, material.normal_texture);
                            sceneTextureMap.set(material.normal_texture, normal_texture!);

                            break;
                        }
                    case 'kMaterialPBR3':
                        {
                            const albedo_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.albedo_texture}`, material.albedo_texture);
                            sceneTextureMap.set(material.albedo_texture, albedo_texture!);

                            const metal_roughness_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.metal_roughness_texture}`, material.metal_roughness_texture);
                            sceneTextureMap.set(material.metal_roughness_texture, metal_roughness_texture!);

                            break;
                        }
                    case 'kMaterialPhong':
                        {
                            const ambient_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.ambient_texture}`, material.ambient_texture);
                            sceneTextureMap.set(material.ambient_texture, ambient_texture!);

                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.diffuse_texture}`, material.diffuse_texture);
                            sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);

                            const specular_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.specular_texture}`, material.specular_texture);
                            sceneTextureMap.set(material.specular_texture, specular_texture!);

                            const emissive_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.emissive_texture}`, material.emissive_texture);
                            sceneTextureMap.set(material.emissive_texture, emissive_texture!);

                            break;
                        }
                    case 'kMaterialPhong1':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.diffuse_texture}`, material.diffuse_texture);
                            sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);

                            const specular_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.specular_texture}`, material.specular_texture);
                            sceneTextureMap.set(material.specular_texture, specular_texture!);

                            const emissive_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.emissive_texture}`, material.emissive_texture);
                            sceneTextureMap.set(material.emissive_texture, emissive_texture!);

                            break;
                        }
                    case 'kMaterialPhong2':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.diffuse_texture}`, material.diffuse_texture);
                            sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);

                            const specular_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.specular_texture}`, material.specular_texture);
                            sceneTextureMap.set(material.specular_texture, specular_texture!);

                            break;
                        }
                    case 'kMaterialPhong3':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.diffuse_texture}`, material.diffuse_texture);
                            sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);

                            const specular_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.specular_texture}`, material.specular_texture);
                            sceneTextureMap.set(material.specular_texture, specular_texture!);

                            break;
                        }
                    case 'kMaterialPhong4':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.diffuse_texture}`, material.diffuse_texture);
                            sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);

                            break;
                        }

                    case 'kMaterialPhong5':
                        {
                            break;
                        }
                    case 'kMaterialPhong6':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.diffuse_texture}`, material.diffuse_texture);
                            sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);

                            const normal_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.normal_texture}`, material.normal_texture);
                            sceneTextureMap.set(material.normal_texture, normal_texture!);

                            break;
                        }
                    case 'kMaterialPhong7':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${rootDir}${material.diffuse_texture}`, material.diffuse_texture);
                            sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);

                            break;
                        }
                    case 'kMaterialPhong8':
                        {
                            break;
                        }
                }
                // build pair:
                // instance - mesh - material - textures
                AppendDataPack(instancePack, meshPackData);
            });
        }
    };

    // manage cpu-side data.
    // - instance desc
    // - vertex data
    // - material desc
    // - textures
    // TODO:: temporary cancellation of material support.
    const instanceDescMap: Map<string, number> = new Map();
    const instanceDescArray: InstanceDesc[] = [];
    const meshDescMap: Map<string, number> = new Map();
    const meshDescArray: MeshDesc[] = [];
    const vertexArray: Float32Array[] = [];
    const instanceOrderArray: Uint32Array[] = [];
    let vertexOffset: number = 0;
    const AppendDataPack = async (instance: Instance, meshDataPack: MeshDataPack) => {
        // TODO material push first.
        if (!meshDescMap.has(meshDataPack.meshId)) {
            const meshRuntimeID: number = meshDescArray.length;
            meshDescMap.set(meshDataPack.meshId, meshRuntimeID);
            meshDescArray.push({
                bounding_sphere: meshDataPack.sphereBound,
                vertex_offset: vertexOffset,
                mesh_id: meshRuntimeID,
                meshlet_count: meshDataPack.meshlets.length,
                material_id: 0, // TODO material 
            });
            // push to vertex array
            vertexArray.push(meshDataPack.vertices);
            vertexOffset += meshDataPack.vertices.byteLength;
        }
        if (!instanceDescMap.has(instance.id)) {
            const instanceRuntimeID = instanceDescArray.length;
            instanceDescMap.set(instance.id, instanceRuntimeID);
            if (meshDescMap.has(instance.id)) {
                throw new Error(`[E][AppendDataPack] mesh_id missing in meshDescMap, please check append order.`);
            }
            const meshId = meshDescMap.get(instance.mesh_id) as number;
            instanceDescArray.push({
                model: instance.model,
                mesh_id: meshId,
            });
            // push instance order array
            instanceOrderArray.push(new Uint32Array([instanceRuntimeID]));
        }
    };

    // draw meshlet shader
    const debugMeshletComponent: DebugMeshletComponent = new DebugMeshletComponent(
        ctx,
        compiler,
        fragmentSnippet,
        vertexSnippet,
        instanceDescSnippet,
        viewProjectionSnippet,
        viewSnippet,
        meshDescSnippet,
        indexedStorageSnippet,
        instanceOrderSnippet,
    );

    const WGSLCode = debugMeshletComponent.build();








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
        // dispatch: new RenderProperty(6, 1),
        colorAttachments: colorAttachments,
        depthStencilAttachment: depthStencilAttachment,
    };

    // view projection matrix
    {
        const viewProjectionHandler: Handle1D = () => {
            const rawData = new Float32Array([
                // projection matrix
                SCENE_CAMERA.frustum.projectionMatrix[0],
                SCENE_CAMERA.frustum.projectionMatrix[1],
                SCENE_CAMERA.frustum.projectionMatrix[2],
                SCENE_CAMERA.frustum.projectionMatrix[3],
                SCENE_CAMERA.frustum.projectionMatrix[4],
                SCENE_CAMERA.frustum.projectionMatrix[5],
                SCENE_CAMERA.frustum.projectionMatrix[6],
                SCENE_CAMERA.frustum.projectionMatrix[7],
                SCENE_CAMERA.frustum.projectionMatrix[8],
                SCENE_CAMERA.frustum.projectionMatrix[9],
                SCENE_CAMERA.frustum.projectionMatrix[10],
                SCENE_CAMERA.frustum.projectionMatrix[11],
                SCENE_CAMERA.frustum.projectionMatrix[12],
                SCENE_CAMERA.frustum.projectionMatrix[13],
                SCENE_CAMERA.frustum.projectionMatrix[14],
                SCENE_CAMERA.frustum.projectionMatrix[15],
                // view matrix
                // inverseViewMatrix
                // viewMatrix
                SCENE_CAMERA.viewMatrix[0],
                SCENE_CAMERA.viewMatrix[1],
                SCENE_CAMERA.viewMatrix[2],
                SCENE_CAMERA.viewMatrix[3],
                SCENE_CAMERA.viewMatrix[4],
                SCENE_CAMERA.viewMatrix[5],
                SCENE_CAMERA.viewMatrix[6],
                SCENE_CAMERA.viewMatrix[7],
                SCENE_CAMERA.viewMatrix[8],
                SCENE_CAMERA.viewMatrix[9],
                SCENE_CAMERA.viewMatrix[10],
                SCENE_CAMERA.viewMatrix[11],
                SCENE_CAMERA.viewMatrix[12],
                SCENE_CAMERA.viewMatrix[13],
                SCENE_CAMERA.viewMatrix[14],
                SCENE_CAMERA.viewMatrix[15],
            ]);
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    byteLength: 4 * 4 * 4 * 2,
                    rawData: rawData
                }
            }
        };
        const viewProjectionBuffer = viewProjectionSnippet.getBuffer(viewProjectionHandler);
        desc.uniforms?.assign(viewProjectionSnippet.getVariableName(), viewProjectionBuffer);
    }

    // vertex buffer
    {
        let vertexBufferOffset = 0;
        const vertexBufferHandle: Handle2D = () => {
            // vertex snippet align byte length is 32
            if (vertexArray.length) {
                const details: any = [];
                let rawData = vertexArray.shift();
                while (rawData) {
                    details.push({
                        byteLength: rawData.byteLength,
                        offset: vertexBufferOffset,
                        rawData: rawData,
                    });
                    vertexBufferOffset += rawData.byteLength;
                    rawData = vertexArray.shift();
                }
                return {
                    rewrite: true,
                    details: details,
                }
            }
            else {
                return {
                    rewrite: false,
                    details: [],
                }
            }
        }
        const vertexBuffer = vertexSnippet.getBuffer(vertexBufferHandle, ctx.getLimits().maxStorageBufferBindingSize);
        desc.uniforms?.assign(vertexSnippet.getVariableName(), vertexBuffer);
    }

    // instance order buffer
    {
        let instanceOrderBufferOffset = 0;
        const instanceOrderBufferHandler: Handle2D = () => {
            if (instanceOrderArray.length) {
                const details: any = [];
                let rawData = instanceOrderArray.shift();
                while (rawData) {
                    details.push({
                        byteLength: rawData.byteLength,
                        offset: instanceOrderBufferOffset,
                        rawData: rawData,
                    });
                    instanceOrderBufferOffset += rawData.byteLength;
                    rawData = instanceOrderArray.shift();
                }
                return {
                    rewrite: true,
                    details: details,
                }
            }
            else {
                return {
                    rewrite: false,
                    details: [],
                }
            }
        }
        // support 10,0000 entites rendering.
        const instanceOrderBuffer = instanceOrderSnippet.getBuffer(instanceOrderBufferHandler, 100000 * 4);
        desc.uniforms?.assign(instanceOrderSnippet.getVariableName(), instanceOrderBuffer);
    }

    // instance desc buffer
    {
        let instanceDescBufferOffset = 0;
        const instanceDescBufferHandler: Handle2D = () => {
            if (instanceDescArray.length) {
                const details: any = [];
                let instanceDesc: InstanceDesc | undefined = instanceDescArray.shift();
                // serverModelMatrix
                while (instanceDesc) {

                    let instanceMatrix = new Cesium.Matrix4(
                        instanceDesc.model.value[0], instanceDesc.model.value[1], instanceDesc.model.value[2], instanceDesc.model.value[3],
                        instanceDesc.model.value[4], instanceDesc.model.value[5], instanceDesc.model.value[6], instanceDesc.model.value[7],
                        instanceDesc.model.value[8], instanceDesc.model.value[9], instanceDesc.model.value[10], instanceDesc.model.value[11],
                        instanceDesc.model.value[12], instanceDesc.model.value[13], instanceDesc.model.value[14], instanceDesc.model.value[15]
                    );
                    let modelMatrix = new Cesium.Matrix4();
                    // Cesium.Matrix4.multiply(serverModelMatrix, instanceMatrix, modelMatrix);
                    modelMatrix = serverModelMatrix;
                    const buffer = new ArrayBuffer(80);
                    const f32view = new Float32Array(buffer, 0, 16);
                    const u32View = new Float32Array(buffer, f32view.byteLength, 1);
                    f32view.set([
                        modelMatrix[0], modelMatrix[1], modelMatrix[2], modelMatrix[3],
                        modelMatrix[4], modelMatrix[5], modelMatrix[6], modelMatrix[7],
                        modelMatrix[8], modelMatrix[9], modelMatrix[10], modelMatrix[11],
                        modelMatrix[12], modelMatrix[13], modelMatrix[14], modelMatrix[15],
                    ]);
                    u32View.set([
                        instanceDesc.mesh_id
                    ]);
                    details.push({
                        byteLength: 80, // instance align byte length
                        offset: instanceDescBufferOffset,
                        rawData: buffer,
                    });
                    instanceDescBufferOffset += buffer.byteLength;
                    instanceDesc = instanceDescArray.shift();
                }
                return {
                    rewrite: true,
                    details: details,
                }
            }
            else {
                return {
                    rewrite: false,
                    details: [],
                }
            }
        }
        // support 10,0000 entites rendering.
        const instanceDescBuffer = instanceDescSnippet.getBuffer(instanceDescBufferHandler, 100000 * 80);
        desc.uniforms?.assign(instanceDescSnippet.getVariableName(), instanceDescBuffer);
    }

    // ref:https://github.com/KIWI-ST/pipegpu/blob/main/example/tech/initMultiDrawIndexedIndirect.ts
    // indirect draw count buffer
    {

    }

    // indirect command buffer
    {

    }

    // indirect indexstorage buffer
    {

    }

    // raf
    {
        sceneManagement.updateQuadtreeTileByDistanceError();

        const holder: RenderHolder | undefined = compiler.compileRenderHolder(desc);
        const graph: OrderedGraph = new OrderedGraph(ctx);
        const renderLoop = () => {
            // cpu update scene
            // management.updateQuadtreeTileByDistanceError();
            // console.log(management.getVisualRevealTiles());
            UpdateSceneCPUData();

            // gpu render
            graph.append(holder);
            graph.build();

            // loop
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }

}

export {
    nanoEntry
}