import {End, Reader} from "./";
import {Readable} from "stream";

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

/**
 * An implementation of `Reader` interface to provide support for
 * reading any (utf-8 encoded) `Readable` instance character by character.
 * `StreamReader` also holds a buffer internally to make next characters
 * ready before the demand.
 */
export class StreamReader implements Reader {
    private endPromise: Promise<void>;
    private queue: { chunk: string, offset: number }[] = []
    private queuedTotal = 0
    private queueCapacity = 4096
    private notifyCallback: undefined | (() => void)

    constructor(
        private source: Readable
    ) {
        /* `endPromise` is a promise which will be resolved/rejected when
        * the source readable gets ended or throws an error */
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
        /* Putting the source into the `flowing` mode, and listening for
        * the chunks of the data */
        this.source.on('data', chunk => {
            if (typeof chunk === 'string') {
                /* Only string chunks are supported. */
                if (chunk.length > 0) {
                    /* Put the chunk in the queue, with an offset accumulator
                    * which has 0 as the initial value */
                    this.queue.push({
                        chunk,
                        offset: 0
                    })
                    this.queuedTotal += chunk.length
                    /* If there is a concurrent read ongoing currently, then
                    * notify the callback that there is new characters to read. */
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
            /* If there are too much chunks in the queue, which waits to be red, then
            * switch the source out of `flowing` mode ...  */
            this.source.pause()
        } else {
            /* ... Otherwise, make sure that the source is in `flowing` mode. */
            this.source.resume()
        }
    }

    /**
     * Closes the underlying readable source.
     * @param error Optionally, an error can be specified as the reason of closing the readable.
     */
    close(error?: Error) {
        this.source.destroy(error)
    }

    private async readCharacterInternal(): Promise<string> {
        if (this.notifyCallback != undefined) {
            /* If a `notifyCallback` is specified already, then there is another
            * read operation runs concurrently. */
            throw new ConcurrentReadError()
        } else if (this.queue.length === 0) {
            /* If no characters available in the queue (the buffer), then waits
            * for being notified via the `notifyCallback` by the data listener. */
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

        /* Pull the first chunks in the queue */
        const entry = this.queue[0]
        let char: string;
        /* Increase the offset accumulator for the chunk which is just pulled. */
        const offset = entry.offset++;
        /* Take the character in the chunk at the position which is specified by
        * the value of the offset accumulator just before being incresed. */
        char = entry.chunk[offset]
        this.queuedTotal--;
        if (entry.offset === entry.chunk.length) {
            /* If the offset accumulator reaches the end of the chunk, then
            * pop the chunk from the queue to make next one available for subsequent
            * read operations. */
            this.queue.splice(0, 1)
        }
        this.controlFlow()
        return char
    }

    /**
     * Reads the next character from the buffer which is being filled
     * of the data retrieved from the readable source. If there is no
     * character left to be red, returns `End` symbol.
     */
    readCharacter(): Promise<string | End> {
        return Promise.race([
            this.endPromise.then(() => End) as Promise<End>,
            this.readCharacterInternal()
        ])
    }
}