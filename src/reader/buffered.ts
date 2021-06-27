import {End, Reader} from "./";

export class BufferedReaderError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}
export class UnableToPushEndError extends BufferedReaderError {
    constructor() {
        super("Can not push `End` at this state");
    }
}

/**
 * A `Reader` implementation which provides support for
 * pushing back the character red recently, to make it
 * available to be red again in subsequent read operations.
 */
export class BufferedReader implements Reader {
    private buffer: [...string[], ...[End?]] = []
    constructor(
        private source: Reader
    ) {
    }

    /**
     * Calls the close method of the source reader.
     */
    close() {
        this.source.close()
    }

    /**
     * Reads the next character from the buffer, if there is
     * no character buffered (pushed back) then tries to fetch
     * the next one from the source reader, if even it has no
     * character to provide, then returns `End` symbol.
     */
    async readCharacter(): Promise<string | End> {
        if (this.buffer.length > 0) {
            const char = this.buffer[0]
            if (char === End) {
                return char
            } else {
                this.buffer.splice(0, 1)
                return char
            }
        } else {
            const result = await this.source.readCharacter()
            if (result === End) {
                this.buffer.push(result)
            }
            return result
        }
    }

    /**
     * Pushes given character back to the buffer to make it
     * available to be red in the next first read operation.
     * If `End` symbol is provided to be pushed back, then
     * it checks whether the readable source is ended too.
     */
    pushCharacter(char: string | End): void {
        if (char === End) {
            if (this.buffer[0] !== End) {
                throw new UnableToPushEndError()
            }
        } else {
            this.buffer.splice(0, 0, char)
        }
    }
}
