export interface Schedule {
    offsets: ScheduleOffsets
    email: string,
    text: string
}

export class ScheduleParsingError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

export class ScheduleSyntaxError extends ScheduleParsingError {
    constructor(msg: string) {
        super(msg);
    }
}

export class InvalidOffsetsError extends ScheduleParsingError {
    constructor(msg: string) {
        super(msg);
    }
}

export type ScheduleOffsets = number[] & {sorting: "asc"}

const scheduleRegex = /^[0-9]+s(-[0-9]+s)*$/
export function parseSchedule(text: string): ScheduleOffsets {
    if (text.length === 0) {
        const ret = [] as ScheduleOffsets;
        ret.sorting = "asc"
        return ret
    } else if (!scheduleRegex.test(text)) {
        throw new ScheduleSyntaxError("Invalid schedule syntax, regex: /" + scheduleRegex.source + "/g, schedule: " + JSON.stringify(text))
    }

    const parts = text.split('-')
    const offsets = parts.map(
        part => part.substring(0, part.length-1)
    ).map(
        numStr => Number(numStr)
    ) as ScheduleOffsets

    for (let i = 1; i < offsets.length; i ++) {
        if (offsets[i] <= offsets[i - 1]) {
            throw new InvalidOffsetsError("Schedule's offsets must be sorted in ascending order with no duplication")
        }
    }
    offsets.sorting = "asc"

    return offsets
}
