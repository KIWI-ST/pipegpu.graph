


const fetchHDMF = async (uri: string, key: string = ""): Promise<void> => {
    const response = await fetch(uri);
    if (!response.ok) {
        throw new Error(`[E][fetchHDMF ] .hdmf load failed, response code: ${response.status}`);
    }
    const json = await response.json();
    const str: string = json.buffers[0].uri;
    const base64Str = str.replace('data:application/octet-stream;base64,', '');
    const binaryString = atob(base64Str);
    const length = binaryString.length;
    const uint8Array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }

    const meshletBoundLength = 5 * 4 * 2;

    const vertices: Float32Array = new Float32Array(uint8Array.buffer, 0, 2016 / 4);
    const meshletBounds: Float32Array = new Float32Array(uint8Array.buffer, 2016, meshletBoundLength / 4);
    const meshletIndex: Uint32Array = new Uint32Array(uint8Array.buffer, 2016 + meshletBoundLength, (808 - meshletBoundLength) / 4);

    console.log(vertices);
    console.log(meshletBounds);
    console.log(meshletIndex);
    // const binaryString = atob(json.buffers[0].uri);
    // const len = binaryString.length;
    // const uint8Array = new Uint8Array(len);
    // for (let i = 0; i < len; i++) {
    //     uint8Array[i] = binaryString.charCodeAt(i);
    // }
    // console.log(uint8Array);
}


export {
    fetchHDMF
}