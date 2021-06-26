import {ScheduleList} from "./list";

export type ScheduleRunner = (
    schedule: {
        email: string,
        text: string,
        offset: number
    }
) => Promise<boolean>

export class Scheduler {
    private start = Date.now()
    constructor(
        private list: ScheduleList,
        private runner: ScheduleRunner
    ) {
    }

    private handle: NodeJS.Timeout
    private updateNextOffset() {
        if (this.handle != undefined) {
            clearTimeout(this.handle)
            this.handle = undefined
        }

        const offset = this.list.nextOffset()
        if (offset !== null) {
            const at = this.start + offset * 1000
            const delta = Math.max(
                at - Date.now(), 0
            )
            this.handle = setTimeout(
                this.runNext.bind(this),
                delta
            )
        }
    }

    private completionListeners: Function[] = []
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

        const schedule = this.list.pop()
        this.updateNextOffset()
        const [offset] = schedule.offsets.splice(0, 1)
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
            this.list.put(schedule)
            this.updateNextOffset()
        }

        this.checkCompletion()
    }

    run(): Promise<void> {
        return new Promise<void>(resolve => {
            this.completionListeners.push(
                () => resolve(void 0)
            )
            this.updateNextOffset()
            this.checkCompletion()
        })
    }
}
