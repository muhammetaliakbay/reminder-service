import {ChildProcess, spawn} from "child_process";
import * as path from "path";
import {platform} from "os";
import * as EventEmitter from "events"

export interface CommserviceResultLine {
    passing: boolean
    description: string
}
export interface CommserviceResult {
    sections: {
        messageCount: CommserviceResultLine[],
        messageTimings: CommserviceResultLine[]
    }
}

export class CommserviceEventEmitter extends EventEmitter {
    private _listening: boolean = false
    get listening() {
        return this._listening
    }

    private _closed: boolean = false
    get closed() {
        return this._closed
    }

    private _error: any
    get error() {
        return this._error
    }

    private _exitCode: number
    get exitCode() {
        return this._exitCode
    }

    private _output: string = ''
    get output() {
        return this._output
    }

    private _status: string = ''
    get status() {
        return this._status
    }

    constructor(private process: ChildProcess) {
        super()

        const statusStream = process.stderr
        const outputStream = process.stdout

        statusStream.setEncoding("utf8")
        statusStream.on("data", chunk => {
            this._status += chunk
            if (!this._listening) {
                if (this._status.includes('listening')) {
                    this._listening = true
                    this.emit('listening')
                }
            }
        })

        outputStream.setEncoding("utf8")
        outputStream.on("data", chunk => {
            this._output += chunk
        })

        process.once("error", error => {
            this._error = error
            this.emit("error", error)
        })
        process.once("close", () => {
            this._closed = true
            this.emit("close")
        })
        process.once("exit", code => {
            this._exitCode = code ?? -1
            this.emit("exit", this._exitCode)
        })
    }

    terminate() {
        this.process.kill('SIGTERM')
    }

    readonly end$: Promise<void> = new Promise<void>(
        (resolve, reject) => {
            this.once('exit', (code: number) => {
                if (code !== 0) {
                    reject(new Error('Commservice exited with non-zero exit code: ' + code))
                } else {
                    resolve(void 0)
                }
            })
            this.once('error', error => reject(error))
        }
    )

    readonly output$: Promise<string> = this.end$.then(
        () => this.output
    )

    readonly result$: Promise<CommserviceResult> = this.output$.then(
        output => CommserviceEventEmitter.parseOutput(output)
    )

    readonly listening$ = Promise.race<void>([
        this.end$.then(
            () => {
                throw new Error("Commservice was shutdown before starting listening")
            }
        ),
        new Promise<void>(
            (resolve) => {
                this.once('listening', () => resolve(void 0))
            }
        )
    ])

    private static parseOutput(output: string): CommserviceResult {
        const lines = output.split(/\r\n|\r|\n/).map(
            line => line.trim()
        )

        let messageCountTitleIndex = lines.indexOf("Message Count")
        if (messageCountTitleIndex === -1) {
            throw new Error('"Message Count" title not found in commservice\'s output')
        }
        let messageCountStart = messageCountTitleIndex + 1
        let messageCountEnd = lines.indexOf("", messageCountStart)
        if (messageCountEnd === -1) {
            throw new Error('No empty line found after "Message Count" title in commservice\'s output')
        }

        let messageTimingsTitleIndex = lines.indexOf("Message Timings", messageCountEnd + 1)
        if (messageTimingsTitleIndex === -1) {
            throw new Error('"Message Timings" title not found in commservice\'s output')
        }
        let messageTimingsStart = messageTimingsTitleIndex + 1
        let messageTimingsEnd = lines.indexOf("", messageTimingsStart)
        if (messageTimingsEnd === -1) {
            throw new Error('No empty line found after "Message Timings" title in commservice\'s output')
        }

        const messageCountSection = lines.slice(
            messageCountStart,
            messageCountEnd
        )

        const messageTimingsSection = lines.slice(
            messageTimingsStart,
            messageTimingsEnd
        )

        return {
            sections: {
                messageCount: messageCountSection.map(CommserviceEventEmitter.parseOutputLine),
                messageTimings: messageTimingsSection.map(CommserviceEventEmitter.parseOutputLine)
            }
        }
    }

    private static parseOutputLine(line: string): CommserviceResultLine {
        let passing: boolean
        switch (line[0]) {
            case '✓':
                passing = true
                break;
            case '✗':
                passing = false
                break;
            default:
                throw new Error("Failed to parse result line from commservice's output: " + line)
        }
        return {
            passing,
            description: line
        }
    }
}

export function startCommservice(
    variant?: 'linux' | 'mac' | 'windows'
): CommserviceEventEmitter {
    if (variant == undefined) {
        switch (platform()) {
            case 'darwin':
                variant = 'mac'
                break;
            case 'win32':
                variant = 'windows'
                break;
            case 'linux':
                variant = 'linux'
                break;
            default:
                throw new Error('Couldn\'t determine applicable variant of commservice automatically')
        }
    }

    const executablePath = path.join(
        __dirname, '../given', `commservice.${variant}`
    )
    const process = spawn(executablePath, {
        stdio: [null, "pipe", "pipe"]
    })

    return new CommserviceEventEmitter(process)
}
