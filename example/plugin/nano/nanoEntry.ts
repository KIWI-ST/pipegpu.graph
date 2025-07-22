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
    StorageBuffer
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

    const earthScene: EarthScene = new EarthScene(
        `http://127.0.0.1/output/Azalea_LowPoly/`,
        SCENE_CAMERA,
        viewportWidth,
        viewportHeight,
        ctx,
        compiler,
        { lng: lng, lat: lat, alt: alt }
    );

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
    const meshletDescSnippet = new MeshletDescSnippet(compiler);

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
    const meshletDescArray: MeshletDesc[] = [];
    const vertexArray: Float32Array[] = [];
    const indexedArray: Uint32Array[] = [];
    const instanceOrderArray: Uint32Array[] = [];
    let vertexOffset: number = 0;
    let meshletIndexedOffset: number = 0;

    // draw meshlet shader.
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

    let dispatch: RenderProperty = new RenderProperty(
        earthScene.IndexedStoragebuffer,
        earthScene.IndexedIndirectBuffer,
        earthScene.IndirectDrawCountBuffer,
        earthScene.MaxDrawCount
    );

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
    };

    desc.uniforms?.assign(viewProjectionSnippet.getVariableName(), earthScene.ViewProjectionBuffer);
    desc.uniforms?.assign(vertexSnippet.getVariableName(), earthScene.VertexBuffer);
    desc.uniforms?.assign(instanceOrderSnippet.getVariableName(), earthScene.InstanceOrderBuffer);
    desc.uniforms?.assign(instanceDescSnippet.getVariableName(), earthScene.InstanceDescBuffer);
    desc.uniforms?.assign(meshDescSnippet.getVariableName(), earthScene.MeshDescBuffer);

    // raf
    {
        earthScene.forceUpdateSceneManager();

        const holder: RenderHolder | undefined = compiler.compileRenderHolder(desc);
        const graph: OrderedGraph = new OrderedGraph(ctx);
        const renderLoop = () => {
            earthScene.updateSceneData();

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