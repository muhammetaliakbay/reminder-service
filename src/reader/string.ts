import {End, Reader} from "./";

export class StringReader implements Reader {
    private offset = 0
    private length: number

    constructor(
        private source: string
    ) {
        this.length = source.length
    }

    close() {
    }

    async readCharacter() {
        if (this.length === this.offset) {
            return End
        } else {
            return this.source[this.offset++]
        }
    }
}