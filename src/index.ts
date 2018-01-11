import { RateLimiter } from './rate-limiter';

const maxTimePeriodRequests = 5;
const timePeriod = 1000;
const maxConcurrentActions = 10;
const rateLimiter = new RateLimiter(maxTimePeriodRequests, timePeriod, maxConcurrentActions);
const actionTime = 100;
const actionCount = 30;

const main = async () => {
    console.log('starting:');

    // const action = (i: number) => new Promise<number>(resolve => {
    //     setTimeout(() => {
    //         console.log(`finished ${i}`);
    //         resolve(i);
    //     }, 500) // Math.random() * 250 + 500)
    // });

    const action = async (i: number) => {
        console.log(`finished ${i}`);
    }

    const actions = new Array(actionCount)
        .fill(0)
        .map((_, i) =>
            rateLimiter.run(() => action(i))
        );

    // console.log(
    await Promise.all(actions)
    // );
    console.log('done!');
};

main().catch(ex => {
    console.error(ex);
    process.exitCode = 1;
});
