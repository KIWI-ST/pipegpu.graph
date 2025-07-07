/**
 * 
 */
const MATERIAL_TYPE_MAP: Map<number, string> = new Map();

MATERIAL_TYPE_MAP.set(0 << 8 | 0, `kMaterialPBR`);
MATERIAL_TYPE_MAP.set(0 << 8 | 1, `kMaterialPBR1`);
MATERIAL_TYPE_MAP.set(0 << 8 | 2, `kMaterialPBR2`);
MATERIAL_TYPE_MAP.set(0 << 8 | 3, `kMaterialPBR3`);
MATERIAL_TYPE_MAP.set(1 << 8 | 0, `kMaterialPhong`);
MATERIAL_TYPE_MAP.set(1 << 8 | 1, `kMaterialPhong1`);
MATERIAL_TYPE_MAP.set(1 << 8 | 2, `kMaterialPhong2`);
MATERIAL_TYPE_MAP.set(1 << 8 | 3, `kMaterialPhong3`);
MATERIAL_TYPE_MAP.set(1 << 8 | 4, `kMaterialPhong4`);
MATERIAL_TYPE_MAP.set(1 << 8 | 5, `kMaterialPhong5`);
MATERIAL_TYPE_MAP.set(1 << 8 | 6, `kMaterialPhong6`);
MATERIAL_TYPE_MAP.set(1 << 8 | 7, `kMaterialPhong7`);
MATERIAL_TYPE_MAP.set(1 << 8 | 8, `kMaterialPhong8`);

/**
 * 
 */
interface IMeshlet {
    selfParentBounds: Float32Array,
    indices: Uint32Array,
}

/**
 * 
 */
interface IMeshDataPack {
    key: string,
    vertices: Float32Array,
    meshlets: Array<IMeshlet>,
}

/**
 * 
 * @param uri 
 * @param _key 
 */
const fetchHDMF = async (uri: string, key: string = ""): Promise<IMeshDataPack> => {
    const response = await fetch(uri);
    if (!response.ok) {
        throw new Error(`[E][fetchHDMF ] .hdmf load failed, response code: ${response.status}`);
    }
    const json = await response.json();
    if (json.buffers.length != 1) {
        throw new Error(`[E][fetchHDMF] invalid .hdmf format, please check.`);
    }
    const str: string = json.buffers[0].uri;
    const base64Str = str.replace('data:application/octet-stream;base64,', '');
    const binaryString = atob(base64Str);
    const length = binaryString.length;
    const uint8Array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }
    const meshletBoundLength = 5 * 4 * 2;

    // meshlet array data
    const meshlets: Array<IMeshlet> = [];
    // bufferview [0] must vertices.
    const vertices: Float32Array = new Float32Array(uint8Array.buffer, 0, json.bufferViews[0].byteLength / 4);
    // bufferview [1] - [length] must meshlet pack array.
    for (let k = 1; k < json.bufferViews.length; k++) {
        const bufferView = json.bufferViews[k];
        const offset = bufferView.byteOffset || 0;
        // meshlet bounds, order:
        // - self meshlet bound center x/y/z, radius, error
        // - parent meshlet bound center x/y/z, radius, error
        // [x, y, z, radius, error, x, y, z, radius, error]
        const meshletBounds: Float32Array = new Float32Array(uint8Array.buffer, offset, meshletBoundLength / 4);    // float
        const meshletIndex: Uint32Array = new Uint32Array(uint8Array.buffer, offset + meshletBoundLength, (bufferView.byteLength - meshletBoundLength) / 4);    // uint32
        const meshlet: IMeshlet = {
            selfParentBounds: meshletBounds,
            indices: meshletIndex
        };
        meshlets.push(meshlet);
    }

    return {
        key: key,
        vertices: vertices,
        meshlets: meshlets
    }
}


export {
    type IMeshDataPack,
    fetchHDMF
}