import { Mat4, Vec4 } from "pipegpu.matrix";
import { fetchHDMF, type BoundingSphere, type MaterialType, type MeshDataPack } from "../../util/fetchHDMF";

import * as Cesium from 'cesium';
import { EarthManager } from "./EarthManager";
import { fetchJSON, type Instance, type InstanceDataPack } from "../../util/fetchJSON";
import { fetchKTX2AsBc7RGBA, type KTXPackData } from "../../util/fetchKTX";
import { webMercatorTileSchema } from "./earth/QuadtreeTileSchema";
import { WGS84 } from "./earth/Ellipsoid";
import type { Compiler, Context, IndexedIndirectBuffer, StorageBuffer, UniformBuffer, UniformHandle } from "pipegpu";
import type { IndexedStorageBuffer } from "pipegpu/src/res/buffer/IndexedStorageBuffer";
import type { Handle1D, Handle2D } from "pipegpu/src/res/buffer/BaseBuffer";

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

type DrawIndexedIndirect = {
    index_count: number,
    instance_count: number,
    first_index: number,
    vertex_offset: number,
    first_instance: number,
};

type DebugVertex = {
    x: number,
    y: number,
    z: number,
};

const debugVertices: DebugVertex[] = [];

class EarthScene {

    private compiler: Compiler;
    private context: Context;

    private sceneTileMap: Map<string, InstanceDataPack> = new Map();                                // instances
    private sceneMeshMap: Map<string, MeshDataPack> = new Map();                                    // meshes
    private sceneTextureMap: Map<string, KTXPackData> = new Map();                                  // texture array
    private sceneModelMatrix: Cesium.Matrix4;                                                       // 场景 ModelMatrix (经纬度偏移)

    private instanceDescRuntimeMap: Map<string, { runtimeID: number }> = new Map();                 // 记录运行时 isntance 的 ID
    private meshDescRuntimeMap: Map<string, { runtimeID: number }> = new Map();                     // 记录运行时 mesh 的 ID
    private meshletDescRuntimeMap: Map<string, { runtimeID: number }> = new Map();                  // 记录运行时 meshlet 的 ID   
    private runtimeMeshIDWithIndexedIndirectsMap: Map<number, DrawIndexedIndirect[]> = new Map();   // 记录运行时 indexedIndrect 命令，

    private instanceDescCursor: number = 0;
    private meshDescCursor: number = 0;
    private meshletDescCursor: number = 0;

    private rootUri: string;
    private syncCamera: Cesium.Camera;
    private earthManager: EarthManager;
    private sceneTaskLimit: number = 1;

    private instanceDescQueue: InstanceDesc[] = [];
    private meshDescQueue: MeshDesc[] = [];
    private meshletDescQueue: MeshletDesc[] = [];
    private vertexQueue: Float32Array[] = [];
    private indexedQueue: Uint32Array[] = [];
    private instanceOrderQueue: Uint32Array[] = [];
    private indexedIndirectQueue: Uint32Array[] = [];

    private vertexOffset: number = 0;
    private meshletIndexedOffset: number = 0;
    private indexOffset: number = 0;

    private viewProjectionBuffer!: UniformBuffer;                // 视域矩阵 buffer          -- done
    private vertexBuffer!: StorageBuffer;                        // 密集型顶点 buffer        -- done
    private instanceOrderBuffer!: StorageBuffer;                 // 实例顺序 buffer          -- done
    private instanceDescBuffer!: StorageBuffer;                  // 实例描述 buffer          -- done
    private meshDescBuffer!: StorageBuffer;                      // 物件描述 buffer          -- done    
    private meshletDescBuffer!: StorageBuffer;                   // 簇描述 buffer            -- done
    private indexedIndirectBuffer!: IndexedIndirectBuffer;       // 间接绘制命令 buffer       -- done
    private indexedStoragebuffer!: IndexedStorageBuffer;         // 索引                      -- done
    private indirectDrawCountBuffer!: StorageBuffer;             // 间接命令绘制数量 buffer
    private maxDrawCount: number = 0;                            // 间接绘制命令执行最大数量

    private sceneVertexBufferOffset: number = 0;                 // 场景级顶点缓冲偏移
    private sceneInstanceOrderBufferOffset: number = 0;          // 场景级实例缓冲偏移
    private sceneInstanceDescBufferOffset: number = 0;           // 场景实例描述缓冲偏移
    private sceneMeshDescBufferOffset: number = 0;               // 场景物件描述缓冲偏移
    private sceneMeshletBufferOffset: number = 0;                // 场景簇缓冲偏移
    private sceneIndexedIndirectBufferOffset: number = 0;        // 常见间接绘制缓冲偏移
    private sceneIndexedStorageBufferOffset: number = 0;         // 场景索引缓冲偏移

    private maxInstanceNum = 100000;                             // 最大物件数

    constructor(
        rootUri: string,
        syncCamera: Cesium.Camera,
        viewportWidth: number,
        viewportHeight: number,
        context: Context,
        compiler: Compiler,
        opts: {
            lng: number,
            lat: number,
            alt: number
        }
    ) {
        // scene root position.
        {
            const lng: number = opts?.lng || 116.3955392;
            const lat: number = opts?.lat || 39.916;
            const alt: number = opts?.alt || 0;
            const spacePosition = Cesium.Cartesian3.fromDegrees(lng, lat, 0);
            this.sceneModelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(spacePosition);
        }
        this.rootUri = rootUri;
        this.syncCamera = syncCamera;
        this.earthManager = new EarthManager({
            camera: syncCamera,
            quadtreeTileSchema: webMercatorTileSchema,
            ellipsoid: WGS84,
            viewportWidth: viewportWidth,
            viewportHeight: viewportHeight,
        });
        this.compiler = compiler;
        this.context = context;
        this.initGpuBuffers();
    }

    private initViewPorjectionBuffer = () => {
        const handler: Handle1D = () => {
            const rawData = new Float32Array([
                // projection matrix
                this.syncCamera.frustum.projectionMatrix[0],
                this.syncCamera.frustum.projectionMatrix[1],
                this.syncCamera.frustum.projectionMatrix[2],
                this.syncCamera.frustum.projectionMatrix[3],
                this.syncCamera.frustum.projectionMatrix[4],
                this.syncCamera.frustum.projectionMatrix[5],
                this.syncCamera.frustum.projectionMatrix[6],
                this.syncCamera.frustum.projectionMatrix[7],
                this.syncCamera.frustum.projectionMatrix[8],
                this.syncCamera.frustum.projectionMatrix[9],
                this.syncCamera.frustum.projectionMatrix[10],
                this.syncCamera.frustum.projectionMatrix[11],
                this.syncCamera.frustum.projectionMatrix[12],
                this.syncCamera.frustum.projectionMatrix[13],
                this.syncCamera.frustum.projectionMatrix[14],
                this.syncCamera.frustum.projectionMatrix[15],
                // view matrix
                this.syncCamera.viewMatrix[0],
                this.syncCamera.viewMatrix[1],
                this.syncCamera.viewMatrix[2],
                this.syncCamera.viewMatrix[3],
                this.syncCamera.viewMatrix[4],
                this.syncCamera.viewMatrix[5],
                this.syncCamera.viewMatrix[6],
                this.syncCamera.viewMatrix[7],
                this.syncCamera.viewMatrix[8],
                this.syncCamera.viewMatrix[9],
                this.syncCamera.viewMatrix[10],
                this.syncCamera.viewMatrix[11],
                this.syncCamera.viewMatrix[12],
                this.syncCamera.viewMatrix[13],
                this.syncCamera.viewMatrix[14],
                this.syncCamera.viewMatrix[15],
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
        this.viewProjectionBuffer = this.compiler.createUniformBuffer({
            totalByteLength: 128,
            handler: handler
        });
    }

    private initVertexBuffer = () => {
        const handler: Handle2D = () => {
            // vertex snippet align byte length is 32
            if (this.vertexQueue.length) {
                const details: any = [];
                let rawData = this.vertexQueue.shift();
                while (rawData) {
                    // DEBUG::
                    {
                        for (let k = 0; k < rawData.length; k += 9) {
                            debugVertices.push({
                                x: rawData[k],
                                y: rawData[k + 1],
                                z: rawData[k + 2]
                            });
                        }
                    }
                    details.push({
                        byteLength: rawData.byteLength,
                        offset: this.sceneVertexBufferOffset,
                        rawData: rawData,
                    });
                    this.sceneVertexBufferOffset += rawData.byteLength;
                    rawData = this.vertexQueue.shift();
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
        this.vertexBuffer = this.compiler.createStorageBuffer({
            totalByteLength: this.context.getLimits().maxStorageBufferBindingSize,
            handler: handler,
        });
    }

    private initInstanceOrderBuffer = () => {
        const handler: Handle2D = () => {
            if (this.instanceOrderQueue.length) {
                const details: any = [];
                let rawData = this.instanceOrderQueue.shift();
                while (rawData) {
                    details.push({
                        byteLength: rawData.byteLength,
                        offset: this.sceneInstanceOrderBufferOffset,
                        rawData: rawData,
                    });
                    this.sceneInstanceOrderBufferOffset += rawData.byteLength;
                    rawData = this.instanceOrderQueue.shift();
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
        // 支持最大十万级物件渲染
        this.instanceOrderBuffer = this.compiler.createStorageBuffer({
            totalByteLength: this.maxInstanceNum * 4,
            handler: handler
        });
    }

    private initInstanceDescBuffer = () => {
        const handler: Handle2D = () => {
            if (this.instanceDescQueue.length) {
                const details: any = [];
                let instanceDesc: InstanceDesc | undefined = this.instanceDescQueue.shift();
                while (instanceDesc) {
                    // let instanceMatrix = new Cesium.Matrix4(
                    //     instanceDesc.model.value[0], instanceDesc.model.value[1], instanceDesc.model.value[2], instanceDesc.model.value[3],
                    //     instanceDesc.model.value[4], instanceDesc.model.value[5], instanceDesc.model.value[6], instanceDesc.model.value[7],
                    //     instanceDesc.model.value[8], instanceDesc.model.value[9], instanceDesc.model.value[10], instanceDesc.model.value[11],
                    //     instanceDesc.model.value[12], instanceDesc.model.value[13], instanceDesc.model.value[14], instanceDesc.model.value[15]
                    // );
                    let modelMatrix = new Cesium.Matrix4();
                    // Cesium.Matrix4.multiply(serverModelMatrix, instanceMatrix, modelMatrix);
                    modelMatrix = this.sceneModelMatrix;
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
                        // instance align byte length
                        byteLength: 80,
                        offset: this.sceneInstanceDescBufferOffset,
                        rawData: buffer,
                    });
                    this.sceneInstanceDescBufferOffset += buffer.byteLength;
                    instanceDesc = this.instanceDescQueue.shift();
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
        this.instanceDescBuffer = this.compiler.createStorageBuffer({
            totalByteLength: this.maxInstanceNum * 80,
            handler: handler,
        });
    }

    private initMeshDescBuffer = () => {
        const hanlder: Handle2D = () => {
            if (this.meshDescQueue.length) {
                const details: any = [];
                let meshDesc: MeshDesc | undefined = this.meshDescQueue.shift();
                while (meshDesc) {
                    const buffer = new ArrayBuffer(32);
                    const f32view = new Float32Array(buffer, 0, 4);
                    const u32View = new Float32Array(buffer, f32view.byteLength, 4);
                    f32view.set([meshDesc.bounding_sphere.cx, meshDesc.bounding_sphere.cy, meshDesc.bounding_sphere.cz, meshDesc.bounding_sphere.r]);
                    u32View.set([meshDesc.vertex_offset, meshDesc.mesh_id, meshDesc.meshlet_count, meshDesc.material_id]);
                    details.push({
                        // instance align byte length
                        byteLength: 32,
                        offset: this.sceneInstanceDescBufferOffset,
                        rawData: buffer,
                    });
                    this.sceneMeshDescBufferOffset += buffer.byteLength;
                    meshDesc = this.meshDescQueue.shift();
                }
                return {
                    rewrite: true,
                    details: details,
                }
            } else {
                return {
                    rewrite: false,
                    details: [],
                }
            }
        }
        this.meshDescBuffer = this.compiler.createStorageBuffer({
            totalByteLength: this.context.getLimits().maxStorageBufferBindingSize,
            handler: hanlder,
        });
    }

    private initMeshletDescBuffer = () => {
        const hanlder: Handle2D = () => {
            if (this.meshletDescQueue.length) {
                const details: any = [];
                let meshletDesc: MeshletDesc | undefined = this.meshletDescQueue.shift();
                while (meshletDesc) {
                    const buffer = new ArrayBuffer(64);
                    const f32view = new Float32Array(buffer, 0, 10);
                    const u32View = new Float32Array(buffer, f32view.byteLength, 4);
                    f32view.set([
                        meshletDesc.self_bounding_sphere.x,
                        meshletDesc.self_bounding_sphere.y,
                        meshletDesc.self_bounding_sphere.z,
                        meshletDesc.self_bounding_sphere.w,
                        meshletDesc.parent_bounding_sphere.x,
                        meshletDesc.parent_bounding_sphere.y,
                        meshletDesc.parent_bounding_sphere.z,
                        meshletDesc.parent_bounding_sphere.w,
                        meshletDesc.self_error,
                        meshletDesc.parent_error,
                    ]);
                    u32View.set([
                        meshletDesc.cluster_id,
                        meshletDesc.mesh_id,
                        meshletDesc.index_count,
                        meshletDesc.index_offset,
                    ]);
                    details.push({
                        byteLength: 64,
                        offset: this.sceneMeshletBufferOffset,
                        rawData: buffer,
                    });
                    this.sceneMeshletBufferOffset += buffer.byteLength;
                    meshletDesc = this.meshletDescQueue.shift();
                }
                return {
                    rewrite: true,
                    details: details,
                }
            } else {
                return {
                    rewrite: false,
                    details: [],
                }
            }
        }
        this.meshletDescBuffer = this.compiler.createStorageBuffer({
            totalByteLength: this.context.getLimits().maxStorageBufferBindingSize,
            handler: hanlder,
        });
    }

    private initIndexedIndirectBuffer = () => {
        const handler: Handle2D = () => {
            if (this.indexedIndirectQueue.length) {
                const details: any = [];
                let indexedIndirect = this.indexedIndirectQueue.shift();
                while (indexedIndirect) {
                    details.push({
                        byteLength: indexedIndirect.byteLength,
                        offset: this.sceneIndexedIndirectBufferOffset,
                        rawData: indexedIndirect,
                    });
                    this.sceneIndexedIndirectBufferOffset += indexedIndirect.byteLength;
                    indexedIndirect = this.indexedIndirectQueue.shift();
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
        // 支持最大十万级物件渲染
        // indirect 长度无法估计，使用最大 buffer size
        this.indexedIndirectBuffer = this.compiler.createIndexedIndirectBuffer({
            totalByteLength: this.context.getLimits().maxStorageBufferBindingSize,
            handler: handler,
        });
    }

    private initIndexedStorageBuffer = () => {
        const handler: Handle2D = () => {
            if (this.indexedQueue.length) {
                const details: any = [];
                let indexed = this.indexedQueue.shift();
                while (indexed) {
                    details.push({
                        byteLength: indexed.byteLength,
                        offset: this.sceneIndexedStorageBufferOffset,
                        rawData: indexed,
                    });
                    this.sceneIndexedStorageBufferOffset += indexed.byteLength;
                    indexed = this.indexedIndirectQueue.shift();
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
        // 支持最大十万级物件渲染
        // indirect 长度无法估计，使用最大 buffer size
        this.indexedStoragebuffer = this.compiler.createIndexedStorageBuffer({
            totalByteLength: this.context.getLimits().maxStorageBufferBindingSize,
            handler: handler
        });
    }

    private initIndirectDrawCountBuffer = () => {
        // const handler: Handle2D = () => {
        //     const details: any = [];
        //     details.push({
        //         byteLength: 4,
        //         offset: 0,
        //         rawData: new Uint32Array([this.maxDrawCount]),
        //     });
        //     return {
        //         rewrite: true,
        //         details: details,
        //     }
        // }
        // this.indirectDrawCountBuffer = this.compiler.createStorageBuffer({
        //     totalByteLength: 4,
        //     handler: handler,
        //     bufferUsageFlags: GPUBufferUsage.INDIRECT,
        // });
        this.indirectDrawCountBuffer = this.compiler.createStorageBuffer({
            totalByteLength: 4,
            rawData: [new Uint32Array([75])],
            bufferUsageFlags: GPUBufferUsage.INDIRECT,
        });
    }

    private initGpuBuffers = () => {
        this.initViewPorjectionBuffer();
        this.initVertexBuffer();
        this.initInstanceOrderBuffer();
        this.initInstanceDescBuffer();
        this.initMeshDescBuffer();
        this.initMeshletDescBuffer();
        this.initIndexedIndirectBuffer();
        this.initIndexedStorageBuffer();
        this.initIndirectDrawCountBuffer();
    }

    private statsMeshletIndicesNum = (meshDataPack: MeshDataPack) => {
        let indicesNum = 0;
        meshDataPack.meshlets.forEach(meshlet => {
            indicesNum += meshlet.indices.length;
        });
        return indicesNum;
    }

    // mesh desc - meshlet desc
    private appendData = async (instance: Instance, meshDataPack: MeshDataPack) => {
        // mesh 判断，如果 mesh 未添加，则添加并获取运行时ID
        // mesh 未添加则对应的 meshlet 也未添加
        // 添加 mesh desc 和 meshlet desc
        if (!this.meshDescRuntimeMap.has(meshDataPack.meshId)) {
            const meshDescRuntimeID: number = this.meshDescCursor;
            this.meshDescRuntimeMap.set(meshDataPack.meshId, {
                runtimeID: meshDescRuntimeID
            });
            this.meshDescQueue.push({
                bounding_sphere: meshDataPack.sphereBound,
                vertex_offset: this.vertexOffset,
                mesh_id: meshDescRuntimeID,
                meshlet_count: meshDataPack.meshlets.length,
                material_id: 0, // TODO material 
            });
            // 添加数据到紧凑的 vertex array. 待 storage buffer 写入.
            this.vertexQueue.push(meshDataPack.vertices);
            // 写入 meshlet desc
            const ddibs: DrawIndexedIndirect[] = [];
            let firstIndex: number = 0;
            meshDataPack.meshlets.forEach(meshlet => {
                const meshletRuntimeID = this.meshletDescCursor;
                const meshletDesc: MeshletDesc = {
                    self_bounding_sphere: new Vec4().set(meshlet.selfParentBounds[0], meshlet.selfParentBounds[1], meshlet.selfParentBounds[2], meshlet.selfParentBounds[3]),
                    parent_bounding_sphere: new Vec4().set(meshlet.selfParentBounds[5], meshlet.selfParentBounds[6], meshlet.selfParentBounds[7], meshlet.selfParentBounds[8]),
                    self_error: meshlet.selfParentBounds[4],
                    parent_error: meshlet.selfParentBounds[9],
                    cluster_id: meshletRuntimeID,
                    mesh_id: meshDescRuntimeID,
                    index_count: meshlet.indices.length,
                    index_offset: this.meshletIndexedOffset,
                };
                this.indexedQueue.push(meshlet.indices);
                this.meshletDescQueue.push(meshletDesc);
                this.meshletIndexedOffset += meshlet.indices.length;
                const diib: DrawIndexedIndirect = {
                    index_count: meshlet.indices.length,
                    instance_count: 1,
                    first_index: this.indexOffset + firstIndex,
                    vertex_offset: this.vertexOffset,
                    first_instance: 0,                  // TODO, 组织 instance 时，根据 instance 序号
                };
                ddibs.push(diib);
                firstIndex += meshlet.indices.length;   // this.meshletdescoff++; 处理 meshlet 偏移
            });
            this.runtimeMeshIDWithIndexedIndirectsMap.set(meshDescRuntimeID, ddibs);
            this.indexOffset += this.statsMeshletIndicesNum(meshDataPack);
            this.vertexOffset += meshDataPack.vertices.byteLength;
            this.meshDescCursor++; // 处理 mesh 偏移
        }
        // instance 
        if (!this.instanceDescRuntimeMap.has(instance.id)) {
            const instanceRuntimeID = this.instanceDescCursor;
            this.instanceDescRuntimeMap.set(instance.id, {
                runtimeID: instanceRuntimeID
            });
            if (!this.meshDescRuntimeMap.has(instance.mesh_id)) {
                throw new Error(`[E][appendData] instance 对应的 mesh id 丢失或未载入，请检查资产载入顺序。`);
            }
            const meshRuntimeID = this.meshDescRuntimeMap.get(instance.mesh_id)?.runtimeID as number;
            this.instanceDescQueue.push({
                model: instance.model,
                mesh_id: meshRuntimeID,
            });
            if (!this.runtimeMeshIDWithIndexedIndirectsMap.has(meshRuntimeID)) {
                throw new Error(`[E][appendData] 未找到对应 runtime meshID，请检查资产载入顺序。`)
            }
            // drawindexed command buffer.
            // [index count] [instance count] [first index] [vertex offset] [first instance]
            const diibs: DrawIndexedIndirect[] = this.runtimeMeshIDWithIndexedIndirectsMap.get(meshRuntimeID) as DrawIndexedIndirect[];
            diibs.forEach(diib => {
                const diibData = new Uint32Array([
                    diib.index_count, diib.instance_count, diib.first_index, diib.vertex_offset, instanceRuntimeID
                ]);
                this.indexedIndirectQueue.push(diibData);
                // 一个 meshlet 对应一个 indexed indirect draw command.
                // 一个 meshlet 对应一个 draw count.
                this.maxDrawCount++;
            });
            this.instanceOrderQueue.push(new Uint32Array([instanceRuntimeID]));
            this.instanceDescCursor++;  // 处理 instance 偏移
        }
    }

    // refresh buffer at frame begin.
    public refreshBuffer = () => {
        this.indirectDrawCountBuffer.getGpuBuffer(null, 'frameBegin');
        this.indexedIndirectBuffer.getGpuBuffer(null, 'frameBegin');
        this.indexedStoragebuffer.getGpuBuffer(null, 'frameBegin');
    }

    // update cpu stage data.
    public updateSceneData = async () => {
        const visualRevealTiles = this.earthManager.getVisualRevealTiles();
        if (visualRevealTiles.length === 0) {
            return;
        }
        let remain = this.sceneTaskLimit;
        let tile = visualRevealTiles?.shift();
        const tileKey = `${this.rootUri}${tile?.X}_${tile?.Y}_${tile?.Level}.json`;
        while (remain-- && tile && !this.sceneTileMap.has(tileKey)) {
            const jsonPackData = await fetchJSON(tileKey, tileKey);
            jsonPackData?.instances.forEach(async instance => {
                this.sceneTileMap.set(tileKey, jsonPackData);
                const meshKey = `${this.rootUri}${instance.mesh_id}.hdmf`;
                const meshPackData = await fetchHDMF(meshKey, instance.mesh_id);
                this.sceneMeshMap.set(meshPackData.meshId, meshPackData);
                const material: any = meshPackData.material;
                switch (material?.material_type as MaterialType) {
                    case 'kMaterialPBR':
                        {
                            const albedo_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.albedo_texture}`, material.albedo_texture);
                            this.sceneTextureMap.set(material.albedo_texture, albedo_texture!);
                            const metal_roughness_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.metal_roughness_texture}`, material.metal_roughness_texture);
                            this.sceneTextureMap.set(material.metal_roughness_texture, metal_roughness_texture!);
                            const normal_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.normal_texture}`, material.normal_texture);
                            this.sceneTextureMap.set(material.normal_texture, normal_texture!);
                            const emissive_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.emissive_texture}`, material.emissive_texture);
                            this.sceneTextureMap.set(material.emissive_texture, emissive_texture!);
                            const ambient_occlusion_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.ambient_occlusion_texture}`, material.ambient_occlusion_texture);
                            this.sceneTextureMap.set(material.ambient_occlusion_texture, ambient_occlusion_texture!);
                            break;
                        }
                    case 'kMaterialPBR1':
                        {
                            const albedo_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.albedo_texture}`, material.albedo_texture);
                            this.sceneTextureMap.set(material.albedo_texture, albedo_texture!);
                            const metal_roughness_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.metal_roughness_texture}`, material.metal_roughness_texture);
                            this.sceneTextureMap.set(material.metal_roughness_texture, metal_roughness_texture!);
                            const normal_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.normal_texture}`, material.normal_texture);
                            this.sceneTextureMap.set(material.normal_texture, normal_texture!);
                            const ambient_occlusion_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.ambient_occlusion_texture}`, material.ambient_occlusion_texture);
                            this.sceneTextureMap.set(material.ambient_occlusion_texture, ambient_occlusion_texture!);
                            break;
                        }
                    case 'kMaterialPBR2':
                        {
                            const albedo_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.albedo_texture}`, material.albedo_texture);
                            this.sceneTextureMap.set(material.albedo_texture, albedo_texture!);
                            const metal_roughness_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.metal_roughness_texture}`, material.metal_roughness_texture);
                            this.sceneTextureMap.set(material.metal_roughness_texture, metal_roughness_texture!);
                            const normal_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.normal_texture}`, material.normal_texture);
                            this.sceneTextureMap.set(material.normal_texture, normal_texture!);
                            break;
                        }
                    case 'kMaterialPBR3':
                        {
                            const albedo_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.albedo_texture}`, material.albedo_texture);
                            this.sceneTextureMap.set(material.albedo_texture, albedo_texture!);
                            const metal_roughness_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.metal_roughness_texture}`, material.metal_roughness_texture);
                            this.sceneTextureMap.set(material.metal_roughness_texture, metal_roughness_texture!);
                            break;
                        }
                    case 'kMaterialPhong':
                        {
                            const ambient_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.ambient_texture}`, material.ambient_texture);
                            this.sceneTextureMap.set(material.ambient_texture, ambient_texture!);
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.diffuse_texture}`, material.diffuse_texture);
                            this.sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);
                            const specular_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.specular_texture}`, material.specular_texture);
                            this.sceneTextureMap.set(material.specular_texture, specular_texture!);
                            const emissive_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.emissive_texture}`, material.emissive_texture);
                            this.sceneTextureMap.set(material.emissive_texture, emissive_texture!);
                            break;
                        }
                    case 'kMaterialPhong1':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.diffuse_texture}`, material.diffuse_texture);
                            this.sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);
                            const specular_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.specular_texture}`, material.specular_texture);
                            this.sceneTextureMap.set(material.specular_texture, specular_texture!);
                            const emissive_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.emissive_texture}`, material.emissive_texture);
                            this.sceneTextureMap.set(material.emissive_texture, emissive_texture!);
                            break;
                        }
                    case 'kMaterialPhong2':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.diffuse_texture}`, material.diffuse_texture);
                            this.sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);
                            const specular_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.specular_texture}`, material.specular_texture);
                            this.sceneTextureMap.set(material.specular_texture, specular_texture!);
                            break;
                        }
                    case 'kMaterialPhong3':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.diffuse_texture}`, material.diffuse_texture);
                            this.sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);
                            const specular_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.specular_texture}`, material.specular_texture);
                            this.sceneTextureMap.set(material.specular_texture, specular_texture!);
                            break;
                        }
                    case 'kMaterialPhong4':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.diffuse_texture}`, material.diffuse_texture);
                            this.sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);
                            break;
                        }

                    case 'kMaterialPhong5':
                        {
                            break;
                        }
                    case 'kMaterialPhong6':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.diffuse_texture}`, material.diffuse_texture);
                            this.sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);
                            const normal_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.normal_texture}`, material.normal_texture);
                            this.sceneTextureMap.set(material.normal_texture, normal_texture!);
                            break;
                        }
                    case 'kMaterialPhong7':
                        {
                            const diffuse_texture = await fetchKTX2AsBc7RGBA(`${this.rootUri}${material.diffuse_texture}`, material.diffuse_texture);
                            this.sceneTextureMap.set(material.diffuse_texture, diffuse_texture!);
                            break;
                        }
                    case 'kMaterialPhong8':
                        {
                            break;
                        }
                }
                // build pair:
                // instance - mesh - material - textures
                this.appendData(instance, meshPackData);
            });
        }
    }

    public forceUpdateSceneManager = () => {
        this.earthManager.updateQuadtreeTileByDistanceError();
    }

    public get ViewProjectionBuffer(): UniformBuffer {
        return this.viewProjectionBuffer;
    }

    public get VertexBuffer(): StorageBuffer {
        return this.vertexBuffer;
    }

    public get InstanceOrderBuffer(): StorageBuffer {
        return this.instanceOrderBuffer;
    }

    public get InstanceDescBuffer(): StorageBuffer {
        return this.instanceDescBuffer;
    }

    public get MeshDescBuffer(): StorageBuffer {
        return this.meshDescBuffer;
    }

    public get MeshletDescBuffer(): StorageBuffer {
        return this.meshletDescBuffer;
    }

    public get IndexedIndirectBuffer(): IndexedIndirectBuffer {
        return this.indexedIndirectBuffer;
    }

    public get IndexedStoragebuffer(): IndexedStorageBuffer {
        return this.indexedStoragebuffer;
    }

    public get IndirectDrawCountBuffer(): StorageBuffer {
        return this.indirectDrawCountBuffer
    }

    public get MaxDrawCount(): number {
        return this.maxDrawCount;
    }

    public printDebugInfo(): void {
        const limit: number = 10;
        let step: number = 0;
        debugVertices.forEach(vertex => {
            if (step > limit) {
                return;
            }

            // 计算 MVP 矩阵结果，是否在场景中
            let vpMatrix = new Cesium.Matrix4();
            Cesium.Matrix4.multiply(this.syncCamera.frustum.projectionMatrix, this.syncCamera.viewMatrix, vpMatrix);
            let mvpMatrix = new Cesium.Matrix4();
            Cesium.Matrix4.multiply(vpMatrix, this.sceneModelMatrix, mvpMatrix);

            const position = new Cesium.Cartesian4(vertex.x, vertex.y, vertex.z, 1.0);
            let ndc = new Cesium.Cartesian4();
            Cesium.Matrix4.multiplyByVector(mvpMatrix, position, ndc);

            console.log(`step: ${step++} x: ${ndc.x / ndc.w} y: ${ndc.y / ndc.w} z: ${ndc.z / ndc.w}`);
        });
    }

}

export {
    EarthScene
}