import {
    type RenderHolderDesc,
    type ComputeHolderDesc,
    Compiler,
    RenderProperty,
    ColorAttachment,
    Context,
    Uniforms,
    BaseHolder,
    ComputeProperty
} from 'pipegpu';

import * as Cesium from 'cesium'

import { CullingInstanceComponent, CullingMeshletComponent, DepthClearComponent, DepthCopyComponent, DepthTextureSnippet, DownsamplingComponent, HardwareRasterizationComponent, IndirectSnippet, OrderedGraph, ReprojectionComponent, ResetComponent, ReuseVisibilityBufferComponent, StorageVec2U32Snippet, Texture2DSnippet, TextureStorage2DR32FSnippet, ViewPlaneSnippet, VisibilityBufferSnippet } from '../../../index'
import { VertexSnippet } from '../../../shaderGraph/snippet/VertexSnippet';
import { FragmentDescSnippet } from '../../../shaderGraph/snippet/FragmentDescSnippet';
import { ViewProjectionSnippet } from '../../../shaderGraph/snippet/ViewProjectionSnippet';
import { MeshDescSnippet } from '../../../shaderGraph/snippet/MeshDescSnippet';
import { InstanceDescSnippet } from '../../../shaderGraph/snippet/InstanceDescSnippet';
import { StorageArrayU32Snippet } from '../../../shaderGraph/snippet/StorageArrayU32Snippet';
import { IndexedStorageSnippet } from '../../../shaderGraph/snippet/IndexedStorageSnippet';
import { IndexedIndirectSnippet } from '../../../shaderGraph/snippet/IndexedIndirectSnippet';
import { StorageAtomicU32Snippet } from '../../../shaderGraph/snippet/StorageAtomicU32Snippet';
import { TextureSamplerSnippet } from '../../../shaderGraph/snippet/TextureSamplerSnippet';
import { ViewSnippet } from '../../../shaderGraph/snippet/ViewSnippet';
import { DebugSnippet } from '../../../shaderGraph/snippet/DebugSnippet';
import { MeshletDescSnippet } from '../../../shaderGraph/snippet/MeshletSnippet';
import { EarthScene } from './EarthScene';
import { VisibilityBuffertVisComponent } from '../../../shaderGraph/component/VisibilityBuffertVisComponent';
import { initMeshletVisShader } from './shader/meshletVisShader';

const nanoEntry = async (
    SCENE_CAMERA: Cesium.Camera
) => {
    const lng: number = 116.3975392;
    const lat: number = 39.916;
    const alt: number = 100;
    const viewportWidth = 400;
    const viewportHeight = 400;

    const context: Context = new Context({
        selector: "GeoSketchpadConainter",
        width: viewportWidth,
        height: viewportHeight,
        devicePixelRatio: devicePixelRatio,
        requestFeatures: ['chromium-experimental-multi-draw-indirect', 'indirect-first-instance']
    });

    await context.init();

    const compiler: Compiler = new Compiler({ ctx: context });
    {
        const canvas: HTMLCanvasElement = document.getElementById('GeoSketchpadConainter') as HTMLCanvasElement;
        canvas.style.left = `400px`;
        canvas.style.position = `fixed`;
    }

    // 颜色纹理，连接surface texture
    // 颜色附件
    const surfaceTexture = compiler.createSurfaceTexture2D();
    const surfaceColorAttachment = compiler.createColorAttachment({
        texture: surfaceTexture,
        blendFormat: 'opaque',
        colorLoadStoreFormat: 'clearStore',
        clearColor: [0.0, 0.0, 0.0, 1.0]
    });

    const colorAttachments: ColorAttachment[] = [surfaceColorAttachment];

    // 深度纹理
    // 深度附件
    const depthTexture = compiler.createTexture2D({
        width: context.getViewportWidth(),
        height: context.getViewportHeight(),
        textureFormat: context.getPreferredDepthTexuteFormat(),
    });
    const depthStencilAttachment = compiler.createDepthStencilAttachment({
        texture: depthTexture,
        depthCompareFunction: 'less-equal',
        depthLoadStoreFormat: 'clearStore',
        depthReadOnly: false,
        depthClearValue: 0.0,
    });

    const MAX_MIPMAP_COUNT = depthStencilAttachment.getTexture().MaxMipmapCount;

    // 
    const earthScene: EarthScene = new EarthScene(
        // `http://10.11.11.34/BistroInterior/`,
        // `http://10.11.11.34/BistroExterior/`,
        // `http://10.11.11.34/SunTemple/`,
        `http://10.11.11.34/BistroInterior_Wine/`,
        SCENE_CAMERA,
        viewportWidth,
        viewportHeight,
        context,
        compiler,
        {
            lng: lng,
            lat: lat,
            alt: alt
        }
    );

    //
    const debugSnippet: DebugSnippet = new DebugSnippet(compiler);
    const viewProjectionSnippet: ViewProjectionSnippet = new ViewProjectionSnippet(compiler);
    const viewPlaneSnippet: ViewPlaneSnippet = new ViewPlaneSnippet(compiler);
    const viewSnippet: ViewSnippet = new ViewSnippet(compiler);
    const fragmentSnippet: FragmentDescSnippet = new FragmentDescSnippet(compiler);
    const vertexSnippet: VertexSnippet = new VertexSnippet(compiler);
    const meshDescSnippet: MeshDescSnippet = new MeshDescSnippet(compiler);
    const meshletDescSnippet: MeshletDescSnippet = new MeshletDescSnippet(compiler);
    const instanceDescSnippet: InstanceDescSnippet = new InstanceDescSnippet(compiler);
    const instanceOrderSnippet: StorageArrayU32Snippet = new StorageArrayU32Snippet(compiler);
    const instanceCountAtomicSnippet: StorageAtomicU32Snippet = new StorageAtomicU32Snippet(compiler);
    const meshletCountAtomicSnippet: StorageAtomicU32Snippet = new StorageAtomicU32Snippet(compiler);
    const triangleCountAtomicSnippet: StorageAtomicU32Snippet = new StorageAtomicU32Snippet(compiler);
    const depthTextureSnippet: DepthTextureSnippet = new DepthTextureSnippet(compiler);
    const hzbTextureStorageSnippet: TextureStorage2DR32FSnippet = new TextureStorage2DR32FSnippet(compiler);
    const hzbTextureSnippet: Texture2DSnippet = new Texture2DSnippet(compiler);
    const textureSamplerSnippet: TextureSamplerSnippet = new TextureSamplerSnippet(compiler);
    const staticIndexedStorageSnippet: IndexedStorageSnippet = new IndexedStorageSnippet(compiler);
    const runtimeIndexedStorageSnippet: IndexedStorageSnippet = new IndexedStorageSnippet(compiler);
    const runtimeMeshletMapSnippet: StorageVec2U32Snippet = new StorageVec2U32Snippet(compiler);        // 记录运行时 instance ID -> 对应的 meshlet ID
    const visibilityBufferSnippet: VisibilityBufferSnippet = new VisibilityBufferSnippet(compiler);
    const debugIndexedIndirectSnippet: IndexedIndirectSnippet = new IndexedIndirectSnippet(compiler);
    const hardwareRasterizationIndirectSnippet: IndirectSnippet = new IndirectSnippet(compiler);
    const runtimeReuseVisibilityIndirectSnippet: IndirectSnippet = new IndirectSnippet(compiler);

    const debugBuffer = debugSnippet.getBuffer();
    const viewProjectionBuffer = earthScene.ViewProjectionBuffer;
    const viewPlaneBuffer = earthScene.ViewPlaneBuffer;
    const viewBuffer = earthScene.ViewBuffer;
    const vertexBuffer = earthScene.VertexBuffer;
    const meshDescBuffer = earthScene.MeshDescBuffer;
    const meshletDescBuffer = earthScene.MeshletDescBuffer;
    const instanceDescBuffer = earthScene.InstanceDescBuffer;
    const instanceOrderBuffer = earthScene.InstanceOrderBuffer;
    const instanceCountAtomicBuffer = instanceCountAtomicSnippet.getBuffer();
    const meshletCountAtomicBuffer = meshletCountAtomicSnippet.getBuffer();
    const triangleCountAtomicBuffer = triangleCountAtomicSnippet.getBuffer();
    const hzbTexture = hzbTextureSnippet.getTexture(viewportWidth, viewportHeight, MAX_MIPMAP_COUNT, 'r32float');
    const hzbTextureStorage = hzbTextureStorageSnippet.getTexture(viewportWidth, viewportHeight, MAX_MIPMAP_COUNT, 'r32float');
    const staticIndexedStorageBuffer = earthScene.StaticIndexedStorageBuffer;
    const runtimeIndexedStorageBuffer = earthScene.RuntimeIndexedStorageBuffer;
    const visibilityBufferTexture = visibilityBufferSnippet.getVisbilityTexture(viewportWidth, viewportHeight);
    const visibilityColorAttachment = visibilityBufferSnippet.getVisibilityColorAttachment(visibilityBufferTexture);
    const textureSampler = textureSamplerSnippet.getTextureSampler();
    const runtimeMeshletMapBuffer = runtimeMeshletMapSnippet.getRuntimeBuffer();
    const hardwareRasterizationIndirectBuffer = earthScene.HardwareRasterizationIndirectBuffer; // TODO:: not init
    const runtimeReuseVisibilityIndirectBuffer = runtimeReuseVisibilityIndirectSnippet.getBuffer();

    const holders: BaseHolder[] = [];


    // debug
    let debugFrameCount = 0;
    const debugHandler = async () => {
        const ab: ArrayBuffer = await debugBuffer.PullDataAsync() as ArrayBuffer;
        const f32 = new Float32Array(ab as ArrayBuffer);
        if (debugFrameCount++ % 60 === 0) {
            // console.log(f32);
            console.warn(`[W] a: ${f32[0]}, b: ${f32[1]}, c: ${f32[2]}, d: ${f32[3]}, e: ${f32[4]}, f: ${f32[5]}, g: ${f32[6]}.`);
        }
    }

    // 0. 重值运行时计数器
    {
        const resetComponent: ResetComponent = new ResetComponent(
            context,
            compiler,
            debugSnippet,
            instanceCountAtomicSnippet,
            meshletCountAtomicSnippet
        );
        const WGSLCode = resetComponent.build();
        const dispatch = new ComputeProperty(1, 1, 1);
        const desc: ComputeHolderDesc = {
            label: 'reset runtime counter. include instance/meshlet counter.',
            computeShader: compiler.createComputeShader({
                code: WGSLCode,
                entryPoint: 'cp_main'
            }),
            uniforms: new Uniforms(),
            dispatch: dispatch
        };
        desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
        desc.uniforms?.assign(instanceCountAtomicSnippet.getVariableName(), instanceCountAtomicBuffer);
        desc.uniforms?.assign(meshletCountAtomicSnippet.getVariableName(), meshletCountAtomicBuffer);
        holders.push(compiler.compileComputeHolder(desc));
    }


    // 1. 基于可见性缓冲生成 index buffer 和 indirect buffer （重投影过程）
    {
        const reuseVisibilityBufferComponent: ReuseVisibilityBufferComponent = new ReuseVisibilityBufferComponent(
            context,
            compiler,
            debugSnippet,
            visibilityBufferSnippet,
            staticIndexedStorageSnippet,
            runtimeIndexedStorageSnippet,
            meshDescSnippet,
            meshletDescSnippet,
            instanceDescSnippet,
            triangleCountAtomicSnippet,
            runtimeMeshletMapSnippet,
            runtimeReuseVisibilityIndirectSnippet,
        );
        const dispatch = new ComputeProperty(
            visibilityBufferTexture.Width / reuseVisibilityBufferComponent.WorkGropuSizeX,
            visibilityBufferTexture.Height / reuseVisibilityBufferComponent.WorkGropuSizeY,
            1
        );
        const WGSLCode = reuseVisibilityBufferComponent.build();
        const desc: ComputeHolderDesc = {
            label: 'reuse visibility buffer, generate dynamic indexed buffer and indirect buffer.',
            computeShader: compiler.createComputeShader({ code: WGSLCode, entryPoint: 'cp_main' }),
            uniforms: new Uniforms(),
            dispatch: dispatch
        };
        desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
        desc.uniforms?.assign(visibilityBufferSnippet.getVariableName(), visibilityBufferTexture);
        desc.uniforms?.assign(staticIndexedStorageSnippet.getVariableName(), staticIndexedStorageBuffer);
        desc.uniforms?.assign(runtimeIndexedStorageSnippet.getVariableName(), runtimeIndexedStorageBuffer);
        desc.uniforms?.assign(meshDescSnippet.getVariableName(), meshDescBuffer);
        desc.uniforms?.assign(meshletDescSnippet.getVariableName(), meshletDescBuffer);
        desc.uniforms?.assign(instanceDescSnippet.getVariableName(), instanceDescBuffer);
        desc.uniforms?.assign(triangleCountAtomicSnippet.getVariableName(), triangleCountAtomicBuffer);
        desc.uniforms?.assign(runtimeMeshletMapSnippet.getVariableName(), runtimeMeshletMapBuffer);
        desc.uniforms?.assign(runtimeReuseVisibilityIndirectSnippet.getVariableName(), runtimeReuseVisibilityIndirectBuffer);
        holders.push(compiler.compileComputeHolder(desc));
    }

    // 2. 重设深度值，全图深度改为 1.0
    {
        const depthClearComponent: DepthClearComponent = new DepthClearComponent(context, compiler, debugSnippet);
        // 通过 attachment, 指定 depthTexture 初始化的办法
        // 完成原子化操作
        const depthClearAttachment = depthClearComponent.getClearDepthStencilAttachment(depthTexture);
        const WGSLCode = depthClearComponent.build();
        const dispatch: RenderProperty = new RenderProperty(6, 1);
        const desc: RenderHolderDesc = {
            label: 'reset depth, clear depth value to 1.0',
            vertexShader: compiler.createVertexShader({
                code: WGSLCode,
                entryPoint: 'vs_main'
            }),
            fragmentShader: compiler.createFragmentShader({
                code: WGSLCode,
                entryPoint: 'fs_main'
            }),
            dispatch: dispatch,
            uniforms: new Uniforms(),
            colorAttachments: colorAttachments,
            depthStencilAttachment: depthClearAttachment
        };
        desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
        holders.push(compiler.compileRenderHolder(desc));
    }

    // 3. 重投影深度
    {
        const reprojectionComponent: ReprojectionComponent = new ReprojectionComponent(
            context,
            compiler,
            debugSnippet,
            fragmentSnippet,
            viewProjectionSnippet,
            meshDescSnippet,
            meshletDescSnippet,
            instanceDescSnippet,
            vertexSnippet,
            runtimeIndexedStorageSnippet,
        );
        const WGSLCode = reprojectionComponent.build();
        const dispatch = new RenderProperty(runtimeReuseVisibilityIndirectBuffer, triangleCountAtomicBuffer, 2560 * 1440);
        const desc: RenderHolderDesc = {
            label: 'reprojection',
            vertexShader: compiler.createVertexShader({
                code: WGSLCode,
                entryPoint: 'vs_main'
            }),
            fragmentShader: compiler.createFragmentShader({
                code: WGSLCode,
                entryPoint: 'fs_main'
            }),
            uniforms: new Uniforms(),
            dispatch: dispatch,
            colorAttachments: colorAttachments,
            depthStencilAttachment: depthStencilAttachment,
        };
        desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
        desc.uniforms?.assign(viewProjectionSnippet.getVariableName(), viewProjectionBuffer);
        desc.uniforms?.assign(meshDescSnippet.getVariableName(), meshDescBuffer);
        desc.uniforms?.assign(meshletDescSnippet.getVariableName(), meshletDescBuffer);
        desc.uniforms?.assign(instanceDescSnippet.getVariableName(), instanceDescBuffer);
        desc.uniforms?.assign(vertexSnippet.getVariableName(), vertexBuffer);
        desc.uniforms?.assign(runtimeIndexedStorageSnippet.getVariableName(), runtimeIndexedStorageBuffer);
        desc.uniforms?.assign(runtimeMeshletMapSnippet.getVariableName(), runtimeMeshletMapBuffer);
        holders.push(compiler.compileRenderHolder(desc));
    }

    // 4. 输入深度，生成 hzb
    // 4 - 1, 拷贝深度到 r32 storage texture
    // 步骤 1：先把 depthTexture 的数据拷贝到 hzbTextureStorage 
    // 步骤 2：后把 hzbTextureStorage 里的数据写到 hzbTexture 
    {
        const depthCopyComponent: DepthCopyComponent = new DepthCopyComponent(
            context,
            compiler,
            debugSnippet,
            depthTextureSnippet,
            hzbTextureStorageSnippet
        );
        const WGSLCode = depthCopyComponent.build();
        depthTexture.cursor(0);
        hzbTextureStorage.cursor(0);
        hzbTexture.cursor(0);
        const dispatch = new ComputeProperty(
            Math.ceil(viewportWidth / depthCopyComponent.WorkGropuSizeX),
            Math.ceil(viewportWidth / depthCopyComponent.WorkGropuSizeY),
            1
        );
        const desc: ComputeHolderDesc = {
            label: 'depth texture copy, form depth to r32float texture',
            computeShader: compiler.createComputeShader({
                code: WGSLCode, entryPoint: 'cp_main'
            }),
            uniforms: new Uniforms(),
            dispatch: dispatch
        };
        // 拷贝第 0 层 (texture view 0)到 texture_storage_2d 里
        desc.handler = (encoder: GPUCommandEncoder): void => {
            const copySize: GPUExtent3DDict = { width: viewportWidth, height: viewportHeight, depthOrArrayLayers: 1 };
            const src: GPUTexelCopyTextureInfo = {
                texture: hzbTextureStorage.getGpuTexture(),
                mipLevel: 0,
                origin: [0, 0, 0],
                aspect: 'all'
            };
            const dst: GPUTexelCopyTextureInfo = {
                texture: hzbTexture.getGpuTexture(),
                mipLevel: 0,
                origin: [0, 0, 0],
                aspect: 'all'
            };
            encoder.copyTextureToTexture(src, dst, copySize);
        };
        desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
        desc.uniforms?.assign(depthTextureSnippet.getVariableName(), depthTexture);
        desc.uniforms?.assign(hzbTextureStorageSnippet.getVariableName(), hzbTextureStorage);
        holders.push(compiler.compileComputeHolder(desc));
    }

    // 4. 输入深度，生成 hzb
    // 4-2, 指定降采样完成 hzb 生成
    // 步骤0：hzbTexture view0 已写入
    // 步骤1：hzbTexture 和 hzbStorageTexture 倒换完成 mipmap 的生成
    // 步骤1：子流程 hzbTexture 降采样写到分辨率为一半的 hzbTextureStorage
    // 步骤1：子流程 hzbTextureStorage 的 view[k] 同步写入 hzbTexture 同级 view[k] 里
    {
        const downsamplingComponent: DownsamplingComponent = new DownsamplingComponent(
            context,
            compiler,
            debugSnippet,
            hzbTextureSnippet,
            hzbTextureStorageSnippet
        );
        const WGSLCode = downsamplingComponent.build();
        const computeShader = compiler.createComputeShader({
            code: WGSLCode,
            entryPoint: 'cp_main'
        });
        for (let k = 1; k < hzbTextureStorage.MaxMipmapCount; k++) {
            const sourceCursor = k - 1, destCursor = k;
            hzbTexture.cursor(sourceCursor);
            hzbTextureStorage.cursor(destCursor);
            const dispatch = new ComputeProperty(
                Math.ceil(viewportWidth >> k / downsamplingComponent.WorkGropuSizeX),
                Math.ceil(viewportHeight >> k / downsamplingComponent.WorkGropuSizeY),
                1
            );
            const desc: ComputeHolderDesc = {
                label: `download sampling: ${k}`,
                computeShader: computeShader,
                uniforms: new Uniforms(),
                dispatch: dispatch
            };
            // 拷贝第 destCursor 层 hzbTextureStorage 到 hzbTexture 里
            desc.handler = (encoder: GPUCommandEncoder): void => {
                const copySize: GPUExtent3DDict = { width: viewportWidth >> destCursor, height: viewportHeight >> destCursor, depthOrArrayLayers: 1 };
                const src: GPUTexelCopyTextureInfo = {
                    texture: hzbTextureStorage.getGpuTexture(),
                    mipLevel: destCursor,
                    origin: [0, 0, 0],
                    aspect: 'all'
                };
                const dst: GPUTexelCopyTextureInfo = {
                    texture: hzbTexture.getGpuTexture(),
                    mipLevel: destCursor,
                    origin: [0, 0, 0],
                    aspect: 'all'
                };
                encoder.copyTextureToTexture(src, dst, copySize);
            };
            desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
            desc.uniforms?.assign(hzbTextureSnippet.getVariableName(), hzbTexture);
            desc.uniforms?.assign(hzbTextureStorageSnippet.getVariableName(), hzbTextureStorage);
            holders.push(compiler.compileComputeHolder(desc));
        }
    }

    // 5. 实例剔除
    {
        const instanceCullingComponent: CullingInstanceComponent = new CullingInstanceComponent(
            context,
            compiler,
            debugSnippet,
            viewProjectionSnippet,
            viewPlaneSnippet,
            viewSnippet,
            hzbTextureSnippet,
            meshDescSnippet,
            instanceDescSnippet,
            instanceOrderSnippet,
            instanceCountAtomicSnippet
        );
        hzbTexture.cursor(0);
        const WGSLCode = instanceCullingComponent.build();
        const dispatch: ComputeProperty = new ComputeProperty(
            () => {
                if (earthScene.MaxInstanceCount) {
                    return Math.ceil(earthScene.MaxInstanceCount / instanceCullingComponent.WorkGropuSizeX);
                } else {
                    return 1;
                }
            },
            1,
            1
        );
        const desc: ComputeHolderDesc = {
            label: 'instance culling.',
            computeShader: compiler.createComputeShader({
                code: WGSLCode,
                entryPoint: 'cp_main'
            }),
            uniforms: new Uniforms(),
            dispatch: dispatch
        };
        desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
        desc.uniforms?.assign(viewProjectionSnippet.getVariableName(), viewProjectionBuffer);
        desc.uniforms?.assign(viewPlaneSnippet.getVariableName(), viewPlaneBuffer);
        desc.uniforms?.assign(viewSnippet.getVariableName(), viewBuffer);
        desc.uniforms?.assign(hzbTextureSnippet.getVariableName(), hzbTexture);
        desc.uniforms?.assign(meshDescSnippet.getVariableName(), meshDescBuffer);
        desc.uniforms?.assign(instanceDescSnippet.getVariableName(), instanceDescBuffer);
        desc.uniforms?.assign(instanceOrderSnippet.getVariableName(), instanceOrderBuffer);
        desc.uniforms?.assign(instanceCountAtomicSnippet.getVariableName(), instanceCountAtomicBuffer);
        holders.push(compiler.compileComputeHolder(desc));
    }

    // 6. 簇剔除
    {
        const meshletCullingComponent: CullingMeshletComponent = new CullingMeshletComponent(
            context,
            compiler,
            debugSnippet,
            viewProjectionSnippet,
            viewPlaneSnippet,
            viewSnippet,
            hzbTextureSnippet,
            meshDescSnippet,
            meshletDescSnippet,
            instanceDescSnippet,
            instanceOrderSnippet,
            instanceCountAtomicSnippet,
            meshletCountAtomicSnippet,
            runtimeMeshletMapSnippet,
            hardwareRasterizationIndirectSnippet
        );
        hzbTexture.cursor(0);
        const WGSLCode = meshletCullingComponent.build();
        const dispatch: ComputeProperty = new ComputeProperty(
            () => {
                if (earthScene.MaxInstanceCount) {
                    return Math.ceil(earthScene.MaxInstanceCount / meshletCullingComponent.WorkGropuSizeX);
                } else {
                    return 1;
                }
            },
            () => {
                if (earthScene.MaxMeshletCount) {
                    return Math.ceil(earthScene.MaxMeshletCount / meshletCullingComponent.WorkGropuSizeY);
                } else {
                    return 1;
                }
            },
            1
        );
        const desc: ComputeHolderDesc = {
            label: 'meshlet culling.',
            computeShader: compiler.createComputeShader({
                code: WGSLCode,
                entryPoint: 'cp_main',
            }),
            uniforms: new Uniforms(),
            dispatch: dispatch,
        };
        desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
        desc.uniforms?.assign(viewProjectionSnippet.getVariableName(), viewProjectionBuffer);
        desc.uniforms?.assign(viewPlaneSnippet.getVariableName(), viewPlaneBuffer);
        desc.uniforms?.assign(viewSnippet.getVariableName(), viewBuffer);
        desc.uniforms?.assign(hzbTextureSnippet.getVariableName(), hzbTexture);
        desc.uniforms?.assign(meshDescSnippet.getVariableName(), meshDescBuffer);
        desc.uniforms?.assign(meshletDescSnippet.getVariableName(), meshletDescBuffer);
        desc.uniforms?.assign(instanceDescSnippet.getVariableName(), instanceDescBuffer);
        desc.uniforms?.assign(instanceOrderSnippet.getVariableName(), instanceOrderBuffer);
        desc.uniforms?.assign(instanceCountAtomicSnippet.getVariableName(), instanceCountAtomicBuffer);
        desc.uniforms?.assign(meshletCountAtomicSnippet.getVariableName(), meshletCountAtomicBuffer);
        desc.uniforms?.assign(runtimeMeshletMapSnippet.getVariableName(), runtimeMeshletMapBuffer);
        desc.uniforms?.assign(hardwareRasterizationIndirectSnippet.getVariableName(), hardwareRasterizationIndirectBuffer);
        holders.push(compiler.compileComputeHolder(desc));
    }

    // // 7. 重置深度，使用 1.0
    // {
    //     const depthClearComnponet = new DepthClearComponent(
    //         context,
    //         compiler
    //     );
    //     const WGSLCode = depthClearComnponet.build();
    //     console.warn(`[W] 步骤7, 重置深度:${WGSLCode}`);
    //     const depthClearAttachment = depthClearComnponet.createClearDepthStencilAttachment(depthTexture);
    //     const dispatch = new RenderProperty(6, 1);
    //     const desc: RenderHolderDesc = {
    //         label: 'clear component. reset to 1.0.',
    //         vertexShader: compiler.createVertexShader({
    //             code: WGSLCode,
    //             entryPoint: 'vs_main',
    //         }),
    //         fragmentShader: compiler.createFragmentShader({
    //             code: WGSLCode,
    //             entryPoint: 'fs_main',
    //         }),
    //         dispatch: dispatch,
    //         colorAttachments: [],
    //         depthStencilAttachment: depthClearAttachment
    //     };
    //     holders.push(compiler.compileRenderHolder(desc));
    // }

    // // 8. 硬件光栅化
    // {
    //     const hardwareRasterizationComponent = new HardwareRasterizationComponent(
    //         context,
    //         compiler,
    //         debugSnippet,
    //         fragmentSnippet,
    //         viewProjectionSnippet,
    //         meshDescSnippet,
    //         meshletDescSnippet,
    //         instanceDescSnippet,
    //         vertexSnippet,
    //         staticIndexedStorageSnippet,
    //         runtimeMeshletMapSnippet,
    //     );
    //     const WGSLCode = hardwareRasterizationComponent.build();
    //     const dispatch: RenderProperty = new RenderProperty(hardwareRasterizationIndirectBuffer, meshletCountAtomicBuffer, earthScene.MaxMeshletCount);
    //     const desc: RenderHolderDesc = {
    //         label: 'hardware rasterization.',
    //         vertexShader: compiler.createVertexShader({
    //             code: WGSLCode,
    //             entryPoint: 'vs_main',
    //         }),
    //         fragmentShader: compiler.createFragmentShader({
    //             code: WGSLCode,
    //             entryPoint: 'fs_main',
    //         }),
    //         dispatch: dispatch,
    //         colorAttachments: [visibilityColorAttachment],
    //         depthStencilAttachment: depthStencilAttachment
    //     };
    //     desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
    //     desc.uniforms?.assign(visibilityBufferSnippet.getVariableName(), visibilityBufferTexture);
    //     desc.uniforms?.assign(viewSnippet.getVariableName(), viewBuffer);
    //     desc.uniforms?.assign(runtimeMeshletMapSnippet.getVariableName(), runtimeMeshletMapBuffer);
    //     holders.push(compiler.compileRenderHolder(desc));
    // }

    // // 9. visbility buffer 可视
    // {
    //     const visibilityBufferVisComponent = new VisibilityBuffertVisComponent(
    //         context,
    //         compiler,
    //         debugSnippet,
    //         visibilityBufferSnippet,
    //         viewSnippet,
    //         runtimeMeshletMapSnippet
    //     );
    //     const WGSLCode = visibilityBufferVisComponent.build();
    //     const dispatch = new RenderProperty(6, 1);
    //     const desc: RenderHolderDesc = {
    //         label: 'visibility buffer.',
    //         vertexShader: compiler.createVertexShader({
    //             code: WGSLCode,
    //             entryPoint: 'vs_main',
    //         }),
    //         fragmentShader: compiler.createFragmentShader({
    //             code: WGSLCode,
    //             entryPoint: 'fs_main',
    //         }),
    //         dispatch: dispatch,
    //         colorAttachments: colorAttachments,
    //         depthStencilAttachment: depthStencilAttachment,
    //     };
    //     desc.uniforms?.assign(debugSnippet.getVariableName(), debugBuffer);
    //     desc.uniforms?.assign(visibilityBufferSnippet.getVariableName(), visibilityBufferTexture);
    //     desc.uniforms?.assign(viewSnippet.getVariableName(), viewBuffer);
    //     desc.uniforms?.assign(runtimeMeshletMapSnippet.getVariableName(), runtimeMeshletMapBuffer);
    //     holders.push(compiler.compileRenderHolder(desc));
    // }

    // 10. 显示物件位置，辅助判断剔除结果是否正确
    {
        const debugMeshletVisHolder = initMeshletVisShader(
            context,
            compiler,
            earthScene,
            colorAttachments,
            depthStencilAttachment,
            {
                fragmentSnippet: fragmentSnippet,
                vertexSnippet: vertexSnippet,
                instanceDescSnippet: instanceDescSnippet,
                viewProjectionSnippet: viewProjectionSnippet,
                viewSnippet: viewSnippet,
                meshDescSnippet: meshDescSnippet,
                indexedStorageSnippet: staticIndexedStorageSnippet,
                instanceOrderSnippet: instanceOrderSnippet
            }
        );
        holders.push(debugMeshletVisHolder);
    }

    // raf
    {
        earthScene.forceUpdateSceneManager();

        // const graph: OrderedGraph = new OrderedGraph(context);
        const renderLoop = async () => {
            earthScene.updateSceneData();

            context.refreshFrameResource();
            const encoder = context.getCommandEncoder();
            holders.forEach(holder => {
                holder.build(encoder);
            });
            context.submitFrameResource();

            // debug
            await debugHandler();

            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }

}

export {
    nanoEntry
}