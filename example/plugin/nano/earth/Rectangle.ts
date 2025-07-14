import { GLMatrix } from 'pipegpu.matrix'
import { EPSILON } from './defined'
import { GeodeticCoordinate } from './GeodeticCoordinate';

const TWO_PI = 2 * Math.PI;

const modValue = function (m: number, n: number): number {
    return ((m % n) + n) % n;
};

const zeroToTwoPi = function (angle: number) {
    const mod = modValue(angle, TWO_PI);
    return Math.abs(mod) < EPSILON.EPSILON14 && Math.abs(angle) > EPSILON.EPSILON14 ? TWO_PI : mod;
};

const negativePiToPi = function (angle: number): number {
    return zeroToTwoPi(angle + Math.PI) - Math.PI;
};

class Rectangle {
    private west: number;
    private south: number;
    private east: number;
    private north: number;

    constructor(sw: GeodeticCoordinate, ne: GeodeticCoordinate) {
        this.south = sw.Latitude;
        this.west = sw.Longitude;
        this.north = ne.Latitude;
        this.east = ne.Longitude;
    }

    static MAX_VALUE = new Rectangle(new GeodeticCoordinate(-180, -90), new GeodeticCoordinate(180, 90));

    get Width(): number {
        const east = this.east, west = this.west;
        return east < west ? east + Math.PI * 2 - west : east - west;
    }

    get Height(): number {
        const north = this.north, south = this.south;
        return north - south;
    }

    get Bounds(): Array<GeodeticCoordinate> {
        return [this.Southwest, this.Northwest, this.Northeast, this.Southeast];
    }

    get Southwest(): GeodeticCoordinate {
        return new GeodeticCoordinate(this.west, this.south, 0.0);
    }

    get Northwest(): GeodeticCoordinate {
        return new GeodeticCoordinate(this.west, this.north, 0.0);
    }

    get Northeast(): GeodeticCoordinate {
        return new GeodeticCoordinate(this.east, this.north, 0.0);
    }

    get Southeast(): GeodeticCoordinate {
        return new GeodeticCoordinate(this.east, this.south, 0.0);
    }

    get Center(): GeodeticCoordinate {
        const west = GLMatrix.toRadian(this.west),
            south = GLMatrix.toRadian(this.south),
            north = GLMatrix.toRadian(this.north);
        let east = GLMatrix.toRadian(this.east);
        east = east < west ? east + TWO_PI : east;
        const longitude = negativePiToPi((west + east) * 0.5);
        const latitude = (south + north) * 0.5;
        return new GeodeticCoordinate(GLMatrix.toDegree(longitude), GLMatrix.toDegree(latitude), 0.0);
    }

    public Contain(geodeticCoordinate: GeodeticCoordinate): boolean {
        const lng = GLMatrix.toRadian(geodeticCoordinate.Longitude), lat = GLMatrix.toRadian(geodeticCoordinate.Latitude);
        const west = GLMatrix.toRadian(this.west), south = GLMatrix.toRadian(this.south), north = GLMatrix.toRadian(this.north);
        let east = GLMatrix.toRadian(this.east);
        east = east < west ? east + TWO_PI : east;
        return (lng > west || Math.abs(lng - west) <= EPSILON.EPSILON14) && (lng < east || Math.abs(lng - east) <= EPSILON.EPSILON14) && lat >= south && lat <= north;
    }
}

export {
    Rectangle
}