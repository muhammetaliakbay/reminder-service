import {parseSchedule} from "./";
import {expect} from "chai"
import {ScheduleList} from "./list";

describe('ScheduleList', () => {

    const scheduleA = {
        email: 'a@mail.com',
        text: 'Message',
        offsets: parseSchedule('0s')
    }
    const scheduleB = {
        email: 'ba@mail.com',
        text: 'Message',
        offsets: parseSchedule('10s')
    }
    const scheduleC = {
        email: 'c@mail.com',
        text: 'Message',
        offsets: parseSchedule('3s-11s')
    }
    const scheduleD = {
        email: 'd@mail.com',
        text: 'Message',
        offsets: parseSchedule('')
    }

    const correctOrder = [
        scheduleA,
        scheduleC,
        scheduleB
    ]

    const total = 4

    describe('put(schedule)', () => {

        it('should not put the schedule having an empty offset list', async () => {
            const list = new ScheduleList()

            list.put({
                email: 'empty@mail.com',
                text: 'No-Message',
                offsets: parseSchedule('')
            })

            expect(list.getSchedules()).empty
            expect(list.getTotal()).eq(0)
        })

        it('should put the schedule at the start of an empty list', async () => {
            const list = new ScheduleList()
            const schedule = {
                email: 'a@mail.com',
                text: 'Message-0',
                offsets: parseSchedule('0s')
            }

            list.put(schedule)

            expect(list.getSchedules()).eql([schedule])
            expect(list.getTotal()).eq(1)
            expect(list.peek()).eq(schedule)
            expect(list.nextOffset()).eq(schedule.offsets[0])
        })

        it('should put multiple schedules in correct order and have correct value of the total', async () => {
            const list = new ScheduleList()

            list.put(
                scheduleA,
                scheduleB,
                scheduleC,
                scheduleD
            )

            expect(list.getSchedules()).eql(correctOrder)
            expect(list.getTotal()).eq(total)
            expect(list.peek()).eq(correctOrder[0])
            expect(list.nextOffset()).eq(correctOrder[0].offsets[0])
        })

    })

    describe('pop()', () => {

        it('should pop the schedule from the list', async () => {
           const list = new ScheduleList()

            list.put(
                scheduleA,
                scheduleB,
                scheduleC,
                scheduleD
            )

            expect(list.getSchedules()).eql(correctOrder)
            expect(list.getTotal()).eq(total)
            expect(list.peek()).eq(correctOrder[0])
            expect(list.nextOffset()).eq(correctOrder[0].offsets[0])

            expect(list.pop()).eq(correctOrder[0])

            expect(list.getSchedules()).eql(correctOrder.slice(1))
            expect(list.getTotal()).eq(total - correctOrder[0].offsets.length)
            expect(list.peek()).eq(correctOrder[1])
            expect(list.nextOffset()).eq(correctOrder[1].offsets[0])
        })

    })

});
