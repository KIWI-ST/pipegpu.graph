import { Compiler, uniqueID } from 'pipegpu';

/**
 * Base interface for shader code snippets.
 */
interface IShaderCode {
    /**
     * 
     * shader code, e.g:
     * 
     * struct MeshDesc
     * {
     *   position: vec3<f32>;
     * }
     * 
     */
    structCode: string;

    /**
     * 
     * shader variable code, e.g:
     * @group({}) @binding({}) var<storage, read> mesh_desc_arr0: array<MeshDesc>;
     * 
     */
    variableCode: string;

    /**
     * shader variable name, e.g:
     * mesh_desc_arr0
     */
    variableName: string;

    /**
     * shader struct name, e.g:
     * MeshDesc
     */
    structName: string;

    /**
     * 
     */
    requireExtentCode: string;
}

type SnippetFormat =
    'debug_snippet' |                           //
    'depth_texture_snippet' |                   //
    'fragment_desc_snippet' |                   //
    'vertex_snippet' |                          //
    'view_projection_snippet' |
    'view_snippet' |
    'instance_desc_snippet' |
    'mesh_desc_snippet' |
    'material_phone_desc_snippet' |
    'storage_array_u32_snippet' |
    'storage_index_snippet' |
    'point_light_desc_snippet' |
    'texture_2d_array_snippet' |
    'texture_sampler_snippet'
    ;

type ShaderCodeFormat =
    'renderer' |
    'computer';

/**
 * Base class for shader code snippets.
 * It provides a structure for initializing shader code and retrieving snippet information.
 */
abstract class BaseSnippet {
    /**
     * The compiler instance used for shader compilation.
     */
    protected compiler: Compiler;

    /**
     * The format of the shader code, e.g., renderer or computer.
     */
    protected snippetFormat: SnippetFormat;

    /**
     * The shader code instance containing the code and related information.
     */
    protected shaderCode: IShaderCode;

    /**
     * The ID of the snippet stats, used for tracking performance or debugging.
     */
    protected snippetStatsID: number;

    /**
     * The format of the shader code, e.g., renderer or computer.
     * @param code shader code, e.g:
     * struct MeshDesc
     * {
     *   position: vec3<f32>;
     * }
     */
    constructor(compiler: Compiler, snippetFormat: SnippetFormat) {
        this.compiler = compiler;
        this.snippetFormat = snippetFormat;
        this.snippetStatsID = uniqueID();
        this.shaderCode = { structCode: '', variableCode: '', variableName: '', structName: '', requireExtentCode: '' };
    }

    abstract initShaderCode(groupIndex: number, bindingIndex: number, shaderCodeFormat: ShaderCodeFormat): IShaderCode;

    /**
     * return snippet type, e.g debug_snippet
     */
    getSnippetFormat = (): SnippetFormat => {
        return this.snippetFormat;
    }

    /**
     * return snippet struct (if exist) code, e.g:
     * MeshDesc
     * @returns 
     */
    getStructName = (): string => {
        return this.shaderCode.structName;
    }

    /**
     * return snippet variable name code(if exist), e.g:
     * mesh_desc_arr0
     * @returns string
     */
    getVariableName = (): string => {
        return this.shaderCode.variableName;
    }

}


export {
    type SnippetFormat,
    type ShaderCodeFormat,
    type IShaderCode,
    BaseSnippet
}