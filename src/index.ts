#!/usr/env node

import * as yargs from "yargs";
import {createReadStream} from "fs";
import {StreamReader} from "./reader";
import {BufferedReader} from "./buffered-reader";
import {CSVTokenizer} from "./csv-tokenizer";
import {CSVParser} from "./csv-parser";
import {parseSchedule} from "./schedule";
import {ScheduleList} from "./schedule-list";
import {Scheduler} from "./scheduler";
import {CommserviceClient} from "./commservice-client";
import {Readable} from "stream";
import {CommserviceEventEmitter, startCommservice} from "./commservice-starter";

let parser: CSVParser<"email"|"text"|"schedule">

yargs
    .scriptName("service")
    .env("SVC")

    .string("csv-file")
    .string("column-separator")
    .middleware(
        async argv => {
            let stream: Readable;
            if (argv["csv-file"] == undefined) {
                process.stdin.setEncoding('utf8');
                stream = process.stdin
            } else {
                stream = createReadStream(argv["csv-file"], {encoding: "utf8"})
            }

            const reader = new StreamReader(stream)
            const buffered = new BufferedReader(reader)
            const tokenizer = new CSVTokenizer({
                columnSeparator: argv["column-separator"]
            })
            parser = new CSVParser(tokenizer, buffered)
            await parser.readHeader()
            if (!parser.hasHeaderColumns("email", "text", "schedule")) {
                throw new Error("Missing columns")
            }
        }
    )

    .command(
        "parse [csv-file]",
        "Parse given csv-file",
        args => args,
        async argv => {
            try {
                while(true) {
                    const row = await parser.readRowObject()
                    if (row === null) {
                        break
                    } else {
                        const schedule = parseSchedule(row.schedule)
                        console.log({
                            ...row,
                            schedule
                        })
                    }
                }
            } finally {
                parser.close()
            }
        }
    )

    .command(
        "schedule [csv-file]",
        "Schedule by reading given csv-file",
        args => args
            .string("commservice-variant")
            .boolean("start-commservice").default("start-commservice", false)
            .string("commservice-host").default("commservice-host", "127.0.0.1")
            .number("commservice-port").default("commservice-port", 9090),
        async argv => {
            let commservice: CommserviceEventEmitter
            if (argv["start-commservice"]) {
                commservice = await startCommservice(
                    argv["commservice-variant"] as any
                )
            }

            try {
                if (commservice) {
                    await commservice.listening$
                }

                const list = new ScheduleList()
                try {
                    while(true) {
                        const row = await parser.readRowObject()
                        if (row === null) {
                            break
                        } else {
                            const schedule = parseSchedule(row.schedule)
                            list.put({
                                email: row.email,
                                text: row.text,
                                offsets: schedule
                            })
                        }
                    }
                } finally {
                    parser.close()
                }
                const client = new CommserviceClient(
                    argv["commservice-host"],
                    argv["commservice-port"]
                )
                const scheduler = new Scheduler(
                    list,
                    async ({email, text, offset}) => {
                        const {paid} = await client.messages({
                            email,
                            text
                        })
                        console.log({
                            email,
                            text,
                            offset,
                            paid
                        })
                        return paid
                    }
                )
                await scheduler.run()
            } finally {
                if (commservice) {
                    commservice.terminate()
                    const result = await commservice.result$
                    const fails = [
                        ...result.sections.messageCount,
                        ...result.sections.messageTimings
                    ].filter(
                        line => !line.passing
                    )
                    if (fails.length > 0) {
                        console.error("Some tests are failed in commservice: ")
                        for (const fail of fails) {
                            console.error(fail.description)
                        }
                        process.exit(1)
                    }
                }
            }
        }
    )

    .argv
