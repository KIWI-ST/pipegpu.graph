class GeodeticCoordinate {
    private alt: number;
    private lat: number;
    private lng: number;

    constructor(lng: number, lat: number, alt: number = 0.0) {
        this.lng = lng;
        this.lat = lat;
        this.alt = alt;
    }

    public toGeodetic = () => {
        return new GeodeticCoordinate(this.lng, this.lat, 0);
    }

    public isGeodetic = (): boolean => {
        return this.alt === 0;
    }

    get Latitude() {
        return this.lat;
    }

    get Longitude() {
        return this.lng;
    }


    get Altitude() {
        return this.alt;
    }

    set Altitude(v: number) {
        this.alt = v;
    }
}

export {
    GeodeticCoordinate
} 