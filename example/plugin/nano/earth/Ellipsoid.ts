import { GLMatrix, Vec3 } from 'pipegpu.matrix';

import { EARTH } from './defined';
import { EPSILON } from './defined';
import { GeodeticCoordinate } from './GeodeticCoordinate';

/**
 * 
 * @example
 * const latitude: number = 30.593098;
 * const longitude: number = 114.305392;
 * const geoLocation: GeodeticCoordinate = new GeodeticCoordinate(longitude, latitude);
 * const viewRectangle3DCenter: Ellipsoid = PSEUDOMERCATOR.geographicToSpace(geoLocation);
 * 
 */
class Ellipsoid {

    public x: number;
    public y: number;
    public z: number;
    private radii: Vec3;
    private radiiSquared: Vec3;
    private oneOverRadii: Vec3;
    private oneOverRadiiSquared: Vec3;
    private oneOverMaximumRadius: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.radii = new Vec3().set(x, y, z);
        this.radiiSquared = new Vec3().set(x * x, y * y, z * z);
        this.oneOverRadii = new Vec3().set(1 / x, 1 / y, 1 / z);
        this.oneOverRadiiSquared = new Vec3().set(1 / (x * x), 1 / (y * y), 1 / (z * z));
        this.oneOverMaximumRadius = 1 / this.MaximumRadius;
    }

    get RadiiSquared() {
        return this.radiiSquared;
    }

    get Radii() {
        return this.radii;
    }

    get OneOverRadii() {
        return this.oneOverRadii;
    }

    get MaximumRadius() {
        return Math.max(this.x, this.y, this.z);
    }

    get OneOverMaximumRadius() {
        return this.oneOverMaximumRadius;
    }

    private geodeticSurfaceNormalCartographic(cartographic: GeodeticCoordinate): Vec3 {
        const longitude = GLMatrix.toRadian(cartographic.Longitude),
            latitude = GLMatrix.toRadian(cartographic.Latitude),
            cosLatitude = Math.cos(latitude);
        const x = cosLatitude * Math.cos(longitude),
            y = cosLatitude * Math.sin(longitude),
            z = Math.sin(latitude);
        return new Vec3().set(x, y, z);
    }

    private geodeticSurfaceNormal(cartesian: Vec3): Vec3 {
        const oneOverRadiiSquared = this.oneOverRadiiSquared;
        const result = cartesian.clone().multiply(oneOverRadiiSquared);
        return result.normalize();
    }

    private scaleToGeodeticSurface(position: Vec3): Vec3 {
        //
        const positionX = position.x;
        const positionY = position.y;
        const positionZ = position.z;
        //
        const oneOverRadii = this.oneOverRadii;
        const oneOverRadiiX = oneOverRadii.x;
        const oneOverRadiiY = oneOverRadii.y;
        const oneOverRadiiZ = oneOverRadii.z;
        //
        const x2 = positionX * positionX * oneOverRadiiX * oneOverRadiiX;
        const y2 = positionY * positionY * oneOverRadiiY * oneOverRadiiY;
        const z2 = positionZ * positionZ * oneOverRadiiZ * oneOverRadiiZ;
        // Compute the squared ellipsoid norm.
        const squaredNorm = x2 + y2 + z2;
        const ratio = Math.sqrt(1.0 / squaredNorm);
        // As an initial approximation, assume that the radial intersection is the projection point.
        const intersection = position.clone().scale(ratio);
        // If the position is near the center, the iteration will not converge.
        if (squaredNorm < EPSILON.EPSILON1) {
            // return !isFinite(ratio) ? undefined : intersection.clone();
            throw new Error(`[E][Ellipsoid][scaleToGeodeticSurface] squareNormal over EPSILON1.`);
        }
        const oneOverRadiiSquared = this.oneOverRadiiSquared;
        const oneOverRadiiSquaredX = oneOverRadiiSquared.x;
        const oneOverRadiiSquaredY = oneOverRadiiSquared.y;
        const oneOverRadiiSquaredZ = oneOverRadiiSquared.z;
        // Use the gradient at the intersection point in place of the true unit normal.
        // The difference in magnitude will be absorbed in the multiplier.
        const gradient = new Vec3().set(
            intersection.x * oneOverRadiiSquaredX * 2.0,
            intersection.y * oneOverRadiiSquaredY * 2.0,
            intersection.z * oneOverRadiiSquaredZ * 2.0
        );
        // Compute the initial guess at the normal vector multiplier, lambda.
        let lambda = (1.0 - ratio) * position.len() / (0.5 * gradient.len());
        let correction = 0.0;
        let func;
        let denominator;
        let xMultiplier;
        let yMultiplier;
        let zMultiplier;
        let xMultiplier2;
        let yMultiplier2;
        let zMultiplier2;
        let xMultiplier3;
        let yMultiplier3;
        let zMultiplier3;
        do {
            lambda -= correction;
            xMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredX);
            yMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredY);
            zMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredZ);
            xMultiplier2 = xMultiplier * xMultiplier;
            yMultiplier2 = yMultiplier * yMultiplier;
            zMultiplier2 = zMultiplier * zMultiplier;
            xMultiplier3 = xMultiplier2 * xMultiplier;
            yMultiplier3 = yMultiplier2 * yMultiplier;
            zMultiplier3 = zMultiplier2 * zMultiplier;
            func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0;
            // "denominator" here refers to the use of this expression in the velocity and acceleration
            // computations in the sections to follow.
            denominator = x2 * xMultiplier3 * oneOverRadiiSquaredX + y2 * yMultiplier3 * oneOverRadiiSquaredY + z2 * zMultiplier3 * oneOverRadiiSquaredZ;
            const derivative = -2.0 * denominator;
            correction = func / derivative;
        } while (Math.abs(func) > EPSILON.EPSILON12);
        //
        return new Vec3().set(positionX * xMultiplier, positionY * yMultiplier, positionZ * zMultiplier);
    }

    /**
     * Scales the provided Cartesian position 
     * along the geodetic surface normal so 
     * that it is on the surface of this ellipsoid.  
     * If the position is at the center of the 
     * ellipsoid, this function returns undefined.
     * @description 将空间坐标转成大地坐标
     * @example
     * position = new Vec3().set(17832.12, 83234.52, 952313.73);
     * cartographicPosition = WGS84.spaceToGeographic(position);
     * 
     */
    public spaceToGeographic(spaceCoord: Vec3): GeodeticCoordinate {
        const p = this.scaleToGeodeticSurface(spaceCoord);
        const n = this.geodeticSurfaceNormal(p);
        const h = spaceCoord.clone().sub(p);
        var longitude = Math.atan2(n.y, n.x);
        var latitude = Math.asin(n.z);//resprent value in radian 
        var height = Math.sign(h.clone().dot(spaceCoord)) * h.len();
        return new GeodeticCoordinate(GLMatrix.toDegree(longitude), GLMatrix.toDegree(latitude), height);
    }

    /**
     * convert geographic coord to sapce coord (x, y, z)
     * @description 地理坐标转成空间坐标
     * @param {Geographic} geographic 
     */
    public geographicToSpace(geographic: GeodeticCoordinate): Vec3 {
        const radiiSquared = this.radiiSquared,
            n = this.geodeticSurfaceNormalCartographic(geographic),
            k = radiiSquared.clone().multiply(n);
        const gamma = Math.sqrt(n.clone().dot(k));
        k.scale(1 / gamma);
        n.scale(geographic.Altitude);
        return k.add(n);
    }
}

const WGS84 = new Ellipsoid(EARTH.RADIUS_X, EARTH.RADIUS_Y, EARTH.RADIUS_Z);

const semimajorAxis = Math.max(EARTH.RADIUS_X, EARTH.RADIUS_Y, EARTH.RADIUS_Z);

const PSEUDOMERCATOR = new Ellipsoid(semimajorAxis, semimajorAxis, semimajorAxis);

export {
    PSEUDOMERCATOR,
    WGS84,
    Ellipsoid
}