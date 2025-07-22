
import { IndexedIndirectBuffer, IndexedStorageBuffer, Attributes, ColorAttachment, Compiler, DepthStencilAttachment, RenderHolder, RenderProperty, Uniforms, type BaseHolder, type RenderHolderDesc, Context } from 'pipegpu';
import { OrderedGraph } from '../../../renderGraph/OrderedGraph';

const nanoEntry2 = async () => {
    const ctx: Context = new Context({
        selector: "GeoSketchpadConainter",
        width: 400,
        height: 400,
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

    let dispatch: RenderProperty;
    {
        // index storage buffer.
        const indexData2 = new Int16Array([0, 1, 2, 2, 1, 0]);
        const indexData1 = new Int16Array([3, 4, 5, 5, 4, 3]);
        const indexStorageBuffer: IndexedStorageBuffer = compiler.createIndexedStorageBuffer({
            totalByteLength: indexData1.byteLength + indexData2.byteLength,
            rawData: [indexData1, indexData2],
        });

        // indexed indirect buffer.
        const indexedIndirectData1 = new Uint32Array([indexData1.byteLength / indexData1.BYTES_PER_ELEMENT, 1, 0, 0, 0]);
        const indexedIndirectData2 = new Uint32Array([indexData2.byteLength / indexData2.BYTES_PER_ELEMENT, 1, indexData1.byteLength / indexData1.BYTES_PER_ELEMENT, 0, 0]);
        const indexedIndirectBuffer: IndexedIndirectBuffer = compiler.createIndexedIndirectBuffer({
            totalByteLength: indexedIndirectData1.byteLength + indexedIndirectData1.byteLength,
            rawData: [indexedIndirectData1, indexedIndirectData2]
        });

        // indirect draw count buffer.
        const indirectDrawCountData = new Uint32Array([3]);
        const indirectDrawCountBuffer = compiler.createStorageBuffer({
            totalByteLength: indirectDrawCountData.byteLength,
            rawData: [indirectDrawCountData],
            bufferUsageFlags: GPUBufferUsage.INDIRECT
        });

        dispatch = new RenderProperty(indexStorageBuffer, indexedIndirectBuffer, indirectDrawCountBuffer, 2);
    }

    let desc: RenderHolderDesc = {
        label: '[DEMO][render]',
        vertexShader: compiler.createVertexShader({
            code: `

struct VertexInput {
    @location(0) position:vec2f,
    @location(1) color:vec3f,
};

struct VertexOutput {
    @builtin(position) position:vec4f,
    @location(0) color:vec3f,
};

@vertex
fn vs_main(in:VertexInput) -> VertexOutput {
    var out:VertexOutput;
    out.position = vec4f(in.position, 0.0, 1.0);
    out.color = in.color;
    return out;
}

    `,
            entryPoint: "vs_main"
        }),
        fragmentShader: compiler.createFragmentShader({
            code: `

struct VertexOutput {
    @builtin(position) position:vec4f,
    @location(0) color:vec3f,
};

@fragment
fn fs_main(in:VertexOutput) -> @location(0) vec4f {
    return vec4f(in.color, 1.0);
}

    `,
            entryPoint: "fs_main"
        }),
        attributes: new Attributes(),
        uniforms: new Uniforms(),
        colorAttachments: colorAttachments,
        depthStencilAttachment: depthStencilAttachment,
        dispatch: dispatch,
    };

    {
        const positionData = new Float32Array([
            -0.2, -0.2,
            0.2, -0.2,
            0.0, 0.2,
            0.5, 0.5,
            0.85, 0.95,
            0.0, 0.0
        ]);
        const positionBuffer = compiler.createVertexBuffer({
            totalByteLength: positionData.byteLength,
            rawData: positionData
        });
        desc.attributes?.assign("position", positionBuffer);
    }

    {
        const colorData = new Float32Array([0.2, 0.2, 0.0, 0.2, 0.2, 0.0, 0.0, 0.2, 1.0, 0.2, 0.8, 0.0, 0.0, 0.2, 0.0, 0.7, 0.0, 0.0]);
        const colorBuffer = compiler.createVertexBuffer({
            totalByteLength: colorData.byteLength,
            rawData: colorData
        });
        desc.attributes?.assign("color", colorBuffer);
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
    nanoEntry2
}