import { BaseHolder, Context } from 'pipegpu';
import { BaseGraph, type HolderStat } from "./BaseGraph";

/**
 * 
 */
class OrderedGraph extends BaseGraph {

    /**
     * 
     * @param context 
     * 
     */
    constructor(context: Context) {
        super(context);
    }

    /**
     * 
     */
    protected getSortedHolders = (): BaseHolder[] => {
        let holdrs: BaseHolder[] = Array.from(this.holderMap.values());
        holdrs.sort((a, b) => a.getID() - b.getID());
        return holdrs;
    }

    /**
     * 
     */
    override build(): void {
        /**
         * - timestamp query.
         * - new frame resource.
         */
        {
            this.refreshQuerySet();
            this.context.refreshFrameResource();
        }
        const commandEncoder: GPUCommandEncoder = this.context.getCommandEncoder();
        // get sorted holders.
        const holders: BaseHolder[] = this.getSortedHolders();
        {
            for (let k: number = 0, len = holders.length; k < len; k++) {
                (commandEncoder as any).writeTimestamp(this.timestampQuerySet, k);
                holders[k].build(commandEncoder);
                const holderStat: HolderStat = {
                    id: holders[k].getID(),
                    name: holders[k].getDebugLabel(),
                    duration: 0,
                    startIndex: k,
                    endIndex: k + 1
                };
                this.holderStats.push(holderStat);
            }
            (commandEncoder as any).writeTimestamp(this.timestampQuerySet, holders.length);
        }
        // aux information sync.
        {
            this.syncTimestampStats(commandEncoder);
        }
        // clear resource
        {
            this.holderMap.clear();
            holders.length = 0;
        }
        this.context.submitFrameResource();
    }

}

export {
    OrderedGraph
}