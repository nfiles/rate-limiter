import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';

import { RateLimiter } from './rate-limiter';

const maxTimePeriodRequests = 5;
const timePeriod = 1000;
const maxConcurrentActions = 10;

const rateLimiter = new RateLimiter(timePeriod, maxTimePeriodRequests, maxConcurrentActions);

const actionTime = 100;
const actionCount = 30;

const main = async () => {
    const start = Date.now();

    // const action = (i: number) => new Promise<number>(resolve => {
    //     setTimeout(() => {
    //         const secondsElapsed = (Date.now() - start) / 1000;
    //         resolve(secondsElapsed);
    //     }, 500) // Math.random() * 250 + 500)
    // });

    const action = async (i: number) => {
        const secondsElapsed = (Date.now() - start) / 1000;
        return secondsElapsed;
    }

    const actions = new Array(actionCount)
        .fill(0)
        .map((_, i) => {
            return rateLimiter.run(() => action(i));
        });

    const results = await Promise.all(actions)
    const grouped = groupBy(results, r => Math.floor(r));
    const ordered = sortBy(Object.keys(grouped), Number)
        .forEach(seconds => {
            console.log(`${seconds} seconds: ${grouped[seconds].length}`);
        });
};

main().catch(ex => {
    console.error(ex);
    process.exitCode = 1;
});
