import { fetchKTX2AsBc7RGBA, type IKTXPack } from './util/fetchKTX';
import { fetchHDMF, type MeshDataPack } from './util/fetchHDMF';
import { PSEUDOMERCATOR } from './plugin/cesium/Ellipsoid';
import { GeodeticCoordinate } from './plugin/cesium/GeodeticCoordinate';
import { cesiumEntry, SCENE_CAMERA } from './plugin/cesium/CesiumEntry';
import { nanoEntry } from './plugin/nano/nanoEntry';

(async () => {

    // init cesium
    {
        await cesiumEntry();
    }

    // init nano
    {
        await nanoEntry(SCENE_CAMERA);
    }

    {
        const latitude: number = 30.593098;
        const longitude: number = 114.305392;
        const geoLocation: GeodeticCoordinate = new GeodeticCoordinate(longitude, latitude);
        const viewRectangle3DCenter = PSEUDOMERCATOR.geographicToSpace(geoLocation);
        console.log(viewRectangle3DCenter);
    }

    {
        // const meshDataPack0: MeshDataPack = await fetchHDMF('/example/asset/hdmf/0010549f74c8f50e81b1fe5ea863abc7c2e0fe5bd48a46efbbbecf29a0215975.hdmf');
        // console.log(meshDataPack0);
    }

    {
        const meshDataPack1: MeshDataPack = await fetchHDMF('http://127.0.0.1/output/BistroExterior/0010549f74c8f50e81b1fe5ea863abc7c2e0fe5bd48a46efbbbecf29a0215975.hdmf');
        console.log(meshDataPack1);
    }

    {
        const ktxPack: IKTXPack = await fetchKTX2AsBc7RGBA('/example/asset/container.ktx');
        console.log(ktxPack);
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


