import { Attributes, ColorAttachment, DepthStencilAttachment, RenderHolder, RenderProperty, Uniforms, type Compiler, type Context, type RenderHolderDesc } from "pipegpu"
import { DepthClearComponent } from "../../../../shaderGraph/component/DepthClearComponent"

const initDepthClearComponent = (
    context: Context,
    compiler: Compiler,
    colorAttachments: ColorAttachment[],
    depthStencilAttachment: DepthStencilAttachment,
) => {
    const dispatch = new RenderProperty(6, 1);

    const depthClearComponent: DepthClearComponent = new DepthClearComponent(context, compiler);

    const WGSLCode: string = depthClearComponent.build();

    const clearDepthStencilAttachment = compiler.createDepthStencilAttachment({
        texture: depthStencilAttachment.getTexture(),
        depthLoadStoreFormat: 'loadStore',
        depthReadOnly: false,
        depthCompareFunction: 'less-equal',
        depthClearValue: 1.0
    });

    const desc: RenderHolderDesc = {
        label: 'depth clear component',
        vertexShader: compiler.createVertexShader({
            code: WGSLCode,
            entryPoint: `vs_main`,
        }),
        fragmentShader: compiler.createFragmentShader({
            code: WGSLCode,
            entryPoint: `fs_main`,
        }),
        dispatch: dispatch,
        colorAttachments: colorAttachments,
        depthStencilAttachment: clearDepthStencilAttachment,
        attributes: new Attributes(),
        uniforms: new Uniforms(),
    };

    const holder: RenderHolder | undefined = compiler.compileRenderHolder(desc);
    return holder;
}

export {
    initDepthClearComponent
}