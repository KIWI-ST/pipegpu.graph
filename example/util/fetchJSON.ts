import { Mat4 } from "pipegpu.matrix";

type Instance = {
    id: string,
    mesh_id: string,
    model: Mat4
}

type InstanceDataPack = {
    key: string,
    instances: Instance[],
}

const fetchInstanceDescJSON = async (uri: string, key: string): Promise<InstanceDataPack | undefined> => {
    try {
        const response = await fetch(uri);
        if (!response.ok) {
            console.log(`[E][fetchJSON] json load failed, response code: ${response.status}`);
            return undefined;
            // throw new Error(`[E][fetchJSON] json load failed, response code: ${response.status}`);
        }
        const json = await response.json();
        const instanceDataPack: InstanceDataPack = {
            key: key,
            instances: []
        };
        json.instances.forEach((instance: any) => {
            const item: Instance = {
                id: instance.id,
                mesh_id: instance.mesh_id,
                model: new Mat4().set(
                    instance.model[0], instance.model[1], instance.model[2], instance.model[3],
                    instance.model[4], instance.model[5], instance.model[6], instance.model[7],
                    instance.model[8], instance.model[9], instance.model[10], instance.model[11],
                    instance.model[12], instance.model[13], instance.model[14], instance.model[15],
                )
            };
            instanceDataPack.instances.push(item);
        });
        return instanceDataPack;
    }
    catch (error) {
        // throw new Error(`[E][fetchJSON] json load failed, error message: ${error}`);
        console.log(`[E][fetchJSON] json load failed, error message: ${error}`);
        return undefined;
    }
};

const fetchGeoTilesetJSON = async (uri: string, key: string): Promise<{ key: string, rawData: string[] } | undefined> => {
    try {
        const response = await fetch(uri);
        if (!response.ok) {
            console.log(`[E][fetchJSON] geoTilesetJson load failed, response code: ${response.status}`);
            return undefined;
        }
        const json = await response.json();
        return {
            key: key,
            rawData: json['vaild_tiles'],
        };
    }
    catch (error) {
        console.log(`[E][fetchJSON] geoTilesetJson failed, error message: ${error}`);
        return undefined;
    }
};

export {
    type Instance,
    type InstanceDataPack,
    fetchInstanceDescJSON,
    fetchGeoTilesetJSON
}

