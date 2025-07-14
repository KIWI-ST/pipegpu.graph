import { Rectangle } from "./Rectangle";
import { QuadtreeTileSchema } from "./QuadtreeTileSchema";

/**
 * 四叉树形式的Tile组织，用于快速检索瓦片信息
 * @class
 */
class QuadtreeTile {
    private parent: QuadtreeTile;
    private boundary: Rectangle;
    private level: number;
    private y: number;
    private x: number;
    private quadtreeTileSchema: QuadtreeTileSchema;
    private southwestChild!: QuadtreeTile;
    private southeastChild!: QuadtreeTile;
    private northwestChild!: QuadtreeTile;
    private northeastChild!: QuadtreeTile;

    constructor(quadtreeTileSchema: QuadtreeTileSchema, x: number, y: number, level: number, parent: QuadtreeTile) {
        this.quadtreeTileSchema = quadtreeTileSchema;
        this.x = x;
        this.y = y;
        this.level = level;
        this.parent = parent;
        this.boundary = this.quadtreeTileSchema.tileXYToRectangle(x, y, level);
    }

    get X(): number {
        return this.x;
    }

    get Y(): number {
        return this.y;
    }

    get Boundary(): Rectangle {
        if (!this.boundary) {
            const tileSchema = this.quadtreeTileSchema,
                x = this.x,
                y = this.y,
                l = this.level;
            this.boundary = tileSchema.tileXYToRectangle(x, y, l);
        }
        return this.boundary;
    }

    get Level(): number {
        return this.level;
    }

    get Children(): QuadtreeTile[] {
        return [this.NorthwestChild, this.NortheastChild, this.SouthwestChild, this.SoutheastChild];
    }

    get SouthwestChild(): QuadtreeTile {
        this.southwestChild = this.southwestChild || new QuadtreeTile(
            this.quadtreeTileSchema,
            this.x * 2,
            this.y * 2 + 1,
            this.level + 1,
            this);
        return this.southwestChild;
    }

    get SoutheastChild(): QuadtreeTile {
        this.southeastChild = this.southeastChild || new QuadtreeTile(
            this.quadtreeTileSchema,
            this.x * 2 + 1,
            this.y * 2 + 1,
            this.level + 1,
            this);
        return this.southeastChild;
    }

    get NorthwestChild(): QuadtreeTile {
        this.northwestChild = this.northwestChild || new QuadtreeTile(
            this.quadtreeTileSchema,
            this.x * 2,
            this.y * 2,
            this.level + 1,
            this);
        return this.northwestChild;
    }

    get NortheastChild(): QuadtreeTile {
        this.northeastChild = this.northeastChild || new QuadtreeTile(
            this.quadtreeTileSchema,
            this.x * 2 + 1,
            this.y * 2,
            this.level + 1,
            this);
        return this.northeastChild;
    }

    get Parent(): QuadtreeTile {
        return this.parent;
    }

}

export { QuadtreeTile }