import type { Compiler, Context } from "pipegpu";
import type { Texture2DSnippet } from "../snippet/Texture2DSnippet";
import type { TextureStorage2DSnippet } from "../snippet/TextureStorage2DSnippet";
import { ComputeComponent } from "../ComputerComponen";

/**
 * 
 */
class DownsamplingComponent extends ComputeComponent {

    private texture2DSnippet: Texture2DSnippet;

    private textureStorage2DSnippet: TextureStorage2DSnippet;

    constructor(
        context: Context,
        compiler: Compiler,
        texture2DSnippet: Texture2DSnippet,
        textureStorage2DSnippet: TextureStorage2DSnippet
    ) {
        super(context, compiler);
        this.texture2DSnippet = texture2DSnippet;
        this.textureStorage2DSnippet = textureStorage2DSnippet;

        this.append(texture2DSnippet);
        this.append(textureStorage2DSnippet);

        this.workGroupSize = [8, 8, 1];
    }

    build(): string {
        let renderCode = super.build();
        renderCode += `

@compute @workgroup_size(${this.workGroupSize[0]}, ${this.workGroupSize[1]}, ${this.workGroupSize[2]})
fn cp_main(@builtin(global_invocation_id) global_id: vec3<u32>) 
{
    let src_dim = textureDimensions(${this.texture2DSnippet.getVariableName()});
    let dst_dim = textureDimensions(${this.textureStorage2DSnippet.getVariableName()});
    let slice_x: u32 = src_dim.x/dst_dim.x;
    let slice_y: u32 =src_dim.y/dst_dim.y;

    if(global_id.x > dst_dim.x || global_id.y>dst_dim.y) {
        return;
    }

    let src_x_start = global_id.x *slice_x; 
    let src_x_end =src_x_start +slice_x; 

    let src_y_start = global_id.y *slice_y; 
    let src_y_end =src_y_start +slice_y; 
            
    var mean: f32 = 0.0;
    for(var x = src_x_start; x<src_x_end; x++) {{
        for(var y = src_y_start; y<src_y_end; y++) {{
            let xy: vec2<u32> = vec2<u32>(x, y);
            let r: f32 = textureLoad(${this.texture2DSnippet.getVariableName()}, xy , 0).r;
            mean = max(mean, r);
        }}
    }}

    let color4: vec4<f32> = vec4<f32>(mean, 0.0, 0.0, 1.0);
    textureStore(${this.textureStorage2DSnippet.getVariableName()}, global_id.xy, color4);
}
        
        `;

        return renderCode;
    }

}

export {
    DownsamplingComponent
}