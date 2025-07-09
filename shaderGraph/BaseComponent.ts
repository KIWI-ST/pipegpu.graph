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

export {
    BaseComponent
}