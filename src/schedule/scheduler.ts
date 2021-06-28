import {ScheduleList} from "./list";
import {Schedule} from "./index";

/**
 * A type of function which is specified as a callback to
 * pass information about a scheduled reminder for processing
 * it and notifying the caller back whether it is paid.
 */
export type ScheduleRunner = (
    schedule: {
        email: string,
        text: string,
        offset: number
    }
) => Promise<boolean>

/**
 * Manages when and in which order to send scheduled reminders
 * by calling the specified runner.
 */
export class Scheduler {
    private start: number
    private list = new ScheduleList()
    constructor(
        private runner: ScheduleRunner
    ) {
    }

    /**
     * Handle for the scheduled timeout of next (the one with the least
     * offset) scheduled reminder.
     * @private
     */
    private handle: NodeJS.Timeout

    /**
     * Schedules a new timeout for the next (the one with the least offset)
     * scheduled reminder in the list.
     * @private
     */
    private updateNextOffset() {
        if (this.handle != undefined) {
            /* Cancel the current schedule if there is any. It doesn't a problem
            * since as long as the cancelled one was already the next one, it
            * will be rescheduled again, below.*/
            clearTimeout(this.handle)
            this.handle = undefined
        }

        const offset = this.list.nextOffset()
        if (this.start == undefined) {
            if (offset !== 0) {
                /* Do not start the execution of the reminders
                 until the very first zero offset get scheduled.
                * TODO: The case when there is no zero offset defined in the
                *  supplied CSV document is not defined in the challenge's
                *  document. Ask about it. */
                return
            }
            /* Base offset starts at the first scheduled
            * reminder is registered. */
            this.start = Date.now()
        }

        if (offset !== null) {
            /* If there is a pending reminder in the list, use its first offset
            * to calculate the time when the `runNext` method will be called. */
            const at = this.start + offset * 1000
            const delta = Math.max(
                at - Date.now(), 0
            )
            /* Schedule the timeout to call the `runNext` method at the time
            * that the reminder is scheduled for. */
            this.handle = setTimeout(
                this.runNext.bind(this),
                delta
            )
        }
    }

    /**
     * A list of callback functions which are registered to be
     * called when all the reminders in the list are fulfilled.
     * @private
     */
    private completionListeners: Function[] = []

    /**
     * Checks that if all the scheduled reminders in the list
     * are fulfilled by checking that if there is no scheduled
     * timeout left. If all of them are completed, then calls
     * each callbacks in the listeners list and clears the list.
     * @private
     */
    private checkCompletion() {
        if (this.handle == undefined) {
            const listeners = this.completionListeners.splice(
                0,
                this.completionListeners.length
            )
            for (const listener of listeners) {
                try {
                    listener()
                } catch (err) {
                    console.error(err)
                }
            }
        }
    }

    private async runNext() {
        if (this.list.getTotal() === 0) {
            return
        }

        /* If there is scheduled reminder which is pending to be sent,
        * pop it from the list. */
        const schedule = this.list.pop()
        this.updateNextOffset()
        const [offset] = schedule.offsets.splice(0, 1)
        /* Feed the runner with the information of the scheduled reminder.
        * Then take the information indicates that it is paid or not. */
        const paid = await this.runner({
            email: schedule.email,
            text: schedule.text,
            offset
        }).catch(
            err => {
                console.error(err)
                return false
            }
        )
        if (!paid) {
            /* If it is not paid yet, put the remainder reminders back to the
            * list to schedule them. If there is not reminder left in the list
            * of the offsets, `put` method will simply ignore it. */
            this.list.put(schedule)
            this.updateNextOffset()
        }

        this.checkCompletion()
    }

    /**
     * Adds the scheduled reminders to the internal list, and
     * sets the timeout for the next one which has the earliest
     * offset compared to the rest.
     * Note: This method can be called any time even after the
     * last reminder has been fulfilled.
     */
    schedule(...schedules: Schedule[]): void {
        if (this.list.put(...schedules)) {
            this.updateNextOffset()
        }
    }

    /**
     * Waits until all the reminders are fulfilled.
     */
    waitComplete(): Promise<void> {
        return new Promise<void>(resolve => {
            /* Register completion callback to resolve the promise
            * when all the reminders are fulfilled. */
            this.completionListeners.push(
                () => resolve(void 0)
            )
            this.checkCompletion()
        })
    }
}
