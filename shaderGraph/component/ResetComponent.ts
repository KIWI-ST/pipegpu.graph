import type { Compiler, Context } from "pipegpu";
import { ComputeComponent } from "../ComputerComponen";
import type { StorageAtomicU32Snippet } from "../snippet/StorageAtomicU32Snippet";
import type { DebugSnippet } from "../snippet/DebugSnippet";

/**
 * 
 * for nanite-like rendering pipeline
 * 
 */
class ResetComponent extends ComputeComponent {
    /**
     * 
     */
    debugSnippet: DebugSnippet;

    /**
     * 
     */
    runtimeInstanceCountSnippet: StorageAtomicU32Snippet;

    /**
     * 
     */
    runtimeMeshletCountSnippet: StorageAtomicU32Snippet;

    /**
     * 
     */
    runtimeTriangleCountSnippet: StorageAtomicU32Snippet;

    /**
     * 
     * @param context 
     * @param compiler 
     * @param debugSnippet 
     * @param runtimeInstanceCountSnippet 
     * @param runtimeMeshletCountSnippet 
     * @param runtimeIndirectDrawCount 
     */
    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        runtimeInstanceCountSnippet: StorageAtomicU32Snippet,
        runtimeMeshletCountSnippet: StorageAtomicU32Snippet,
        runtimeTriangleCountSnippet: StorageAtomicU32Snippet,
    ) {
        super(context, compiler);
        this.debugSnippet = debugSnippet;
        this.runtimeInstanceCountSnippet = runtimeInstanceCountSnippet;
        this.runtimeMeshletCountSnippet = runtimeMeshletCountSnippet;
        this.runtimeTriangleCountSnippet = runtimeTriangleCountSnippet;
        this.append(this.debugSnippet);
        this.append(this.runtimeInstanceCountSnippet);
        this.append(this.runtimeMeshletCountSnippet);
        this.append(this.runtimeTriangleCountSnippet);
        this.workGroupSize = [1, 1, 1];
    }

    override build(): string {
        let wgslCode = super.build();
        wgslCode += `

@compute @workgroup_size(${this.workGroupSize[0]}, ${this.workGroupSize[1]}, ${this.workGroupSize[2]})
fn cp_main(@builtin(global_invocation_id) global_index: vec3<u32>)
{
    atomicStore(&${this.runtimeInstanceCountSnippet.getVariableName()}, 0u);
    atomicStore(&${this.runtimeMeshletCountSnippet.getVariableName()}, 0u);
    atomicStore(&${this.runtimeTriangleCountSnippet.getVariableName()}, 0u);
}

        `;
        return wgslCode;
    }

}

export {
    ResetComponent
}