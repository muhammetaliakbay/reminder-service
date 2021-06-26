import {ScheduleOffsets} from "./schedule";

export interface Schedule {
    offsets: ScheduleOffsets
    email: string,
    text: string
}

export class ScheduleList {
    private list: Schedule[] = []
    private total: number = 0

    getSchedules(): Schedule[] {
        return this.list.slice()
    }

    private locate(offset: number): number {
        for (let i = 0; i < this.list.length; i ++) {
            if (this.list[i].offsets[0] > offset) {
                return i
            }
        }
        return this.list.length
    }

    put(...schedules: Schedule[]) {
        for (const schedule of schedules) {
            if (schedule.offsets.length > 0) {
                const index = this.locate(schedule.offsets[0])
                this.list.splice(index, 0, schedule)
                this.total += schedule.offsets.length
            }
        }
    }

    getTotal() {
        return this.total
    }

    pop(): Schedule {
        const schedule = this.list.splice(0, 1) [0]
        this.total -= schedule.offsets.length
        return schedule
    }

    peek(): Schedule {
        return this.list[0]
    }

    nextOffset(): number | null {
        return this.list[0]?.offsets?.[0] ?? null
    }
}
