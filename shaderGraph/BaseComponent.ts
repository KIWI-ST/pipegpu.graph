import { Compiler, Context } from "pipegpu";
import { BaseSnippet } from "./BaseSnippet";

/**
 * 
 */
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

    /**
     * 
     */
    protected maxBindGroup: number = 0;

    /**
     * 
     */
    protected maxBindingsPerBindGroup: number = 0;

    /**
     * 
     * @param context 
     * @param compiler 
     */
    constructor(context: Context, compiler: Compiler) {
        this.context = context;
        this.compiler = compiler;
        this.maxBindGroup = context.getLimits().maxBindGroups;
        this.maxBindingsPerBindGroup = context.getLimits().maxBindingsPerBindGroup;
        this.snippetArray = [];
    }

    /**
     * 
     * @param snippet
     */
    append(snippet: BaseSnippet) {
        this.snippetArray.push(snippet);
    }

    /**
     * 
     */
    abstract build(): string;
}

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
        return "";
    }
}

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
}

export {
    RenderComponent,
    ComputeComponent
}