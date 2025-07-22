import { fetchKTX2AsBc7RGBA, type KTXPackData } from './util/fetchKTX';
import { fetchHDMF, type MeshDataPack } from './util/fetchHDMF';
import { nanoEntry } from './plugin/nano/nanoEntry';
import { cesiumEntry, SCENE_CAMERA } from './plugin/cesium/CesiumEntry';
import { GeodeticCoordinate } from './plugin/nano/earth/GeodeticCoordinate';
import { Ellipsoid, PSEUDOMERCATOR } from './plugin/nano/earth/Ellipsoid';
import { nanoEntry2 } from './plugin/nano/nanoEntry2';
import { nanoEntry3 } from './plugin/nano/nanoEntry3';

(async () => {

    // {
    //     const hdmf = await fetchHDMF(`http://127.0.0.1/output/Azalea_LowPoly/8bc8d8adeb08b02a2161dd2b06c67585621d4f9bb98e73279155d498f40e5d92.hdmf`, "8bc8d8adeb08b02a2161dd2b06c67585621d4f9bb98e73279155d498f40e5d92");
    //     console.log(hdmf);
    // }

    // init cesium
    {
        await cesiumEntry();
        await nanoEntry(SCENE_CAMERA);
        // await nanoEntry3();
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


