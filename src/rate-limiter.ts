import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/skip';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/toPromise';

export class RateLimiter {
    private _waiting = 0;
    private _currentRequestCount = new BehaviorSubject<number>(0);

    constructor(
        public maxConcurrentActions: number,
        public timePeriod: number,
    ) { }

    async run<T>(action: () => (T | PromiseLike<T>)) {
        if (this._currentRequestCount.value < this.maxConcurrentActions) {
            return this._run(action);
        }

        this._waiting = this._waiting + 1;

        await this._currentRequestCount
            .filter(count => count < this.maxConcurrentActions)
            .skip(this._waiting)
            .take(1)
            .toPromise()

        this._waiting = this._waiting - 1;

        return this._run(action);
    }

    private async _run<T>(action: () => (T | PromiseLike<T>)) {
        // track action
        this._currentRequestCount.next(this._currentRequestCount.value + 1);
        this._delayTimePeriod().then(() => {
            this._currentRequestCount.next(this._currentRequestCount.value - 1);
        });

        // execute action
        return action();
    }

    private _delayTimePeriod() {
        return new Promise<void>(
            resolve => setTimeout(resolve, this.timePeriod)
        );
    }
}
