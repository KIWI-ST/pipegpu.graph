const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');

let ktx;

/**
 *
 * ref:
 * https://github.khronos.org/KTX-Software/ktxjswrappers/libktx_js.html
 * @param uri
 * @param key
 * @returns Promise<KTX2Container>
 *
 */
const fetchKTX = async (uri: string, key?: string): Promise<string> => {
    try {
        ktx = ktx || await createKtxModule();
        const response = await fetch(uri);
        if (!response.ok) {
            throw new Error(`[E][fetchKTX ] KTX load failed, response code: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const ktxdata = new Uint8Array(arrayBuffer);
        const ktexture = new ktx.texture(ktxdata);
        // ktexture.transcodeBasis(trans)
        console.log(ktx.transcode_fmt);


        return ktexture;
    } catch (error) {
        throw new Error(`[E][fetchKTX ] KTX load failed, response code: ${error}`);
    }
};

export {
    fetchKTX
}