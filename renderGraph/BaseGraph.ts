import { BaseHolder, ComputeHolder, RenderHolder, Context, MapBuffer } from 'pipegpu'

/**
 * 
 */
type HolderStat = {
    /**
     * holder id.
     */
    id: number,

    /**
     * holder name.
     */
    name: string,

    /**
     * holder duration. /ns
     */
    duration: number,

    /**
     * timestamp index, start.
     */
    startIndex: number,

    /**
     * timestamp index, end.
     */
    endIndex: number,
};

/**
 * 
 * frame graph, support:
 * - compute pipeline.
 * - render pipeline.
 * - timestamp query.
 * 
 */
abstract class BaseGraph {

    /**
     * 
     */
    protected holderMap: Map<number, BaseHolder> = new Map();

    /**
     * 
     */
    protected timestampQuerySet?: GPUQuerySet;

    /**
     * 
     */
    protected timestampQueryBuffer?: MapBuffer;

    /**
     * 
     */
    protected timestampQueryCount: number = 0;

    /**
     * 
     */
    protected holderStats: HolderStat[] = [];

    /**
     * 
     */
    protected context: Context;

    /**
     * 
     * @param context 
     */
    constructor(context: Context) {
        this.context = context;
    }

    /**
     * 
     */
    public getPerformanceStats = async (): Promise<HolderStat[]> => {
        const rawArrayBuffer = await this.timestampQueryBuffer?.PullDataAsync();
        const bi64 = new BigInt64Array(rawArrayBuffer as ArrayBuffer);
        this.holderStats.forEach(holderStat => {
            holderStat.duration = Number(bi64[holderStat.endIndex] - bi64[holderStat.startIndex]);
        });
        return this.holderStats;
    }

    /**
     * 
     * @param commandEncoder 
     */
    protected syncTimestampStats = (commandEncoder: GPUCommandEncoder) => {
        commandEncoder.resolveQuerySet(
            this.timestampQuerySet!,
            0,
            this.timestampQueryCount,
            this.timestampQueryBuffer!.getGpuBuffer(commandEncoder, 'frameBegin'),
            0
        );
        this.timestampQueryBuffer!.getGpuBuffer(commandEncoder, 'frameFinish');
    };

    /**
     * 
     */
    protected refreshQuerySet = () => {
        // clear aux stats info.
        if (this.holderStats.length) {
            this.holderStats.length = 0;
            this.holderStats = [];
        }
        if (this.timestampQuerySet) {
            this.timestampQuerySet = undefined;
        }
        if (this.timestampQueryBuffer) {
            this.timestampQueryBuffer = undefined;
        }
        this.timestampQueryCount = this.holderMap.size + 1;
        const querySetDesc: GPUQuerySetDescriptor = {
            type: 'timestamp',
            count: this.timestampQueryCount
        };
        this.timestampQuerySet = this.context.getGpuDevice().createQuerySet(querySetDesc);
        // timestamp 8 byte (64bit)
        this.timestampQueryBuffer = new MapBuffer({
            id: 1,
            context: this.context,
            totalByteLength: this.timestampQueryCount * 8,
            appendixBufferUsageFlags: GPUBufferUsage.QUERY_RESOLVE
        });
    }

    /**
     * 
     * @param baseHolder BaseHolder | BaseHolder[] | RenderHolder | RenderHolder[] | ComputeHolder | ComputeHolder[]
     */
    append(holder: BaseHolder | undefined): void;
    append(holders: BaseHolder[] | undefined): void;
    append(holder: RenderHolder | undefined): void;
    append(holders: RenderHolder[] | undefined): void;
    append(holder: ComputeHolder | undefined): void;
    append(holders: ComputeHolder[] | undefined): void;
    append(a: BaseHolder | BaseHolder[] | RenderHolder | RenderHolder[] | ComputeHolder | ComputeHolder[] | undefined): void {
        if (a instanceof BaseHolder || a instanceof RenderHolder || a instanceof ComputeHolder) {
            if (!this.holderMap.has(a.getID())) {
                this.holderMap.set(a.getID(), a);
            } else {
                console.warn(`[W][BaseGraph][append] holder has already exist, id: ${a.getID()}.`);
            }
        } else if (!a) {
            console.warn(`[W][BaseGraph][append] undefined holder, please check.`);
        } else {
            a.forEach(e => {
                this.append(e);
            });
        }
    }

    /**
     * 
     */
    abstract build(): void;

}

export {
    type HolderStat,
    BaseGraph
}