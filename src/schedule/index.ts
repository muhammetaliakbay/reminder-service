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

/**
 * Takes a string parameter and tries to parse it as a value
 * as present in the "schedule" column in the given CSV document.
 * Parses the offset numbers, checks whether they are in a
 * sorted order (ascending) and distinct.
 * @param text The string value to be parsed as the "schedule" column
 */
export function parseSchedule(text: string): ScheduleOffsets {
    if (text.length === 0) {
        const ret = [] as ScheduleOffsets;
        ret.sorting = "asc"
        return ret
    } else if (!scheduleRegex.test(text)) {
        throw new ScheduleSyntaxError("Invalid schedule syntax, regex: /" + scheduleRegex.source + "/g, schedule: " + JSON.stringify(text))
    }

    /* Each part of offsets is separated by a dash (-) character */
    const parts = text.split('-')
    const offsets = parts.map(
        /* Remove "s" suffix from the part */
        part => part.substring(0, part.length-1)
    ).map(
        /* Parse the part as a number */
        numStr => Number(numStr)
    ) as ScheduleOffsets

    for (let i = 1; i < offsets.length; i ++) {
        /* Every number in the `offsets` list must be greater than the
        * previous one. */
        if (offsets[i] <= offsets[i - 1]) {
            throw new InvalidOffsetsError("Schedule's offsets must be sorted in ascending order with no duplication")
        }
    }
    offsets.sorting = "asc"

    return offsets
}
