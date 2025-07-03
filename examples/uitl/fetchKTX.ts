// import { read } from 'ktx-parse'
// import { type KTX2Container } from 'ktx-parse'

// /**
//  *
//  * @param uri
//  * @param key
//  * @returns Promise<KTX2Container>
//  *
//  */
// const fetchKTX = async (uri: string, key?: string): Promise<KTX2Container> => {
//     try {
//         const response = await fetch(uri);
//         if (!response.ok) {
//             throw new Error(`[E][fetchKTX ] KTX load failed, response code: ${response.status}`);
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         const container = read(new Uint8Array(arrayBuffer));
//         return container;
//     } catch (error) {
//         throw new Error(`[E][fetchKTX ] KTX load failed, response code: ${error}`);
//     }
// };

// export {
//     fetchKTX
// }