import {
    type RenderHolderDesc, type RenderHolder, type TypedArray1DFormat,
    Compiler,
    RenderProperty,
    ColorAttachment,
    Context,
    Attributes,
    Uniforms
} from 'pipegpu';

import { OrderedGraph } from '../index'

import { fetchKTX2AsBc7RGBA, type IKTXPack } from './util/fetchKTX';
import { fetchHDMF } from './util/fetchHDMF';

(async () => {

    {
        const s = await fetchHDMF('/example/asset/hdmf/004bec5f43a0f32f56d89857393c6602cd8538452733b934705ddec5f235e1ff.hdmf');
    }

    {
        const ktxPack: IKTXPack = await fetchKTX2AsBc7RGBA('/example/asset/container.ktx');
        console.log(ktxPack);
    }

    const ctx: Context = new Context({
        selector: "pad",
        width: 800,
        height: 600,
        devicePixelRatio: devicePixelRatio
    });
    await ctx.init();
    const compiler: Compiler = new Compiler({ ctx: ctx });

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
        handler: (): TypedArray1DFormat => {
            return new Float32Array([-0.15 + Math.sin((seed++) * 0.01), -0.5, 0.5, -0.5, 0.0, 0.5, -0.55, -0.5, -0.05, 0.5, -0.55, 0.5]);
        }
    });
    desc.attributes?.assign("in_vertex_position", vertexBuffer);

    const uniformBufferR = compiler.createUniformBuffer({
        // rawData: new Float32Array([1.0]) 
        handler: () => {
            return new Float32Array([Math.cos(seed * 0.01)]);
        }
    });
    const uniformBufferG = compiler.createUniformBuffer({ rawData: new Float32Array([0.2]) });
    const uniformBufferB = compiler.createUniformBuffer({ rawData: new Float32Array([0.0]) });

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

    // const renderLoop = () => {
    //     ctx.refreshFrameResource();
    //     const encoder = ctx.getCommandEncoder();
    //     holder.build(encoder);
    //     ctx.submitFrameResource();
    //     requestAnimationFrame(renderLoop);
    // };
    // requestAnimationFrame(renderLoop);
})();


