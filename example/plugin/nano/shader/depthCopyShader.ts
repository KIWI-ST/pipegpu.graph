import { ComputeHolder, ComputeProperty, Texture2D, TextureStorage2D, Uniforms, type Compiler, type ComputeHolderDesc, type Context } from "pipegpu"
import { DepthCopyComponent } from "../../../../shaderGraph/component/DepthCopyComponent";
import type { DepthTextureSnippet } from "../../../../shaderGraph/snippet/DepthTextureSnippet";
import type { TextureStorage2DSnippet } from "../../../../shaderGraph/snippet/TextureStorage2DSnippet";

/**
 * 
 * https://github.com/KIWI-ST/pipegpu/blob/main/example/tech/initTexelCopy.ts
 * 
 * @param context 
 * @param compiler 
 * @param sourceDepthTexture 
 * @param hzbTextureStorage 
 * @param destinationDepthTexture 
 * @param depthTextureSnippet 
 * @param hzbTextureStorageSnippet 
 * @returns 
 */
const initDepthCopyShader = (
    context: Context,
    compiler: Compiler,
    sourceDepthTexture: Texture2D,
    hzbTextureStorage: TextureStorage2D,
    destinationDepthTexture: Texture2D,
    depthTextureSnippet: DepthTextureSnippet,
    hzbTextureStorageSnippet: TextureStorage2DSnippet,

) => {

    // 还原 texture view 
    sourceDepthTexture.cursor(0);
    hzbTextureStorage.cursor(0);
    destinationDepthTexture.cursor(0);

    const W: number = sourceDepthTexture.Width;
    const H: number = sourceDepthTexture.Height;
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

    desc.uniforms?.assign(depthTextureSnippet.getVariableName(), sourceDepthTexture);
    desc.uniforms?.assign(hzbTextureStorageSnippet.getVariableName(), hzbTextureStorage);

    desc.handler = (encoder: GPUCommandEncoder) => {
        const copySize: GPUExtent3DStrict = {
            width: W,
            height: H,
            depthOrArrayLayers: 1
        };
        const source: GPUTexelCopyTextureInfo = {
            texture: hzbTextureStorage.getGpuTexture(),
            mipLevel: 0,
            origin: [0, 0, 0],
            aspect: 'all'
        };
        const destination: GPUTexelCopyTextureInfo = {
            texture: destinationDepthTexture.getGpuTexture(),
            mipLevel: 0,
            origin: [0, 0, 0],
            aspect: 'all'

        };
        encoder.copyTextureToTexture(source, destination, copySize);
    };

    const holder: ComputeHolder | undefined = compiler.compileComputeHolder(desc);

    return holder;
}

export {
    initDepthCopyShader
}