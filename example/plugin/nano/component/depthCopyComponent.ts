import { Attributes, ColorAttachment, ComputeHolder, ComputeProperty, DepthStencilAttachment, RenderHolder, RenderProperty, Texture2D, TextureStorage2D, Uniforms, type Compiler, type ComputeHolderDesc, type Context, type RenderHolderDesc } from "pipegpu"
import { DepthCopyComponent } from "../../../../shaderGraph/component/DepthCopyComponent";
import type { DepthTextureSnippet } from "../../../../shaderGraph/snippet/DepthTextureSnippet";
import type { TextureStorage2DSnippet } from "../../../../shaderGraph/snippet/TextureStorage2DSnippet";

const initDepthCopyComponent = (
    context: Context,
    compiler: Compiler,
    depthTexture: Texture2D,
    hzbTextureStorage: TextureStorage2D,
    depthTextureSnippet: DepthTextureSnippet,
    hzbTextureStorageSnippet: TextureStorage2DSnippet,
) => {

    // 还原 texture view 
    depthTexture.cursor(0);
    hzbTextureStorage.cursor(0);

    const W: number = depthTexture.Width;
    const H: number = depthTexture.Height;
    const depthClearComponent: DepthCopyComponent = new DepthCopyComponent(
        context,
        compiler,
        depthTextureSnippet,
        hzbTextureStorageSnippet
    );

    const WGSLCode: string = depthClearComponent.build();

    const dispatch = new ComputeProperty(
        W / depthClearComponent.getWorkGrpoupSize()[0],
        H / depthClearComponent.getWorkGrpoupSize()[1],
        1
    );

    const desc: ComputeHolderDesc = {
        label: 'depth copy component',
        computeShader: compiler.createComputeShader({
            code: WGSLCode,
            entryPoint: `cp_main`,
        }),
        uniforms: new Uniforms(),
        dispatch: dispatch,
    };

    desc.uniforms?.assign(depthTextureSnippet.getVariableName(), depthTexture);
    desc.uniforms?.assign(hzbTextureStorageSnippet.getVariableName(), hzbTextureStorage);

    desc.handler = (encoder: GPUCommandEncoder) => {
        const extent3d: GPUExtent3DStrict = {
            width: W,
            height: H,
            depthOrArrayLayers: 1
        };

        const src: GPUTexelCopyTextureInfo = {
            texture: hzbTextureStorage.getGpuTexture(),
            mipLevel: 0,
            origin: [0, 0, 0],
            aspect: 'all'
        };

        const dst: GPUTexelCopyTextureInfo = {
            texture: 
        };

        source: ,
            destination: GPUTexelCopyTextureInfo,
                copySize: GPUExtent3DStrict

        encoder.copyTextureToTexture()
    };

    const holder: ComputeHolder | undefined = compiler.compileComputeHolder(desc);

    return holder;
}

export {
    initDepthCopyComponent
}