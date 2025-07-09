import type { Compiler, Context } from "pipegpu";
import { BaseComponent } from "./BaseComponent";

/**
 * 
 */
abstract class ComputeComponent extends BaseComponent {
    /**
     * 
     */
    protected workGroupSize: number[] = [1, 1, 1];

    /**
     * 
     * @param context 
     * @param compiler 
     */
    constructor(context: Context, compiler: Compiler) {
        super(context, compiler);
    }

    /**
     * 
     * @returns 
     */
    public getWorkGrpoupSize = (): number[] => {
        return this.workGroupSize;
    }

    /**
     * 
     * @returns 
     */
    override build(): string {
        let code: string = "";
        let step: number = 0;
        const requestExtentSet: Set<string> = new Set();
        this.snippetArray.forEach(snippet => {
            const groups: number = Math.floor(step / this.maxBindGroup);
            const bindings: number = Math.floor(step % this.maxBindingsPerBindGroup);
            if (groups >= this.maxBindGroup) {
                throw new Error(`[E][RenderShader][Build] build render shader code failed. max bind group limit: ${this.maxBindGroup}.`);
            }
            const shader_code = snippet.initShaderCode(groups, bindings, 'computer');
            code += shader_code.structCode;
            requestExtentSet.add(shader_code.requireExtentCode);
            if (shader_code.variableCode.trim().length) {
                code += shader_code.variableCode;
                step++;
            }
        });
        requestExtentSet.forEach(requestExtent => {
            code = requestExtent + code;
        });
        return code;
    }
}

export {
    ComputeComponent
}