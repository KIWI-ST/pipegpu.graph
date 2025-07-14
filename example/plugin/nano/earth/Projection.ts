import { GLMatrix, Vec3 } from 'pipegpu.matrix';

import { GeodeticCoordinate } from './GeodeticCoordinate';
import { Ellipsoid, PSEUDOMERCATOR } from './Ellipsoid';

abstract class Projection {
    protected ellipsoid: Ellipsoid;
    protected semimajorAxis: number;
    protected oneOverSemimajorAxis: number;

    constructor(ellipsoid: Ellipsoid) {
        this.ellipsoid = ellipsoid;
        this.semimajorAxis = this.ellipsoid.MaximumRadius;
        this.oneOverSemimajorAxis = 1.0 / this.semimajorAxis;
    }

    get Ellipsoid() {
        return this.ellipsoid;
    }

    abstract project(geographic: GeodeticCoordinate): Vec3;
    abstract unproject(v3: Vec3): GeodeticCoordinate;
    abstract getResolution(zoomLevel: number): number;
    abstract getMaxZoomResolution(): number;
}

class WebMercatorProjection extends Projection {
    private maximumLatitude: number = 85.0511287798;
    private maxZoom: number = 23;
    protected resolutions: number[] = [];
    private tilePixelSize: number = 256;

    constructor() {
        super(PSEUDOMERCATOR);
        const resolutions: number[] = [];
        const d = 2 * this.semimajorAxis * Math.PI;
        for (let i = 0; i < this.maxZoom; i++) {
            resolutions[i] = d / (this.tilePixelSize * Math.pow(2, i));
        }
        this.resolutions = resolutions;
    }

    private mercatorAngleToGeodeticLatitude(mercatorAngle: number): number {
        return Math.PI / 2 - (2.0 * Math.atan(Math.exp(-mercatorAngle)));
    }

    private geodeticLatitudeToMercatorAngle(latitude: number): number {
        const maximumLatitude = this.maximumLatitude;
        if (latitude > maximumLatitude) {
            latitude = maximumLatitude;
        }
        else if (latitude < -maximumLatitude) {
            latitude = -maximumLatitude;
        }
        const sinLatitude = Math.sin(latitude);
        return 0.5 * Math.log((1.0 + sinLatitude) / (1.0 - sinLatitude));
    }

    public project(geographic: GeodeticCoordinate): Vec3 {
        const semimajorAxis = this.semimajorAxis;
        const x = GLMatrix.toRadian(geographic.Longitude) * semimajorAxis,
            y = this.geodeticLatitudeToMercatorAngle(GLMatrix.toRadian(geographic.Latitude)) * semimajorAxis,
            z = geographic.Altitude;
        return new Vec3().set(x, y, z);
    }

    public unproject(v3: Vec3): GeodeticCoordinate {
        const oneOverEarthSemimajorAxis = this.oneOverSemimajorAxis,
            longitude = v3.x * oneOverEarthSemimajorAxis,
            latitude = this.mercatorAngleToGeodeticLatitude(v3.y * oneOverEarthSemimajorAxis),
            height = v3.z;
        return new GeodeticCoordinate(GLMatrix.toDegree(longitude), GLMatrix.toDegree(latitude), height);
    }

    public getResolution(zoomLevel: number): number {
        return this.resolutions[zoomLevel];
    }

    public getMaxZoomResolution(): number {
        const maxZoom = this.maxZoom - 1;
        return this.resolutions[maxZoom];
    }
}

export { Projection, WebMercatorProjection }