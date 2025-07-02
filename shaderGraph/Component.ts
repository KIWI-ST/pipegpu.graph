import { Compiler, Context } from "pipegpu";
import { BaseSnippet } from "./BaseSnippet";
import { Vec3 } from "kiwi.matrix";

abstract class BaseComponent {
    /**
     * BaseComponent is an abstract class that serves as a base for all components in the shader graph.
     */
    protected context: Context;

    /**
     * The compiler instance used to compile shader code snippets.
     */
    protected compiler: Compiler;

    /**
     * An array of shader code snippets associated with this component.
     */
    protected snippetArray: BaseSnippet[];

    constructor(context: Context, compiler: Compiler) {
        this.context = context;
        this.compiler = compiler;
        this.snippetArray = [];
    }

    abstract build(): string;
}


abstract class RenderComponent extends BaseComponent {

    constructor(context: Context, compiler: Compiler) {
        super(context, compiler);
    }

}

abstract class ComputeComponent extends BaseComponent {

    protected workGroupSize: Vec3;

    constructor(context: Context, compiler: Compiler) {
        super(context, compiler);
    }

    public getWorkGrpoupSize = (): Vec3 => {
        return this.workGroupSize;
    }
}

export {
    RenderComponent,
    ComputeComponent
}