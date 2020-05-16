type Duration = {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
};

function toMilliseconds(duration: Duration): number {
    const factors = {
        milliseconds: 1,
        seconds: 1000,
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
    };

    const get = (k: keyof Duration) => (duration[k] === undefined) ? 0 : (duration[k]! * factors[k]);

    return get("days") + get("hours") + get("minutes") + get("seconds") + get("milliseconds");
}