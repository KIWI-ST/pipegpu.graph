import { Compiler } from "pipegpu";
import { BaseSnippet, IShaderCode, ShaderCodeFormat } from "../BaseSnippet";
import { Vec3 } from "kiwi.matrix";

interface IPointLight {
    position: Vec3,
    color: Vec3
}

/**
 * 
 */
class PointLightSnippet extends BaseSnippet {
    /**
     * 
     * @param compiler 
     */
    constructor(compiler: Compiler) {
        super(compiler, 'point_light_desc_snippet');
    }

    /**
     * 
     * @param groupIndex 
     * @param bindingIndex 
     * @param shaderCodeFormat 
     * @returns 
     */
    initShaderCode(groupIndex: number, bindingIndex: number, shaderCodeFormat: ShaderCodeFormat): IShaderCode {
        this.shaderCode.structName = `POINT_LIGHT`;
        this.shaderCode.structCode = `
        
        struct ${this.shaderCode.structName}
        {
            position: vec3<f32>,
	        color: vec3<f32>,
        }

        `;
        this.shaderCode.variableName = `point_light_${this.snippetStatsID}`;
        this.shaderCode.variableCode = `
        
        @group(${groupIndex}) @binding(${bindingIndex}) var<uniform> ${this.shaderCode.variableName} : ${this.shaderCode.structName};
        
        `;

        return this.shaderCode;
    }
}

export {
    type IPointLight,
    PointLightSnippet
}