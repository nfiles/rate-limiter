export interface QueuedTask<T> {
    action: () => Promise<T>,
    resolve: (result: T) => void,
    reject: (err: any) => void,
}

export class BatchScheduler {
    public get isDraining() { return !!this._drainPromise; }

    private _tickHandle: any = 0;
    private _concurrent = 0;

    private _doneDraining: () => void = null;
    private _drainPromise: Promise<void>;

    private _taskQueue: QueuedTask<any>[] = [];

    constructor(
        public readonly intervalTime: number,
        public readonly maxConcurrent: number,
    ) { }

    public run<T>(action: () => Promise<T>): Promise<T> {
        if (this.isDraining) {
            throw new Error('[BatchScheduler] is draining and cannot accept new tasks');
        }

        // force a tick if it hasn't started
        if (this._tickHandle === 0) {
            this._tickHandle = setInterval(() => this.tick(), this.intervalTime);
        }

        return new Promise<T>((resolve, reject) => {
            this._taskQueue.push({
                resolve: resolve,
                reject: reject,
                action: action,
            });
        });
    }

    public drain(): Promise<void> {
        if (this._drainPromise) {
            return this._drainPromise;
        }

        return this._drainPromise = new Promise(
            resolve => this._doneDraining = resolve
        );
    }

    public stop(): void {
        clearInterval(this._tickHandle);
        this._tickHandle = 0;
    }

    protected tick(): void {
        // nothing is running and nothing is waiting to run
        if (this._concurrent === 0 && this._taskQueue.length === 0) {
            if (this.isDraining) {
                this._doneDraining();
            }

            this.stop();
            return;
        }

        // not draining, so try to kick off new tasks
        while (this._concurrent < this.maxConcurrent && this._taskQueue.length > 0) {
            this._concurrent += 1;
            const task = this._taskQueue.shift();
            task.action().then(
                result => {
                    task.resolve(result);
                    this._concurrent -= 1;
                },
                err => {
                    task.reject(err);
                    this._concurrent -= 1
                }
            );
        }
    }
}
