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
export class BufferedReader implements Reader {
    private buffer: [...string[], ...[End?]] = []
    constructor(
        private source: Reader
    ) {
    }

    close() {
        this.source.close()
    }

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
