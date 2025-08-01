import type { Compiler, Context } from "pipegpu";
import { ComputeComponent } from "../ComputerComponen";
import type { DebugSnippet } from "../snippet/DebugSnippet";
import type { ViewProjectionSnippet } from "../snippet/ViewProjectionSnippet";
import type { ViewPlaneSnippet } from "../snippet/ViewPlaneSnippet";

class CullingInstanceComponent extends ComputeComponent {

    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        viewProjectionSnippet: ViewProjectionSnippet,
        viewPlaneSnippet: ViewPlaneSnippet
    ) {
        super(context, compiler);
    }

}

export {
    CullingInstanceComponent
}