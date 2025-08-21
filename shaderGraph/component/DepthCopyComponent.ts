import type { Compiler, Context } from "pipegpu";
import { ComputeComponent } from "../ComputerComponen";
import type { DepthTextureSnippet } from "../snippet/DepthTextureSnippet";
import type { TextureStorage2DR32FSnippet } from "../snippet/TextureStorage2DR32FSnippet";
import type { DebugSnippet } from "../snippet/DebugSnippet";

/**
 * 
 */
class DepthCopyComponent extends ComputeComponent {
    /**
     * 
     */
    private depthTextureSnippet: DepthTextureSnippet;

    /**
     * 
     */
    private textureStorage2DSnippet: TextureStorage2DR32FSnippet;

    /**
     * 
     */
    private debugSnippet: DebugSnippet;

    /**
     * 
     * @param context 
     * @param compiler 
     * @param depthTextureSnippet 
     * @param textureStorage2DSnippet 
     */
    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        depthTextureSnippet: DepthTextureSnippet,
        textureStorage2DSnippet: TextureStorage2DR32FSnippet
    ) {
        super(context, compiler);
        this.debugSnippet = debugSnippet;
        this.depthTextureSnippet = depthTextureSnippet;
        this.textureStorage2DSnippet = textureStorage2DSnippet;
        this.append(this.debugSnippet);
        this.append(this.depthTextureSnippet);
        this.append(this.textureStorage2DSnippet);
        this.workGroupSize = [1, 1, 1];
    }

    /**
     * 
     * @returns 
     */
    override build(): string {
        let computeCode = super.build();

        computeCode += `

@compute @workgroup_size(${this.workGroupSize[0]}, ${this.workGroupSize[1]}, ${this.workGroupSize[2]})
fn cp_main(@builtin(global_invocation_id) global_id: vec3<u32>) 
{
    let r: f32 = textureLoad(${this.depthTextureSnippet.getVariableName()}, global_id.xy, 0);
    let color4: vec4<f32> = vec4<f32>(r, 0.0, 0.0, 1.0);
    textureStore(${this.textureStorage2DSnippet.getVariableName()}, global_id.xy, color4);

    /////////////////////////////////////DEBUG-START///////////////////////////////////////
    // ${this.debugSnippet.getVariableName()}[0].d = r;
    /////////////////////////////////////DEBUG-END///////////////////////////////////////
}

        `;

        return computeCode;
    }

}

export {
    DepthCopyComponent
}