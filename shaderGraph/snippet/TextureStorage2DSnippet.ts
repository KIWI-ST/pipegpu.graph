import { BaseSnippet, type IShaderCode, type ShaderCodeFormat } from "../BaseSnippet";

class TextureStorage2DSnippet extends BaseSnippet {

    override initShaderCode(_groupIndex: number, _bindingIndex: number, _shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        throw new Error("Method not implemented.");
    }

}

export {
    TextureStorage2DSnippet
}