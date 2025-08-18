import * as Cesium from 'cesium';

import { Mat4, Vec4, Vec3 } from "pipegpu.matrix";
import { fetchHDMF, type BoundingSphere, type MaterialType, type MeshDataPack } from "../../util/fetchHDMF";
import { EarthManager } from "./EarthManager";
import { fetchJSON, type Instance, type InstanceDataPack } from "../../util/fetchJSON";
import { fetchKTX2AsBc7RGBA, type KTXPackData } from "../../util/fetchKTX";
import { webMercatorTileSchema } from "./earth/QuadtreeTileSchema";
import { WGS84 } from "./earth/Ellipsoid";
import type { Compiler, Context, IndexedIndirectBuffer, IndirectBuffer, StorageBuffer, UniformBuffer } from "pipegpu";
import type { IndexedStorageBuffer } from "pipegpu/src/res/buffer/IndexedStorageBuffer";
import type { Handle1D, Handle2D, HandleDetail } from "pipegpu/src/res/buffer/BaseBuffer";

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

class EarthScene {

    private compiler: Compiler;
    private context: Context;

    private maxInstanceCount: number = 0;                                                            // 记录场景内最大的 instance 数量

    private sceneTileMap: Map<string, InstanceDataPack> = new Map();                                // instances
    private sceneMeshMap: Map<string, MeshDataPack> = new Map();                                    // meshes
    private sceneTextureMap: Map<string, KTXPackData> = new Map();                                  // texture array

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

    private vertexSizeOffset: number = 0;
    private meshletIndexedOffset: number = 0;
    private indexSizeOffset: number = 0;

    private viewProjectionBuffer!: UniformBuffer;                   // 视域矩阵 buffer          -- done
    private viewPlaneBuffer!: UniformBuffer;                        // 视锥边缘面               -- done
    private viewBuffer!: UniformBuffer;                             // 视角                    -- done
    private vertexBuffer!: StorageBuffer;                           // 密集型顶点 buffer        -- done
    private instanceOrderBuffer!: StorageBuffer;                    // 实例顺序 buffer          -- done
    private instanceDescBuffer!: StorageBuffer;                     // 实例描述 buffer          -- done
    private meshDescBuffer!: StorageBuffer;                         // 物件描述 buffer          -- done    
    private meshletDescBuffer!: StorageBuffer;                      // 簇描述 buffer            -- done
    private indexedIndirectBuffer!: IndexedIndirectBuffer;          // 间接绘制命令 buffer       -- done
    private indexedStorageStaticBuffer!: IndexedStorageBuffer;      // 索引, 场景对应            -- done
    private indexedStorageRuntimeBuffer!: IndexedStorageBuffer;     // 索引，动态               -- done
    private hardwareRasterizationIndirectBuffer!: IndirectBuffer;   // 间接绘制命令集合
    private indirectDrawCountBuffer!: StorageBuffer;                // 间接命令绘制数量 buffer
    private maxMeshletCount: number = 0;                            // 间接绘制命令执行最大数量

    private sceneVertexBufferOffset: number = 0;                    // 场景级顶点缓冲偏移
    private sceneInstanceOrderBufferOffset: number = 0;             // 场景级实例缓冲偏移
    private sceneInstanceDescBufferOffset: number = 0;              // 场景实例描述缓冲偏移
    private sceneMeshDescBufferOffset: number = 0;                  // 场景物件描述缓冲偏移
    private sceneMeshletBufferOffset: number = 0;                   // 场景簇缓冲偏移
    private sceneIndexedIndirectBufferOffset: number = 0;           // 常见间接绘制缓冲偏移
    private sceneIndexedStorageBufferOffset: number = 0;            // 场景索引缓冲偏移

    private maxInstanceNum = 100000;                                // 最大物件数

    private lng: number = 0;                                        // 经度
    private lat: number = 0;                                        // 纬度
    private alt: number = 0;                                        // 高程

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
        this.lng = opts.lng || 116.3955392;
        this.lat = opts.lat || 39.916;
        this.alt = opts.alt || 0;
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
            // cesium 默认是列主序
            let projectionData: number[] = [];
            // let projectionMatrix = new Cesium.Matrix4();
            // Cesium.Matrix4.transpose(this.syncCamera.frustum.projectionMatrix, projectionMatrix);
            // Cesium.Matrix4.toArray(projectionMatrix, projectionData);
            Cesium.Matrix4.toArray(this.syncCamera.frustum.projectionMatrix, projectionData);

            let viewData: number[] = [];
            // let viewMatrix = new Cesium.Matrix4();
            // Cesium.Matrix4.transpose(this.syncCamera.viewMatrix, viewMatrix);
            // Cesium.Matrix4.toArray(viewMatrix, viewData);
            Cesium.Matrix4.toArray(this.syncCamera.viewMatrix, viewData);

            const rawDataArr = [...projectionData, ...viewData];
            const rawDataF32 = new Float32Array(rawDataArr);
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    size: 32,
                    byteLength: 32 * 4,
                    rawData: rawDataF32,
                }
            }
        };
        this.viewProjectionBuffer = this.compiler.createUniformBuffer({
            totalByteLength: 128,
            handler: handler
        });
    }

    private initViewPlaneBuffer = () => {
        const handler: Handle1D = () => {
            let m = new Cesium.Matrix4();
            Cesium.Matrix4.multiply(this.syncCamera.frustum.projectionMatrix, this.syncCamera.viewMatrix, m);
            let mat: number[] = [];
            Cesium.Matrix4.toArray(m, mat);
            const planes: number[] = [];
            // 组织plane六个面
            const v3: Vec3 = new Vec3();
            // left
            {
                v3.x = -(mat[3] + mat[0]);
                v3.y = -(mat[7] + mat[4]);
                v3.z = -(mat[11] + mat[8]);
                const l: Vec4 = new Vec4().set(
                    v3.x / v3.len(),
                    v3.y / v3.len(),
                    v3.z / v3.len(),
                    -(mat[15] + mat[12]) / v3.len()
                );
                planes.push(...l.value);
            }
            // right
            {
                v3.x = mat[0] - mat[3];
                v3.y = mat[4] - mat[7];
                v3.z = mat[8] - mat[11];
                const r: Vec4 = new Vec4().set(
                    v3.x / v3.len(),
                    v3.y / v3.len(),
                    v3.z / v3.len(),
                    (mat[12] - mat[15]) / v3.len()
                );
                planes.push(...r.value);
            }
            // top
            {
                v3.x = -(mat[3] + mat[1]);
                v3.y = -(mat[7] + mat[5]);
                v3.z = -(mat[11] + mat[9]);
                const t: Vec4 = new Vec4().set(
                    v3.x / v3.len(),
                    v3.y / v3.len(),
                    v3.z / v3.len(),
                    -(mat[15] + mat[13]) / v3.len()
                );
                planes.push(...t.value);
            }
            // bottom
            {
                v3.x = mat[1] - mat[3];
                v3.y = mat[5] - mat[7];
                v3.z = mat[9] - mat[11];
                const b: Vec4 = new Vec4().set(
                    v3.x / v3.len(),
                    v3.y / v3.len(),
                    v3.z / v3.len(),
                    (mat[13] - mat[15]) / v3.len()
                );
                planes.push(...b.value);
            }
            // near
            {
                v3.x = -(mat[2] + mat[3]);
                v3.y = -(mat[6] + mat[7]);
                v3.z = -(mat[10] + mat[11]);
                const n: Vec4 = new Vec4().set(
                    v3.x / v3.len(),
                    v3.y / v3.len(),
                    v3.z / v3.len(),
                    -(mat[14] + mat[15]) / v3.len()
                );
                planes.push(...n.value);
            }
            // far
            {
                v3.x = mat[2] - mat[3];
                v3.y = mat[6] - mat[7];
                v3.z = mat[10] - mat[11];
                const f: Vec4 = new Vec4().set(
                    v3.x / v3.len(),
                    v3.y / v3.len(),
                    v3.z / v3.len(),
                    (mat[14] - mat[15]) / v3.len()
                );
                planes.push(...f.value);
            }
            const rawDataF32 = new Float32Array(planes);
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    size: 4 * 6,
                    byteLength: 4 * 4 * 6,
                    rawData: rawDataF32,
                }
            }
        };
        this.viewPlaneBuffer = this.compiler.createUniformBuffer({
            totalByteLength: 4 * 4 * 6,
            handler: handler
        });
    }

    private initViewBuffer = () => {
        const handler: Handle1D = () => {
            const frustum = this.syncCamera.frustum as Cesium.PerspectiveFrustum;
            const verticalScalingFactor = 1.0 / Math.tan(frustum.fov as number);
            const rawDataF32 = new Float32Array([
                this.syncCamera.position.x,                 //  camera_position_x
                this.syncCamera.position.y,                 //  camera_position_y
                this.syncCamera.position.z,                 //  camera_position_z
                verticalScalingFactor,                      //  camera_vertical_scaling_factor
                this.earthManager.getViewportWidth(),       //  viewport_width
                this.earthManager.getViewportHeight(),      //  viewport_height
                frustum.near,                               //  near_plane
                frustum.far,                                //  far_plane
                0,                                          //  pixel_threshold
                1.0                                         //  software_rasterizer_threshold
            ]);
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    size: 10,
                    byteLength: 48,
                    rawData: rawDataF32,
                }
            }
        };
        this.viewBuffer = this.compiler.createUniformBuffer({
            totalByteLength: 48,
            handler: handler
        });
    }

    private initVertexBuffer = () => {
        const handler: Handle2D = () => {
            // 顶点对齐长度 32
            if (this.vertexQueue.length) {
                const details: HandleDetail[] = [];
                let rawData = this.vertexQueue.shift();
                while (rawData) {
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
                const details: HandleDetail[] = [];
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
        const spacePosition = Cesium.Cartesian3.fromDegrees(this.lng, this.lat, 0);
        const locationMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(spacePosition);
        const handler: Handle2D = () => {
            if (this.instanceDescQueue.length) {
                const details: HandleDetail[] = [];
                let instanceDesc: InstanceDesc | undefined = this.instanceDescQueue.shift();
                while (instanceDesc) {
                    const buffer = new ArrayBuffer(80);
                    const modelMatrixView = new Float32Array(buffer, 0, 16);
                    const meshIDView = new Uint32Array(buffer, 16 * 4, 1);

                    let instanceMatrix = Cesium.Matrix4.fromArray(instanceDesc.model.value);
                    let modelMatrix = new Cesium.Matrix4();
                    Cesium.Matrix4.multiply(locationMatrix, instanceMatrix, modelMatrix);

                    let modelMatrixData: number[] = [];
                    Cesium.Matrix4.toArray(modelMatrix, modelMatrixData);

                    modelMatrixView.set(modelMatrixData);
                    meshIDView.set([instanceDesc.mesh_id]);

                    details.push({
                        byteLength: 80,
                        offset: this.sceneInstanceDescBufferOffset,
                        rawData: buffer,
                    });
                    this.sceneInstanceDescBufferOffset += buffer.byteLength;
                    instanceDesc = this.instanceDescQueue.shift();
                    // 统计 scene 场景内最大 instance 数量
                    this.maxInstanceCount++
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
            totalByteLength: this.maxInstanceNum * 144,
            handler: handler,
        });
    }

    private initMeshDescBuffer = () => {
        const hanlder: Handle2D = () => {
            if (this.meshDescQueue.length) {
                const details: HandleDetail[] = [];
                let meshDesc: MeshDesc | undefined = this.meshDescQueue.shift();
                while (meshDesc) {
                    const buffer = new ArrayBuffer(32);
                    const f32view = new Float32Array(buffer, 0, 4);
                    const u32View = new Float32Array(buffer, f32view.byteLength, 4);
                    f32view.set([
                        meshDesc.bounding_sphere.cx,
                        meshDesc.bounding_sphere.cy,
                        meshDesc.bounding_sphere.cz,
                        meshDesc.bounding_sphere.r
                    ]);
                    u32View.set([
                        meshDesc.vertex_offset,
                        meshDesc.mesh_id,
                        meshDesc.meshlet_count,
                        meshDesc.material_id
                    ]);
                    details.push({
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
                const details: HandleDetail[] = [];
                let meshletDesc: MeshletDesc | undefined = this.meshletDescQueue.shift();
                while (meshletDesc) {
                    const buffer = new ArrayBuffer(64);
                    const meshletViews = {
                        self_bounding_sphere: new Float32Array(buffer, 0, 4),
                        parent_bounding_sphere: new Float32Array(buffer, 16, 4),
                        self_error: new Float32Array(buffer, 32, 1),
                        parent_error: new Float32Array(buffer, 36, 1),
                        cluster_id: new Uint32Array(buffer, 40, 1),
                        mesh_id: new Uint32Array(buffer, 44, 1),
                        index_count: new Uint32Array(buffer, 48, 1),
                        index_offset: new Uint32Array(buffer, 52, 1),
                    };
                    meshletViews.self_bounding_sphere.set([
                        meshletDesc.self_bounding_sphere.x,
                        meshletDesc.self_bounding_sphere.y,
                        meshletDesc.self_bounding_sphere.z,
                        meshletDesc.self_bounding_sphere.w,
                    ]);
                    meshletViews.parent_bounding_sphere.set([
                        meshletDesc.parent_bounding_sphere.x,
                        meshletDesc.parent_bounding_sphere.y,
                        meshletDesc.parent_bounding_sphere.z,
                        meshletDesc.parent_bounding_sphere.w,
                    ]);
                    meshletViews.self_error.set([meshletDesc.self_error]);
                    meshletViews.parent_error.set([meshletDesc.parent_error]);
                    meshletViews.cluster_id.set([meshletDesc.cluster_id]);
                    meshletViews.mesh_id.set([meshletDesc.mesh_id]);
                    meshletViews.index_count.set([meshletDesc.index_count]);
                    meshletViews.index_offset.set([meshletDesc.index_offset]);

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
                const details: HandleDetail[] = [];
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

    private initIndexedStorageStaticBuffer = () => {
        const handler: Handle2D = () => {
            if (this.indexedQueue.length) {
                const details: HandleDetail[] = [];
                let indexedData = this.indexedQueue.shift();
                while (indexedData) {
                    details.push({
                        byteLength: indexedData.byteLength,
                        offset: this.sceneIndexedStorageBufferOffset,
                        rawData: indexedData,
                    });
                    this.sceneIndexedStorageBufferOffset += indexedData.byteLength;
                    indexedData = this.indexedQueue.shift();
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
        this.indexedStorageStaticBuffer = this.compiler.createIndexedStorageBuffer({
            totalByteLength: this.context.getLimits().maxStorageBufferBindingSize,
            handler: handler
        });
    }

    private initIndexedStorageRuntimeBuffer = () => {
        this.indexedStorageRuntimeBuffer = this.compiler.createIndexedStorageBuffer({
            totalByteLength: this.context.getLimits().maxStorageBufferBindingSize,
            rawData: []
        });
    }

    private initIndirectDrawCountBuffer = () => {
        const handler: Handle2D = () => {
            const details: HandleDetail[] = [];
            details.push({
                byteLength: 4,
                offset: 0,
                rawData: new Uint32Array([this.maxMeshletCount]),
            });
            return {
                rewrite: true,
                details: details,
            }
        }
        this.indirectDrawCountBuffer = this.compiler.createStorageBuffer({
            totalByteLength: 4,
            handler: handler,
            bufferUsageFlags: GPUBufferUsage.INDIRECT,
        });
    }

    private initGpuBuffers = () => {
        this.initViewPorjectionBuffer();
        this.initViewPlaneBuffer();
        this.initViewBuffer();
        this.initVertexBuffer();
        this.initInstanceOrderBuffer();
        this.initInstanceDescBuffer();
        this.initMeshDescBuffer();
        this.initMeshletDescBuffer();
        this.initIndexedIndirectBuffer();
        this.initIndexedStorageStaticBuffer();
        this.initIndexedStorageRuntimeBuffer();
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
            const meshDescRuntimeID: number = this.meshDescCursor++;
            this.meshDescRuntimeMap.set(meshDataPack.meshId, {
                runtimeID: meshDescRuntimeID
            });
            this.meshDescQueue.push({
                bounding_sphere: meshDataPack.sphereBound,
                vertex_offset: this.vertexSizeOffset,
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
                const meshletRuntimeID = this.meshletDescCursor++;
                const meshletDesc: MeshletDesc = {
                    self_bounding_sphere: new Vec4().set(
                        meshlet.selfParentBounds[0],
                        meshlet.selfParentBounds[1],
                        meshlet.selfParentBounds[2],
                        meshlet.selfParentBounds[3]
                    ),
                    parent_bounding_sphere: new Vec4().set(
                        meshlet.selfParentBounds[5],
                        meshlet.selfParentBounds[6],
                        meshlet.selfParentBounds[7],
                        meshlet.selfParentBounds[8]
                    ),
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
                    first_index: this.indexSizeOffset + firstIndex,
                    vertex_offset: this.vertexSizeOffset,
                    first_instance: 0,                  // TODO, 组织 instance 时，根据 instance 序号
                };
                ddibs.push(diib);
                firstIndex += meshlet.indices.length;   // this.meshletdescoff++; 处理 meshlet 偏移
            });
            this.runtimeMeshIDWithIndexedIndirectsMap.set(meshDescRuntimeID, ddibs);
            this.indexSizeOffset += this.statsMeshletIndicesNum(meshDataPack);
            this.vertexSizeOffset += meshDataPack.vertices.length / 8; // BUG FIX!!!, vertex consist of 8 egient
        }
        // instance 
        if (!this.instanceDescRuntimeMap.has(instance.id)) {
            const instanceRuntimeID = this.instanceDescCursor++;
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
                    diib.index_count,
                    diib.instance_count,
                    diib.first_index,
                    diib.vertex_offset,
                    instanceRuntimeID
                ]);
                this.indexedIndirectQueue.push(diibData);
                // 一个 meshlet 对应一个 indexed indirect draw command.
                // 一个 meshlet 对应一个 draw count.
                this.maxMeshletCount++;
            });
            this.instanceOrderQueue.push(new Uint32Array([instanceRuntimeID]));
        }
    }

    // update cpu stage data.
    public updateSceneData = async () => {
        const visualRevealTiles = this.earthManager.getVisualRevealTiles();
        if (!visualRevealTiles || visualRevealTiles.length === 0) {
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

    public get ViewPlaneBuffer(): UniformBuffer {
        return this.viewPlaneBuffer;
    }

    public get ViewBuffer(): UniformBuffer {
        return this.viewBuffer;
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

    public get StaticIndexedStorageBuffer(): IndexedStorageBuffer {
        return this.indexedStorageStaticBuffer;
    }

    public get RuntimeIndexedStorageBuffer(): IndexedStorageBuffer {
        return this.indexedStorageRuntimeBuffer;
    }

    public get IndirectDrawCountBuffer(): StorageBuffer {
        return this.indirectDrawCountBuffer
    }

    public get HardwareRasterizationIndirectBuffer(): IndirectBuffer {
        return this.hardwareRasterizationIndirectBuffer;
    }

    public get MaxMeshletCount(): number {
        return this.maxMeshletCount;
    }

    public get MaxInstanceCount(): number {
        return this.maxInstanceCount;
    }

}

export {
    EarthScene
}