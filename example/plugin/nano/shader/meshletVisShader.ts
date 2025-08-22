import { ColorAttachment, DepthStencilAttachment, RenderHolder, RenderProperty, Uniforms, type Compiler, type Context, type RenderHolderDesc } from "pipegpu";
import { MeshletVisComponent } from "../../../../shaderGraph/component/MeshletVisComponent";
import type { EarthScene } from "../EarthScene";
import type { FragmentDescSnippet } from "../../../../shaderGraph/snippet/FragmentDescSnippet";
import type { VertexSnippet } from "../../../../shaderGraph/snippet/VertexSnippet";
import type { InstanceDescSnippet } from "../../../../shaderGraph/snippet/InstanceDescSnippet";
import type { ViewProjectionSnippet } from "../../../../shaderGraph/snippet/ViewProjectionSnippet";
import type { ViewSnippet } from "../../../../shaderGraph/snippet/ViewSnippet";
import type { MeshDescSnippet } from "../../../../shaderGraph/snippet/MeshDescSnippet";
import type { IndexedStorageSnippet } from "../../../../shaderGraph/snippet/IndexedStorageSnippet";
import type { StorageArrayU32Snippet } from "../../../../shaderGraph/snippet/StorageArrayU32Snippet";

const initMeshletVisShader = (
    context: Context,
    compiler: Compiler,
    earthScene: EarthScene,
    colorAttachments: ColorAttachment[],
    depthStencilAttachment: DepthStencilAttachment,
    snippets: {
        fragmentSnippet: FragmentDescSnippet,
        vertexSnippet: VertexSnippet,
        instanceDescSnippet: InstanceDescSnippet,
        viewProjectionSnippet: ViewProjectionSnippet,
        viewSnippet: ViewSnippet,
        meshDescSnippet: MeshDescSnippet,
        indexedStorageSnippet: IndexedStorageSnippet,
        instanceOrderSnippet: StorageArrayU32Snippet
    }
): RenderHolder => {
    const dispatch: RenderProperty = new RenderProperty(
        earthScene.StaticIndexedStorageBuffer,
        earthScene.IndexedIndirectBuffer,
        earthScene.IndirectDrawCountBuffer,
        () => {
            return earthScene.MaxMeshletCount;
        }
    );

    const meshletVisComponent: MeshletVisComponent = new MeshletVisComponent(
        context,
        compiler,
        snippets.fragmentSnippet,
        snippets.vertexSnippet,
        snippets.instanceDescSnippet,
        snippets.viewProjectionSnippet,
        snippets.viewSnippet,
        snippets.meshDescSnippet,
        snippets.indexedStorageSnippet,
        snippets.instanceOrderSnippet
    );

    const WGSLCode = meshletVisComponent.build();

    const desc: RenderHolderDesc = {
        label: 'meshlet vis component',
        vertexShader: compiler.createVertexShader({
            code: WGSLCode,
            entryPoint: `vs_main`,
        }),
        fragmentShader: compiler.createFragmentShader({
            code: WGSLCode,
            entryPoint: `fs_main`,
        }),
        dispatch: dispatch,
        colorAttachments: colorAttachments,
        depthStencilAttachment: depthStencilAttachment,
        uniforms: new Uniforms(),
        primitiveDesc: {
            primitiveTopology: 'triangle-list',
            cullFormat: 'backCW'
        }
    };

    desc.uniforms?.assign(snippets.vertexSnippet.getVariableName(), earthScene.VertexBuffer);
    desc.uniforms?.assign(snippets.instanceDescSnippet.getVariableName(), earthScene.InstanceDescBuffer);
    desc.uniforms?.assign(snippets.viewProjectionSnippet.getVariableName(), earthScene.ViewProjectionBuffer);
    desc.uniforms?.assign(snippets.meshDescSnippet.getVariableName(), earthScene.MeshDescBuffer);
    desc.uniforms?.assign(snippets.instanceOrderSnippet.getVariableName(), earthScene.InstanceOrderBuffer);

    earthScene.forceInitSceneManager();

    const holder: RenderHolder = compiler.compileRenderHolder(desc);
    return holder;
}

export {
    initMeshletVisShader
}