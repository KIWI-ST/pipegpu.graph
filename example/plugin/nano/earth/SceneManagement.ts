import * as Cesium from 'cesium'
import { webMercatorTileSchema, type QuadtreeTileSchema } from './QuadtreeTileSchema';
import type { Ellipsoid } from './Ellipsoid';
import { QuadtreeTile } from './QuadtreeTile';
import { Vec3 } from 'pipegpu.matrix';

const MAXIMUM_SCREEN_SPACEERROR = 16 * 16 * 16.0;

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
        const IntersectQuadtreeTile = (qTile: QuadtreeTile): boolean => {
            let r = true;
            const boundingBox = qTile.Boundary;
            const corners = [boundingBox.Southwest, boundingBox.Southeast, boundingBox.Northwest, boundingBox.Northeast]
                .map(corner => this.ellipsoid.geographicToSpace(corner));
            // 计算AABB的最小/最大点
            let minx: number, miny: number, minz: number;
            let maxx: number, maxy: number, maxz: number;
            minx = miny = minz = Number.MAX_VALUE;
            maxx = maxy = maxz = -Number.MAX_VALUE;
            corners.forEach(corner => {
                minx = Math.min(minx, corner.x);
                miny = Math.min(miny, corner.y);
                minz = Math.min(minz, corner.z);
                maxx = Math.max(maxx, corner.x);
                maxy = Math.max(maxy, corner.y);
                maxz = Math.max(maxz, corner.z);
            });

            for (const plane of cullingVolume.planes) {
                const closestPoint = new Vec3().set(
                    plane.x >= 0 ? minx : maxx,
                    plane.y >= 0 ? miny : maxy,
                    plane.z >= 0 ? minz : maxz
                );
                const distance = plane.x * closestPoint.x +
                    plane.y * closestPoint.y +
                    plane.z * closestPoint.z +
                    plane.w;
                if (distance < 0) {
                    r = false;
                }
            }
            return r;
        };

        //liter func, to calcute new tile in distance error
        const liter = (quadtreeTile: QuadtreeTile, deep: number) => {
            const error = this.computeSpaceError(quadtreeTile);
            if (error > MAXIMUM_SCREEN_SPACEERROR && deep < 10) {
                for (let i = 0; i < 4; i++) {
                    const child = quadtreeTile.Children[i];
                    if (IntersectQuadtreeTile(child)) {
                        console.log(`${child.X}-${child.Y}-${child.Level}`);
                        liter(child, deep++);
                    }
                    // console.log(IntersectQuadtreeTile(child));
                    // if (IntersectQuadtreeTile(child)) {
                    // liter(quadtreeTile.Children[i]);
                    // }
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
            let deep = 0;
            liter(tile, deep);
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