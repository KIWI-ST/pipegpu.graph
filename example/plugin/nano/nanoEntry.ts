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

import { IndexedStorageBuffer } from 'pipegpu/src/res/buffer/IndexedStorageBuffer';
import type { IndexedIndirectBuffer } from 'pipegpu/src/res/buffer/IndexedIndirectBuffer';
import type { Handle1D, Handle2D } from 'pipegpu/src/res/buffer/BaseBuffer';
import { parseRenderDispatch } from 'pipegpu/src/compile/parseRenderDispatch';
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

    // 调试缓冲
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
    const fragmentSnippet: FragmentDescSnippet = new FragmentDescSnippet(compiler);
    const vertexSnippet: VertexSnippet = new VertexSnippet(compiler);
    const instanceDescSnippet: InstanceDescSnippet = new InstanceDescSnippet(compiler);
    const viewProjectionSnippet: ViewProjectionSnippet = new ViewProjectionSnippet(compiler);
    const viewSnippet: ViewSnippet = new ViewSnippet(compiler);
    const meshDescSnippet: MeshDescSnippet = new MeshDescSnippet(compiler);
    const indexedStorageSnippet: IndexedStorageSnippet = new IndexedStorageSnippet(compiler);
    const instanceOrderSnippet: StorageArrayU32Snippet = new StorageArrayU32Snippet(compiler);

    // raf
    {
        // earthScene.forceUpdateSceneManager();
        const holder: RenderHolder | undefined = initMeshletVisShader(
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
                indexedStorageSnippet: indexedStorageSnippet,
                instanceOrderSnippet: instanceOrderSnippet
            }
        );
        // const graph: OrderedGraph = new OrderedGraph(context);
        // let seed = 0;
        const renderLoop = async () => {
            earthScene.updateSceneData();
            context.refreshFrameResource();
            const encoder = context.getCommandEncoder();
            holder?.build(encoder);
            context.submitFrameResource();
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }

}

export {
    nanoEntry
}