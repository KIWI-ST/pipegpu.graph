import { fetchKTX2AsBc7RGBA, type KTXPackData } from './util/fetchKTX';
import { fetchHDMF, type MeshDataPack } from './util/fetchHDMF';
import { nanoEntry } from './plugin/nano/nanoEntry';
import { cesiumEntry, SCENE_CAMERA } from './plugin/cesium/CesiumEntry';
import { GeodeticCoordinate } from './plugin/nano/earth/GeodeticCoordinate';
import { Ellipsoid, PSEUDOMERCATOR } from './plugin/nano/earth/Ellipsoid';

(async () => {

    // init cesium
    {
        await cesiumEntry();
    }

    // init nano
    {
        await nanoEntry(SCENE_CAMERA);
    }

    // const renderLoop = () => {
    //     ctx.refreshFrameResource();
    //     const encoder = ctx.getCommandEncoder();
    //     holder.build(encoder);
    //     ctx.submitFrameResource();
    //     requestAnimationFrame(renderLoop);
    // };
    // requestAnimationFrame(renderLoop);

})();


