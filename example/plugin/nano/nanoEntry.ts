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
    MapBuffer,
    TextureSampler,
    DepthStencilAttachment,
    BaseHolder,
    type ComputeHolderDesc,
    ComputeProperty
} from 'pipegpu';

import * as Cesium from 'cesium'

import { DepthClearComponent, DepthTextureSnippet, IndirectSnippet, OrderedGraph, ReuseVisibilityBufferComponent, StorageVec2U32Snippet, Texture2DSnippet, TextureStorage2DR32FSnippet, ViewPlaneSnippet, VisibilityBufferSnippet } from '../../../index'
import { VertexSnippet } from '../../../shaderGraph/snippet/VertexSnippet';
import { FragmentDescSnippet } from '../../../shaderGraph/snippet/FragmentDescSnippet';
import { ViewProjectionSnippet } from '../../../shaderGraph/snippet/ViewProjectionSnippet';
import { MeshDescSnippet } from '../../../shaderGraph/snippet/MeshDescSnippet';
import { MaterialDescSnippet } from '../../../shaderGraph/snippet/MaterialDescSnippet';
import { Texture2DArraySnippet } from '../../../shaderGraph/snippet/Texture2DArraySnippet';
import { InstanceDescSnippet } from '../../../shaderGraph/snippet/InstanceDescSnippet';
import { StorageArrayU32Snippet } from '../../../shaderGraph/snippet/StorageArrayU32Snippet';
import { IndexedStorageSnippet } from '../../../shaderGraph/snippet/IndexedStorageSnippet';
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
import { MeshletVisComponent } from '../../../shaderGraph/component/MeshletVisComponent';
import { GLMatrix, Vec4, type Mat4 } from 'pipegpu.matrix';
import { GeodeticCoordinate } from './earth/GeodeticCoordinate';
import type { IndexedIndirectBuffer } from 'pipegpu/src/res/buffer/IndexedIndirectBuffer';

import { EarthScene } from './EarthScene';
import { initMeshletVisShader } from './shader/meshletVisShader';

const nanoEntry = async (
    SCENE_CAMERA: Cesium.Camera
) => {
    const lng: number = 116.3975392;
    const lat: number = 39.916;
    const alt: number = 0;
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
    const meshletMapRuntimeBuffer = runtimeMeshletMapSnippet.getRuntimeBuffer();
    const hardwareRasterizationIndirectBuffer = earthScene.HardwareRasterizationIndirectBuffer; // TODO:: not init
    const runtimeReuseVisibilityIndirectBuffer = runtimeReuseVisibilityIndirectSnippet.getBuffer();

    const holders: BaseHolder[] = [];

    // debug
    let debugHandler;
    {
        debugHandler = async () => {
            const ab: ArrayBuffer = await debugBuffer.PullDataAsync() as ArrayBuffer;
            const f32 = new Float32Array(ab as ArrayBuffer);
            console.log(f32);
        }
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

        console.log(WGSLCode);

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
        desc.uniforms?.assign(runtimeMeshletMapSnippet.getVariableName(), meshletMapRuntimeBuffer);
        desc.uniforms?.assign(runtimeReuseVisibilityIndirectSnippet.getVariableName(), runtimeReuseVisibilityIndirectBuffer);

        holders.push(compiler.compileComputeHolder(desc));
    }

    // 2. reset depth. clear depth as default 1.0.
    {
        const depthClearComponent: DepthClearComponent = new DepthClearComponent(context, compiler);
        // 通过 attachment, 指定 depthTexture 初始化的办法
        // 完成原子化操作
        const depthClearAttachment = depthClearComponent.createClearDepthStencilAttachment(depthTexture);

        const WGSLCode = depthClearComponent.build();
        console.log(WGSLCode);

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
            colorAttachments: colorAttachments,
            depthStencilAttachment: undefined
        };


    }


    // raf
    {
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