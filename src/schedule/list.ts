import {Schedule} from "./";

/**
 * A wrapper implementation for a list to store `Schedule` objects
 * as sorted in an ascending order. Also, accumulates the total number of
 * all reminder offsets.
 */
export class ScheduleList {
    private list: Schedule[] = []
    private total: number = 0

    getSchedules(): Schedule[] {
        return this.list.slice()
    }

    private locate(offset: number): number {
        for (let i = 0; i < this.list.length; i ++) {
            /* Scan each entries in the current list against their offsets,
            * by comparing the given one to find the correct position. */
            if (this.list[i].offsets[0] > offset) {
                return i
            }
        }
        /* If it should be placed at the end of the list, then return the
        * length of the list as the desired position */
        return this.list.length
    }

    /**
     * Find correct positions (to keep the list well sorted) for each
     * given schedule entries, and place them in the list. The entries
     * with empty reminder offset list will be ignored. Returns true
     * if any of the given schedules is not ignored and is added.
     * @param schedules The schedule entries to be placed in the list
     */
    put(...schedules: Schedule[]): boolean {
        let added = false;
        for (const schedule of schedules) {
            if (schedule.offsets.length > 0) {
                added = true
                const index = this.locate(schedule.offsets[0])
                this.list.splice(index, 0, schedule)
                this.total += schedule.offsets.length
            }
        }
        return added
    }

    /**
     * Return the total number of reminder offsets present in the list.
     */
    getTotal() {
        return this.total
    }

    /**
     * Removes the first schedule entry in the list (the one has the least value
     * of reminder offset), returns the object.
     */
    pop(): Schedule {
        const schedule = this.list.splice(0, 1) [0]
        this.total -= schedule.offsets.length
        return schedule
    }

    /**
     * Returns the first schedule entry in the list (the one has the least value
     * of reminder offset).
     */
    peek(): Schedule {
        return this.list[0]
    }

    /**
     * Returns the least value of the reminder offset present in the list. If no
     * schedule object is placed, then returns `null`
     */
    nextOffset(): number | null {
        return this.list[0]?.offsets?.[0] ?? null
    }
}
