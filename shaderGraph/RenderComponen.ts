import type { Compiler, Context } from "pipegpu";
import { BaseComponent } from "./BaseComponent";

/**
 * 
 */
abstract class RenderComponent extends BaseComponent {
    /**
     * 
     * @param context 
     * @param compiler 
     */
    constructor(context: Context, compiler: Compiler) {
        super(context, compiler);

    }

    override build(): string {
        let code: string = "";
        let step: number = 0;
        this.snippetArray.forEach(snippet => {
            const groups: number = Math.floor(step / this.maxBindingsPerBindGroup);
            const bindings: number = Math.floor(step % this.maxBindingsPerBindGroup);
            if (groups >= this.maxBindGroup) {
                throw new Error(`[E][RenderShader][Build] build render shader code failed. max bind group limit: ${this.maxBindGroup}.`);
            }
            const shader_code = snippet.initShaderCode(groups, bindings, 'renderer');
            code += shader_code.structCode;
            if (shader_code.variableCode.trim().length) {
                code += shader_code.variableCode;
                step++;
            }
        });
        return code;
    }
}

export {
    RenderComponent
}