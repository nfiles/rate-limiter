import { RateLimiter } from './rate-limiter';

const maxRequests = 5;
const timePeriod = 1000;
const rateLimiter = new RateLimiter(maxRequests, timePeriod);
const actionTime = 100;
const actionCount = 15;

const main = async () => {
    console.log('starting:');

    const action = (i: number) => new Promise<number>(resolve => {
        setTimeout(() => {
            console.log(`finished ${i}`);
            resolve(i);
        }, Math.random() * 250 + 500)
    });

    const actions = new Array(actionCount)
        .fill(0)
        .map((_, i) =>
            rateLimiter.run(() => action(i))
        );

    console.log('done!');
    console.log(
        await Promise.all(actions)
    );
};

main().catch(ex => {
    console.error(ex);
    process.exitCode = 1;
});
