class Human {
    constructor() {
        this.dateFormatWithYear = Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric"});
		this.dateFormatWithoutYear = Intl.DateTimeFormat(undefined, { month: "short", day: "numeric"});
    }

    upgradeToHTTPS(url) {
        if ((url == undefined) || (url == "")) {
            return undefined;
        }

        let result = new URL(url);
        if (result.protocol == "http:") {
            result.protocol = "https:";
        }
        return result;
    }

    removeMarkup(text) {
        if ((text == undefined) || (text == "")) {
            return undefined;
        }

        let e = document.createElement("div");
        e.innerHTML = text;
        return e.textContent.trim();
    }

    durationFromSeconds(seconds) {
        let totalMinutes = seconds/60;			
        let hours = Math.floor(totalMinutes/60);
        let remainingMinutes = totalMinutes - (hours * 60);

        // These bounds do not always round up
        let bounds = [
            [56.5, 60],
            [52.5, 60], // 55 replaced by 60
            [46.0, 50],
            [42.0, 45],
            [35.0, 40],
            [31.0, 35],
            [26.5, 30],
            [23.0, 30], // 25 replaced by 30
            [17.0, 20],
            [12.0, 15],
            [ 6.0, 10],
            [ 3.5,  5],
            [ 2.5,  3],
            [ 1.1,  2],
            [ 0.0,  1],
        ];

        let minutes = 0;
        for (let bound of bounds) {
            if (remainingMinutes > bound[0]) {
                minutes = bound[1];
                break;
            }
        }

        if (minutes === 60) {
            hours += 1;
            minutes = 0;
        }

        // Another place where we round down
        if (hours >= 1) {
            if (remainingMinutes < 5) {
                minutes = 0;
            }
        }

        return { hours, minutes };
    }

    formatDuration(hm) {
        let h = (hm.hours === 1) ? `hour` : `hours`;
        let m = (hm.minutes === 1) ? `min` : `mins`;
        if (hm.hours) {
            if (hm.minutes) {
                return `${hm.hours} ${h} ${hm.minutes} ${m}`;
            }
            return `${hm.hours} ${h}`;
        }
        return `${hm.minutes} ${m}`;
    }

    formatSeconds(s) {
        return this.formatDuration(this.durationFromSeconds(s));
    }

    formatDate(date) {
        // Make sure we have a date
        date = new Date(date);

        let now = new Date();
        if (date.getFullYear() == now.getFullYear()) {
            return this.dateFormatWithoutYear.format(date);
        }
        return this.dateFormatWithYear.format(date);
    }
}