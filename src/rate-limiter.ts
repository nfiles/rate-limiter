import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/skip';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/observable/combineLatest';


export class RateLimiter {
    public totalRequests = 0;

    private _waiting = 0;

    private readonly _timePeriodActions$ = new Subject<number>();
    private readonly _concurrentActions$ = new Subject<number>();
    private _timePeriodActions = 0;
    private _concurrentActions = 0;

    private _isDestroyed = new Subject();

    constructor(
        public readonly maxTimePeriodActions: number,
        public readonly timePeriod: number,
        public readonly maxConcurrentActions: number,
    ) {
        this._timePeriodActions$
            .takeUntil(this._isDestroyed)
            .subscribe(value => this._timePeriodActions = value);
        this._concurrentActions$
            .takeUntil(this._isDestroyed)
            .subscribe(value => this._concurrentActions = value);
    }

    async run<T>(action: () => (T | PromiseLike<T>)): Promise<T> {
        // if it is valid to run the task right now, do so
        if (this._timePeriodActions < this.maxTimePeriodActions &&
            this._concurrentActions < this.maxConcurrentActions) {
            return this._run(action);
        }

        const currentlyWaiting = this._waiting;
        this._waiting = this._waiting + 1;

        await Observable
            .combineLatest(this._timePeriodActions$, this._concurrentActions$)
            // .delay(100)
            .filter(([timePeriod, concurrent]) =>
                timePeriod < this.maxTimePeriodActions &&
                concurrent < this.maxConcurrentActions
            )
            .skip(currentlyWaiting)
            .take(1)
            .toPromise();

        this._waiting = this._waiting - 1;

        return this._run(action);
    }

    destroy(): void {
        this._isDestroyed.next();
        this._isDestroyed.complete();
    }

    private async _run<T>(action: () => (T | PromiseLike<T>)): Promise<T> {
        // track time period
        this._timePeriodActions$.next(this._timePeriodActions + 1);
        this._delayTimePeriod().then(() => {
            this._timePeriodActions$.next(this._timePeriodActions - 1);
        });

        this.totalRequests++;

        // track concurrent actions
        this._concurrentActions$.next(this._concurrentActions + 1);

        // try {
        const result = await action();
        // } catch (ex) {
        // await new Promise(resolve => setTimeout(resolve, 1000));
        // return await this.run<T>(action);
        // } finally {
        this._concurrentActions$.next(this._concurrentActions - 1);
        return result;
        // }

    }

    private _delayTimePeriod() {
        return new Promise<void>(
            resolve => setTimeout(resolve, this.timePeriod)
        );
    }
}