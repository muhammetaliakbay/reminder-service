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

const scheduleRegex = /^[0-9]+s(-[0-9]+s)*$/
export function parseSchedule(text: string): number[] & {sorting?: "asc"} {
    if (text.length === 0) {
        return []
    } else if (!scheduleRegex.test(text)) {
        throw new ScheduleSyntaxError("Invalid schedule syntax, regex: /" + scheduleRegex.source + "/g, schedule: " + JSON.stringify(text))
    }

    const parts = text.split('-')
    const offsets = parts.map(
        part => part.substring(0, part.length-1)
    ).map(
        numStr => Number(numStr)
    )

    for (let i = 1; i < offsets.length; i ++) {
        if (offsets[i] <= offsets[i - 1]) {
            throw new InvalidOffsetsError("Schedule's offsets must be sorted in ascending order with no duplication")
        }
    }

    return offsets
}
