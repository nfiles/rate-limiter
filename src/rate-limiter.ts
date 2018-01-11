import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/skip';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/toPromise';

/**
 * Service for managing rate-limited actions, especially API requests
 *
 * @export
 * @class RateLimiter
 */
export class RateLimiter {
    private _waiting = 0;

    private readonly _timePeriodActions$ = new Subject<number>();
    private readonly _concurrentActions$ = new Subject<number>();
    private _timePeriodActions = 0;
    private _concurrentActions = 0;

    private _isDestroyed = new Subject<void>();

    constructor(
        public readonly timePeriod: number,
        public readonly maxTimePeriodActions: number,
        public readonly maxConcurrentActions: number,
    ) {
        this._timePeriodActions$
            .takeUntil(this._isDestroyed)
            .subscribe(value => this._timePeriodActions = value);
        this._concurrentActions$
            .takeUntil(this._isDestroyed)
            .subscribe(value => this._concurrentActions = value);
    }

    /**
     * Run an action within the rate limit. It will be deferred if it cannot be evaluated immediately.
     *
     * @template T
     * @param {(() => (T | PromiseLike<T>))} action
     * @returns {Promise<T>}
     * @memberof RateLimiter
     */
    async run<T>(action: () => (T | PromiseLike<T>)): Promise<T> {
        // run it immediately, if possible
        if (this._timePeriodActions < this.maxTimePeriodActions &&
            this._concurrentActions < this.maxConcurrentActions) {
            return this._run(action);
        }

        // defer the action
        const currentlyWaiting = this._waiting;
        this._waiting = this._waiting + 1;

        return await Observable
            .combineLatest(this._timePeriodActions$, this._concurrentActions$)
            .filter(([timePeriod, concurrent]) =>
                timePeriod < this.maxTimePeriodActions &&
                concurrent < this.maxConcurrentActions
            )
            .skip(currentlyWaiting)
            .take(1)
            .map(() => {
                this._waiting = this._waiting - 1;
                return this._run(action);
            })
            // convert the observable to a promise as *late* as possible.
            // Promises are async, and we want to update the _waiting value as soon as possible
            // weird things can happen when Promises and Observables mix
            .toPromise();
    }

    destroy(): void {
        this._isDestroyed.next();
        this._isDestroyed.complete();
    }

    private async _run<T>(action: () => (T | PromiseLike<T>)): Promise<T> {
        // track time period
        this._timePeriodActions$.next(this._timePeriodActions + 1);
        setTimeout(
            () => this._timePeriodActions$.next(this._timePeriodActions - 1),
            this.timePeriod,
        );

        // track concurrent actions
        this._concurrentActions$.next(this._concurrentActions + 1);
        const result = await action();
        this._concurrentActions$.next(this._concurrentActions - 1);

        return result;
    }
}
