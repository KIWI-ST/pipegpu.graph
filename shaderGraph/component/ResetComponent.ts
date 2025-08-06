import type { Compiler, Context } from "pipegpu";
import { ComputeComponent } from "../ComputerComponen";
import type { StorageAtomicU32Snippet } from "../snippet/StorageAtomicU32Snippet";

/**
 * 
 * for nanite-like rendering pipeline
 * - indirect draw count set to zero.
 * 
 */
class ResetComponent extends ComputeComponent {

    indirectDrawCount: StorageAtomicU32Snippet;

    constructor(
        context: Context,
        compiler: Compiler,
        indirectDrawCount: StorageAtomicU32Snippet,
    ) {
        super(context, compiler);
        this.indirectDrawCount = indirectDrawCount;

        this.append(indirectDrawCount);

        this.workGroupSize = [1, 1, 1];
    }

    override build(): string {
        let wgslCode = super.build();
        wgslCode += `

@compute @workgroup_size(${this.workGroupSize[0]}, ${this.workGroupSize[1]}, ${this.workGroupSize[2]})
fn cp_main(@builtin(global_invocation_id) global_index: vec3<u32>)
{
    atomicStore(&${this.indirectDrawCount.getVariableName()}, 0u);
}

        `;
        return wgslCode;
    }

}

export {
    ResetComponent
}