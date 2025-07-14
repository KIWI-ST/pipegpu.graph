import {
    type RenderHolderDesc, type RenderHolder, type TypedArray1DFormat,
    Compiler,
    RenderProperty,
    ColorAttachment,
    Context,
    Attributes,
    Uniforms
} from 'pipegpu';

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

const nanoBasic = async () => {

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
        console.log(meshDataPack);
    }

    //
    let desc: RenderHolderDesc = {
        label: '[DEMO][render]',
        vertexShader: compiler.createVertexShader({
            code: `
    @vertex
    fn vs_main(@location(0) in_vertex_position: vec2f) -> @builtin(position) vec4<f32> {
        return vec4f(in_vertex_position, 0.0, 1.0);
    }
    `,
            entryPoint: "vs_main"
        }),
        fragmentShader: compiler.createFragmentShader({
            code: `
    @group(0) @binding(0) var<uniform> uColorR:f32;
    @group(0) @binding(1) var<uniform> uColorG:f32;
    @group(0) @binding(2) var<uniform> uColorB:f32;

    @fragment
    fn fs_main() -> @location(0) vec4f {
        return vec4f(uColorR, uColorG, uColorB, 1.0);
    }
    `,
            entryPoint: "fs_main"
        }),
        attributes: new Attributes(),
        uniforms: new Uniforms(),
        dispatch: new RenderProperty(6, 1),
        colorAttachments: colorAttachments,
        depthStencilAttachment: depthStencilAttachment,
    };

    let seed: number = 0;
    // const vertexArr = new Float32Array([-0.15, -0.5, 0.5, -0.5, 0.0, 0.5, -0.55, -0.5, -0.05, 0.5, -0.55, 0.5]);
    const vertexBuffer = compiler.createVertexBuffer({
        totalByteLength: 12 * 4,
        handler: () => {
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    byteLength: 12 * 4,
                    rawData: new Float32Array([-0.15 + Math.sin((seed++) * 0.01), -0.5, 0.5, -0.5, 0.0, 0.5, -0.55, -0.5, -0.05, 0.5, -0.55, 0.5])
                }
            }
        }
    });
    desc.attributes?.assign("in_vertex_position", vertexBuffer);

    const uniformBufferR = compiler.createUniformBuffer({
        totalByteLength: 4,
        handler: () => {
            return {
                rewrite: true,
                detail: {
                    offset: 0,
                    byteLength: 4,
                    rawData: new Float32Array([Math.cos(seed * 0.01)])
                }
            }
        }
    });
    const uniformBufferG = compiler.createUniformBuffer({
        totalByteLength: 4,
        rawData: new Float32Array([0.2])
    });
    const uniformBufferB = compiler.createUniformBuffer({
        totalByteLength: 4,
        rawData: new Float32Array([0.0])
    });

    desc.uniforms?.assign("uColorR", uniformBufferR);
    desc.uniforms?.assign("uColorG", uniformBufferG);
    desc.uniforms?.assign("uColorB", uniformBufferB);

    const holder: RenderHolder | undefined = compiler.compileRenderHolder(desc);
    const graph: OrderedGraph = new OrderedGraph(ctx);
    const renderLoop = () => {
        graph.append(holder);
        graph.build();
        requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
}

export {
    nanoBasic
}