import type { Compiler, Context } from "pipegpu";
import { RenderComponent } from "../BaseComponent";
import type { DebugSnippet } from "../snippet/DebugSnippet";
import type { FragmentDescSnippet } from "../snippet/FragmentDescSnippet";
import type { VertexSnippet } from "../snippet/VertexSnippet";
import type { ViewProjectionSnippet } from "../snippet/ViewProjectionSnippet";
import type { ViewSnippet } from "../snippet/ViewSnippet";
import type { InstanceDescSnippet } from "../snippet/InstanceDescSnippet";
import type { MeshDescSnippet } from "../snippet/MeshDescSnippet";
import type { MaterialPhongDescSnippet } from "../snippet/MaterialPhongSnippet";
import type { StorageArrayU32Snippet } from "../snippet/StorageArrayU32Snippet";
import type { StorageIndexSnippet } from "../snippet/StorageIndexSnippet";
import type { PointLightSnippet } from "../snippet/PointLightSnippet";
import type { Texture2DArraySnippet } from "../snippet/Texture2DArraySnippet";
import type { TextureSamplerSnippet } from "../snippet/TextureSamplerSnippet";

class MeshPhongBindlessComponent extends RenderComponent {

    private debugSnippet: DebugSnippet;
    private fragmentSnippet: FragmentDescSnippet;
    private vertexSnippet: VertexSnippet;
    private viewProjectionSnippet: ViewProjectionSnippet;
    private viewSnippet: ViewSnippet;
    private instanceDescSnippet: InstanceDescSnippet;
    private meshDescSnippet: MeshDescSnippet;
    private materialPhongSnippet: MaterialPhongDescSnippet;
    private instanceOrder: StorageArrayU32Snippet;
    private storageIndexSnippet: StorageIndexSnippet;
    private pointLightSnippet: PointLightSnippet;
    private materialTexture2DArraySnippet: Texture2DArraySnippet;
    private textureSamplerSnippet: TextureSamplerSnippet;

    constructor(
        context: Context,
        compiler: Compiler,
        debugSnippet: DebugSnippet,
        fragmentSnippet: FragmentDescSnippet,
        vertexSnippet: VertexSnippet,
        viewProjectionSnippet: ViewProjectionSnippet,
        viewSnippet: ViewSnippet,
        instanceDescSnippet: InstanceDescSnippet,
        meshDescSnippet: MeshDescSnippet,
        materialPhongSnippet: MaterialPhongDescSnippet,
        instanceOrder: StorageArrayU32Snippet,
        storageIndexSnippet: StorageIndexSnippet,
        pointLightSnippet: PointLightSnippet,
        materialTexture2DArraySnippet: Texture2DArraySnippet,
        textureSamplerSnippet: TextureSamplerSnippet
    ) {
        super(context, compiler);
        this.debugSnippet = debugSnippet;
        this.fragmentSnippet = fragmentSnippet;
        this.vertexSnippet = vertexSnippet;
        this.viewProjectionSnippet = viewProjectionSnippet;
        this.viewSnippet = viewSnippet;
        this.instanceDescSnippet = instanceDescSnippet;
        this.meshDescSnippet = meshDescSnippet;
        this.materialPhongSnippet = materialPhongSnippet;
        this.instanceOrder = instanceOrder;
        this.storageIndexSnippet = storageIndexSnippet;
        this.pointLightSnippet = pointLightSnippet;
        this.materialTexture2DArraySnippet = materialTexture2DArraySnippet;
        this.textureSamplerSnippet = textureSamplerSnippet;
        this.append(debugSnippet);
        this.append(fragmentSnippet);
        this.append(vertexSnippet);
        this.append(viewProjectionSnippet);
        this.append(viewSnippet);
        this.append(instanceDescSnippet);
        this.append(meshDescSnippet);
        this.append(materialPhongSnippet);
        this.append(instanceOrder);
        this.append(storageIndexSnippet);
        this.append(pointLightSnippet);
        this.append(materialTexture2DArraySnippet);
        this.append(textureSamplerSnippet);
    }


    build(): string {
        throw new Error("Method not implemented.");
    }



}

export {
    MeshPhongBindlessComponent
}

