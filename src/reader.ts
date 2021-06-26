import {Readable} from "stream";

export const End: unique symbol = Symbol('End')
export type End = typeof End;

export interface Reader {
    readCharacter(): Promise<string | End>
    close(): void
}

export class StringReader implements Reader {
    private offset = 0
    private length: number
    constructor(
        private source: string
    ) {
        this.length = source.length
    }

    close() {}

    async readCharacter() {
        if (this.length === this.offset) {
            return End
        } else {
            return this.source[this.offset ++]
        }
    }
}

export abstract class StreamReaderError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}
export class ChunkTypeError extends StreamReaderError {
    constructor(type: string) {
        super("Expected string as the chunk type, received " + type);
    }
}
export class ConcurrentReadError extends StreamReaderError {
    constructor() {
        super("Another read operation is not yet completed");
    }
}
export class StreamReader implements Reader {
    private endPromise: Promise<void>;
    private queue: {chunk: string, offset: number}[] = []
    private queuedTotal = 0
    private queueCapacity = 4096
    private notifyCallback: undefined | (() => void)
    constructor(
        private source: Readable
    ) {
        this.endPromise = new Promise<void>(
            (resolve, reject) => {
                if (source.readableEnded) {
                    resolve()
                } else {
                    source.once('end', resolve)
                    source.once('error', err => reject(err))
                }
            }
        )
        this.source.on('data', chunk => {
            if (typeof chunk === 'string') {
                if (chunk.length > 0) {
                    this.queue.push({
                        chunk,
                        offset: 0
                    })
                    this.queuedTotal += chunk.length
                    this.notifyCallback?.()
                    this.controlFlow()
                }
            } else {
                this.source.destroy(new ChunkTypeError(typeof chunk))
            }
        })
    }

    private controlFlow() {
        if (this.queuedTotal >= this.queueCapacity) {
            this.source.pause()
        } else {
            this.source.resume()
        }
    }

    close(error?: Error) {
        this.source.destroy(error)
    }

    private async readCharacterInternal(): Promise<string> {
        if (this.notifyCallback != undefined) {
            throw new ConcurrentReadError()
        } else if (this.queue.length === 0) {
            await new Promise<void>((resolve, reject) => {
                if (this.notifyCallback != undefined) {
                    reject(new ConcurrentReadError());
                } else if (this.queue.length > 0) {
                    resolve(void 0)
                } else {
                    this.notifyCallback = () => resolve(void 0)
                }
            })

            this.notifyCallback = undefined
        }

        const entry = this.queue[0]
        let char: string;
        const offset = entry.offset ++;
        char = entry.chunk[offset]
        this.queuedTotal --;
        if (entry.offset === entry.chunk.length) {
            this.queue.splice(0, 1)
        }
        this.controlFlow()
        return char
    }

    readCharacter(): Promise<string | End> {
        return Promise.race([
            this.endPromise.then(() => End) as Promise<End>,
            this.readCharacterInternal()
        ])
    }
}
