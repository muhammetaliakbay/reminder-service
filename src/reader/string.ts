import {End, Reader} from "./";

/**
 * Simplest implementation of the `Reader` interface. `StringReader`
 * takes a string as the source of characters to be red. And, counts
 * the offset using an accumulator field internally by incrementing it
 * after each read operation.
 */
export class StringReader implements Reader {
    private offset = 0
    private length: number

    constructor(
        private source: string
    ) {
        this.length = source.length
    }

    /**
     * Does nothing since the `StringReader` doesn't utilize
     * any resource. JS Engine should simply remove the object
     * from the memory when it gets un-pointed.
     */
    close() {
    }

    /**
     * Returns the next character in the string source, if there
     * is no character left (when offset gets equals to the length)
     * then returns `End` symbol to indicate the end of the source.
     */
    async readCharacter() {
        if (this.length === this.offset) {
            return End
        } else {
            return this.source[this.offset++]
        }
    }
}