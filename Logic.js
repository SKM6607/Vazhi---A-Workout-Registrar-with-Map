export const TypeOfWorkout = Object.freeze({
    CYCLING: 'cycling',
    RUNNING: 'running'
})

export class WorkOut {
    static #MONTHS = Object.freeze(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
    static #id = Math.trunc(Math.random() * 100) * 10;
    distance
    duration
    coords
    type
    activityId
    description

    static increaser() {
        return WorkOut.#id += 1
    }

    constructor(dist, dur, coords, type = TypeOfWorkout.RUNNING) {
        this.distance = dist
        this.duration = dur
        this.coords = coords
        this.type = type
        this.rate = +(dur / dist).toFixed(2)
        this.activityId = WorkOut.increaser()
    }

    _getDescription() {
        const date = new Date()
        this.description = `${this.type.charAt(0).toUpperCase() + this.type.substring(1, this.type.length)} on ${date.getDay()} , ${WorkOut.#MONTHS[date.getMonth()]} ${date.getFullYear()}.`
    }
}

export class Cycling extends WorkOut {
    constructor(dist, dur, coords, elevation) {
        super(dist, dur, coords, TypeOfWorkout.CYCLING);
        this.elevationGain = elevation
        this._getDescription()
    }
}

export class Running extends WorkOut {
    constructor(dist, dur, coords, cadence) {
        super(dist, dur, coords, TypeOfWorkout.RUNNING);
        this.cadence = cadence
        this._getDescription()
    }
}