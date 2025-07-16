import * as Cesium from 'cesium'
import { webMercatorTileSchema, type QuadtreeTileSchema } from './QuadtreeTileSchema';
import type { Ellipsoid } from './Ellipsoid';
import { QuadtreeTile } from './QuadtreeTile';
import { Vec3 } from 'pipegpu.matrix';
import { GeodeticCoordinate } from './GeodeticCoordinate';

const MAXIMUM_SCREEN_SPACEERROR = 2.0;

class SceneManagement {

    private camera: Cesium.Camera;
    private quadtreeTileSchema: QuadtreeTileSchema;
    private ellipsoid: Ellipsoid;
    private geometricError: number[] = [];
    private maximumCameraHeight: number[] = [];
    private viewportWidth: number;
    private viewportHeight: number;
    private zeroLevelTiles!: QuadtreeTile[];
    private level!: number;
    private visualRevealTiles!: QuadtreeTile[];
    private SseDenominator!: number;

    constructor(
        opts: {
            camera: Cesium.Camera,
            quadtreeTileSchema: QuadtreeTileSchema,
            ellipsoid: Ellipsoid
            viewportWidth: number,
            viewportHeight: number,
        }
    ) {
        this.camera = opts.camera;
        this.quadtreeTileSchema = opts.quadtreeTileSchema;
        this.ellipsoid = opts.ellipsoid;
        this.viewportWidth = opts.viewportWidth;
        this.viewportHeight = opts.viewportHeight;
        this.initQuadTree();
        this.initCameraChanged();

    }

    private initCameraChanged = () => {
        this.camera.changed.addEventListener(_e => {
            this.updateQuadtreeTileByDistanceError();
            console.log(this.getVisualRevealTiles());
        });
    }

    private initQuadTree = () => {
        const sseDenominator = this.SseDenominator = (this.camera as any).frustum.sseDenominator;
        for (let i = 0; i <= 20; i++) {
            const geometricError = this.computeMaximumGeometricError(i);
            this.geometricError[i] = geometricError;
            this.maximumCameraHeight[i] = geometricError * this.viewportHeight / (sseDenominator * MAXIMUM_SCREEN_SPACEERROR);
        }
        this.zeroLevelTiles = this.computeLevelTilesZero();
    }

    private computeMaximumGeometricError = (level: number) => {
        const maximumGeometricError = this.ellipsoid.MaximumRadius * Math.PI * 0.5 / (65 * this.quadtreeTileSchema.getNumberOfXTilesAtLevel(level));
        return maximumGeometricError;
    }

    private computeLevelTilesZero = () => {
        const level: number = 0;
        const numberOfLevelZeroTilesX = this.quadtreeTileSchema.getNumberOfXTilesAtLevel(level),
            numberOfLevelZeroTilesY = this.quadtreeTileSchema.getNumberOfYTilesAtLevel(level),
            zeroLevelTiles: QuadtreeTile[] = [];
        let seed = 0;
        for (let y = 0; y < numberOfLevelZeroTilesY; ++y) {
            for (let x = 0; x < numberOfLevelZeroTilesX; ++x) {
                zeroLevelTiles[seed++] = new QuadtreeTile(this.quadtreeTileSchema, x, y, 0);
            }
        }
        return zeroLevelTiles;
    }

    private pickZeroLevelQuadtreeTiles = (position: Vec3): QuadtreeTile[] => {
        if (this.quadtreeTileSchema === webMercatorTileSchema) {
            return this.zeroLevelTiles;
        }
        const zeroLevelQuadtreeTiles = this.zeroLevelTiles;
        const pickedZeroLevelQuadtreeTiles: QuadtreeTile[] = [];
        const geodeticCoordinate = this.ellipsoid.spaceToGeographic(position);
        zeroLevelQuadtreeTiles.forEach((quadtreeTile) => {
            quadtreeTile.Boundary.Contain(geodeticCoordinate) ? pickedZeroLevelQuadtreeTiles.push(quadtreeTile) : null;
        });
        return pickedZeroLevelQuadtreeTiles;
    }

    // ref
    // https://github.com/CesiumGS/cesium/blob/main/packages/engine/Source/Scene/QuadtreePrimitive.js
    private computeSpaceError = (quadtreeTile: QuadtreeTile): number => {
        const level = quadtreeTile.Level,
            maxGeometricError = this.geometricError[level],
            sseDenominator = this.SseDenominator,
            height = this.viewportHeight;
        const distance = this.camera.positionCartographic.height
        return (maxGeometricError * height) / (distance * sseDenominator);
    }

    public updateQuadtreeTileByDistanceError = (): void => {
        const position = new Vec3().set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
        let level = 0;
        const rootTiles = this.pickZeroLevelQuadtreeTiles(position);
        //wait rendering
        const rawQuadtreeTiles: QuadtreeTile[] = [];
        const renderingQuadtreeTiles: QuadtreeTile[] = [];
        // volume culling

        const cullingVolume = this.camera.frustum.computeCullingVolume(this.camera.position, this.camera.direction, this.camera.up);
        const IntersectQuadtreeTile = (qTile: QuadtreeTile) => {
            const boundingSphere = qTile.BoundingSphere;
            const spacePosition = this.ellipsoid.geographicToSpace(new GeodeticCoordinate(boundingSphere[0], boundingSphere[1], boundingSphere[2]));
            const radius = boundingSphere[3] * 30; //
        };

        console.log(cullingVolume);

        //liter func, to calcute new tile in distance error
        const liter = (quadtreeTile: QuadtreeTile) => {
            const error = this.computeSpaceError(quadtreeTile);
            if (error > MAXIMUM_SCREEN_SPACEERROR) {
                for (let i = 0; i < 4; i++) {
                    // frustum culling. 
                    // this.camera.frustum.computeCullingVolume
                    // liter(quadtreeTile.Children[i]);
                }
            }
            else {
                const litLevel = quadtreeTile.Level;
                level = litLevel > level ? litLevel : level;
                rawQuadtreeTiles.push(quadtreeTile);
            }
        };
        //calcute from root tile
        for (let i = 0, len = rootTiles.length; i < len; i++) {
            const tile = rootTiles[i];
            liter(tile);
        }
        //filter level of tile
        for (let i = 0, len = rawQuadtreeTiles.length; i < len; i++) {
            const quadtreeTile = rawQuadtreeTiles[i];
            if (quadtreeTile.Level === level) {
                renderingQuadtreeTiles.push(quadtreeTile);
            }

        }
        this.level = level;
        this.visualRevealTiles = renderingQuadtreeTiles;
    }

    public getViewportWidth = (): number => {
        return this.viewportWidth;
    }

    public getViewportHeight = (): number => {
        return this.viewportHeight;
    }

    public getLevel = () => {
        return this.level;
    }

    public getVisualRevealTiles = () => {
        return this.visualRevealTiles;
    }

}

export {
    SceneManagement
}