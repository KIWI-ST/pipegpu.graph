import { ComputeProperty, Uniforms, type Compiler, type ComputeHolder, type ComputeHolderDesc, type Context, type Texture2D, type TextureStorage2D } from "pipegpu";
import type { Texture2DSnippet } from "../../../../shaderGraph/snippet/Texture2DSnippet";
import type { TextureStorage2DSnippet } from "../../../../shaderGraph/snippet/TextureStorage2DSnippet";
import { DownsamplingComponent } from "../../../../shaderGraph/component/DownSamplingComponent";

const downsamplingShader = (
    context: Context,
    compiler: Compiler,
    hzbTextureSnippet: Texture2DSnippet,
    hzbTexture: Texture2D,
    hzbTextureStorage2DSnippet: TextureStorage2DSnippet,
    hzbTextureStorage2D: TextureStorage2D,
) => {
    const WIDTH = hzbTexture.Width;
    const HEIGHT = hzbTexture.Height;
    const holders: ComputeHolder[] = [];

    const downsamplingComponent: DownsamplingComponent = new DownsamplingComponent(
        context,
        compiler,
        hzbTextureSnippet,
        hzbTextureStorage2DSnippet
    );

    const WGSLCode = downsamplingComponent.build();

    for (let k = 1; k < hzbTextureStorage2D.MipmapCount; k++) {
        let srcCursor = k - 1, destCursor = k;
        hzbTexture.cursor(srcCursor);
        hzbTextureStorage2D.cursor(destCursor);
        const desc: ComputeHolderDesc = {
            label: `downsampling_shader_${k}`,
            computeShader: compiler.createComputeShader({
                code: WGSLCode,
                entryPoint: 'cp_main'
            }),
            uniforms: new Uniforms(),
            dispatch: new ComputeProperty(
                Math.ceil((hzbTexture.Width >> k) / downsamplingComponent.getWorkGrpoupSize()[0]),
                Math.ceil((hzbTexture.Height >> k) / downsamplingComponent.getWorkGrpoupSize()[1]),
                1
            ),
        };
        desc.uniforms?.assign(hzbTextureSnippet.getVariableName(), hzbTexture);
        desc.uniforms?.assign(hzbTextureStorage2DSnippet.getVariableName(), hzbTextureStorage2D);
        desc.handler = (_encoder: GPUCommandEncoder): void => {
            const copySize: GPUExtent3DStrict = {
                width: WIDTH >> destCursor,
                height: HEIGHT >> destCursor,
                depthOrArrayLayers: 1
            };
            const src: GPUTexelCopyTextureInfo = {
                texture: hzbTexture.getGpuTexture(),
                mipLevel: 0,
                origin: [0, 0, 0],
                aspect: 'all'
            };
            const dst: GPUTexelCopyTextureInfo = {
                texture: hzbTextureStorage2D.getGpuTexture(),
                mipLevel: 0,
                origin: [0, 0, 0],
                aspect: 'all'
            };
            _encoder.copyTextureToTexture(src, dst, copySize);
        }
        holders.push(compiler.compileComputeHolder(desc));
    }

    return holders;
}

export {
    downsamplingShader
}