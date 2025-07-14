import { Compiler, DepthStencilAttachment, Texture2D } from "pipegpu";
import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

/**
 * DepthTextureSnippet class extends BaseSnippet to handle depth texture snippets.
 */
class DepthTextureSnippet extends BaseSnippet {
    /**
     * 
     * @param compiler The compiler instance used for shader compilation.
     * This constructor initializes the DepthTextureSnippet with the given compiler and sets the snippet format.
     */
    constructor(compiler: Compiler) {
        super(compiler, 'depth_texture_snippet');
    }

    /**
     * Returns the snippet format for the depth texture snippet.
     * This method is used to retrieve the format of the shader code snippet.
     * @returns The format of the shader code snippet, e.g., 'depth_texture_snippet'.
     */
    public getTexture(depthAttachment: DepthStencilAttachment): Texture2D {
        return depthAttachment.getTexture();
    }

    /**
     * Initializes the shader code for the depth texture snippet.
     * This method is called to set up the shader code with the appropriate group and binding indices.
     * @param groupIndex The index of the group in the shader code.
     * @param bindingIndex The index of the binding in the shader code.
     * @param shaderCodeFormat The format of the shader code, e.g., renderer or computer.
     * @returns An instance of IShaderCode containing the initialized shader code.
     */
    override initShaderCode(groupIndex: number, bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `texture_depth_2d`;
        this.shaderCode.variableName = `depth_texture_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `

@group(${groupIndex}) @binding(${bindingIndex}) var ${this.shaderCode.variableName}: ${this.shaderCode.structName};

        `;

        return this.shaderCode;
    }

}

export {
    DepthTextureSnippet
}