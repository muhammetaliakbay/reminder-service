import {InvalidOffsetsError, parseSchedule, ScheduleSyntaxError} from "./schedule";
import {expect} from "chai"

describe("parseSchedule(text)", () => {

    it('should parse valid schedule texts with no error', async () => {
        parseSchedule("8s-14s-20s")
        parseSchedule("0s-18s")
        parseSchedule("3s-7s-18s")
        parseSchedule("6s")
        parseSchedule("2s-11s-19s")
    })

    it('should return empty array for empty input', async () => {
        expect(parseSchedule("")).empty
    })

    it('should throw ScheduleSyntaxError for the inputs having invalid syntax', async () => {
        expect(() => parseSchedule("invalid-schedule-syntax")).throws(ScheduleSyntaxError)
        expect(() => parseSchedule("8-10s")).throws(ScheduleSyntaxError)
        expect(() => parseSchedule("-8-10s")).throws(ScheduleSyntaxError)
        expect(() => parseSchedule("0.1s")).throws(ScheduleSyntaxError)
    })

    it('should throw InvalidOffsetsError for the inputs having duplicated offsets', async () => {
        expect(() => parseSchedule("0s-0s")).throws(InvalidOffsetsError)
        expect(() => parseSchedule("10s-11s-10s")).throws(InvalidOffsetsError)
    })

    it('should throw InvalidOffsetsError for the inputs having unsorted offsets', async () => {
        expect(() => parseSchedule("1s-0s")).throws(InvalidOffsetsError)
        expect(() => parseSchedule("10s-20s-1s")).throws(InvalidOffsetsError)
    })

})
