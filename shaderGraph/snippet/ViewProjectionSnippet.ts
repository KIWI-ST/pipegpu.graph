import { Compiler, UniformBuffer } from 'pipegpu';
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from '../BaseSnippet';
import { type Handle1D } from 'pipegpu/src/res/buffer/BaseBuffer';

/**
 * ViewProjectionSnippet is a shader code snippet that provides the view and projection matrices.
 */
class ViewProjectionSnippet extends BaseSnippet {
    /**
     * 
     * 
     * @param compiler The compiler instance used for shader compilation.
     * 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'view_projection_snippet');
    }

    /**
     * 
     * @param handler 
     * @returns 
     */
    public getBuffer(handler: Handle1D): UniformBuffer {
        const buffer = this.compiler.createUniformBuffer({
            handler: handler
        });
        return buffer;
    }

    /**
     * Initializes the shader code with the provided parameters.
     * @param groupIndex The index of the group.
     * @param bindingIndex The index of the binding.
     * @param shaderCodeFormat The format of the shader code.
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `VIEWPROJECTION`;
        this.shaderCode.structCode = `
        
        struct ${this.shaderCode.structName}
        {
            projection: mat4x4<f32>,
            view: mat4x4<f32>,
        };

        `;
        this.shaderCode.variableName = `view_projection_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `

        @group(${groupIndex}) @binding(${bindingIndex}) var<uniform> ${this.shaderCode.variableName}: ${this.shaderCode.structName};

        `;

        return this.shaderCode;
    }
}

export {
    ViewProjectionSnippet
}