import {
    type RenderHolderDesc, type RenderHolder, type TypedArray1DFormat,
    Compiler,
    RenderProperty,
    ColorAttachment,
    Context,
    Attributes,
    Uniforms
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
import { fetchHDMF, type MeshDataPack } from '../../util/fetchHDMF';
import type { Handle1D } from 'pipegpu/src/res/buffer/BaseBuffer';

const nanoEntry = async (SCENE_CAMERA: Cesium.Camera) => {

    console.log(SCENE_CAMERA);

    const ctx: Context = new Context({
        selector: "GeoSketchpadConainter",
        width: 400,
        height: 400,
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

    const meshPhongComponent: DebugMeshComponent = new DebugMeshComponent(
        ctx,
        compiler,
        debugSnippet,
        fragmentSnippet,
        vertexSnippet,
        viewProjectionSnippet,
        viewSnippet,
        instanceDescSnippet,
        meshDescSnippet,
        materialPhongSnippet,
        instanceOrderSnippet,
        pointLightSnippet,
        materialTexture2DArraySnippet,
        textureSamplerSnippet
    );

    const WGSLCode: string = meshPhongComponent.build();

    // asset load 
    {
        const rootDir = `http://127.0.0.1/output/BistroExterior/`;
        const meshDataPack: MeshDataPack = await fetchHDMF(`${rootDir}0010549f74c8f50e81b1fe5ea863abc7c2e0fe5bd48a46efbbbecf29a0215975.hdmf`);
    }

    //
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
        dispatch: new RenderProperty(6, 1),
        colorAttachments: colorAttachments,
        depthStencilAttachment: depthStencilAttachment,
    };

    // 
    {

    }

    // raf
    {
        const holder: RenderHolder | undefined = compiler.compileRenderHolder(desc);
        const graph: OrderedGraph = new OrderedGraph(ctx);
        const renderLoop = () => {
            graph.append(holder);
            graph.build();
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }

}

export {
    nanoEntry
}