#!/usr/env node

import * as yargs from "yargs";
import {createReadStream} from "fs";
import {BufferedReader} from "./reader/buffered";
import {CSVTokenizer} from "./csv/tokenizer";
import {CSVParser} from "./csv/parser";
import {parseSchedule} from "./schedule";
import {ScheduleList} from "./schedule/list";
import {Scheduler} from "./schedule/scheduler";
import {CommserviceClient} from "./commservice/client";
import {Readable} from "stream";
import {CommserviceEventEmitter, startCommservice} from "./commservice/starter";
import {StreamReader} from "./reader/stream";

/**
 * A singleton instance of the CSVParser, which will
 * be created using the provided file or the standard
 * input as depending to the specified command-line
 * parameters.
 */
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
                /* If no `--csv-file` (or as the positional argument) is specified,
                * then use standard input as the source of CSV document */
                process.stdin.setEncoding('utf8');
                stream = process.stdin
            } else {
                /* If a `--csv-file` (or as the positional argument) is specified,
                * then open a read stream for the given file path and use
                * as the source of the CSV document */
                stream = createReadStream(argv["csv-file"], {encoding: "utf8"})
            }

            const reader = new StreamReader(stream)
            const buffered = new BufferedReader(reader)
            const tokenizer = new CSVTokenizer({
                columnSeparator: argv["column-separator"]
            })
            parser = new CSVParser(tokenizer, buffered)
            /* Since the supplied CSV document must contain the header row, then
            * it is required to read the first row as the header and check trough
            * the expected names of the columns. */
            await parser.readHeader()
            if (!parser.hasHeaderColumns("email", "text", "schedule")) {
                throw new Error("Missing columns")
            }
        }
    )

    .command(
        "parse [csv-file]",
        "Parse given csv-file to check its consistency",
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
            /**
             * The singleton instance of `CommserviceEventEmitter` which
             * will be created if `--start-commservice` flag is passed.
             * It is responsible to start a commservice instance and
             * parse its result to see that if its test cases are passing.
             */
            let commservice: CommserviceEventEmitter
            if (argv["start-commservice"]) {
                /* If `--start-commservice` flag is passed, start a
                * commservice instance as a child process... */
                commservice = await startCommservice(
                    argv["commservice-variant"] as any
                )
            }

            try {
                if (commservice) {
                    /* ... and wait until it is listening for the requests. */
                    await commservice.listening$
                }

                /* Create an instance of `CommserviceClient` which will be
                * used for communicating with commservice to send requests
                * related to scheduled reminders. */
                const client = new CommserviceClient(
                    argv["commservice-host"],
                    argv["commservice-port"]
                )
                /* Create a `Scheduler` instance for managing and scheduling
                * the reminders for calling at the desired time offsets. The
                * runner which is passed to let the scheduler call for each
                * reminder is a delegate function for sending request to the
                * commservice and returning the information in the response,
                * which indicates whether it is paid. */
                const scheduler = new Scheduler(
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
                /* Fill the scheduler of the entries by reading the supplied CSV document,
                 until its end. */
                try {
                    while(true) {
                        const row = await parser.readRowObject()
                        if (row === null) {
                            break
                        } else {
                            const schedule = parseSchedule(row.schedule)
                            scheduler.schedule({
                                email: row.email,
                                text: row.text,
                                offsets: schedule
                            })
                        }
                    }
                } finally {
                    parser.close()
                }
                /* Wait until all of the scheduler reminders are fulfilled. */
                await scheduler.waitComplete()
            } finally {
                if (commservice) {
                    /* If a commservice is ran by the application at the start,
                    * send termination signal to the child-process and wait until
                    * it responds with the test results. `CommserviceEventEmitter`
                    * instance will parse the result and return as a
                    * `CommserviceResult` object. */
                    commservice.terminate()
                    const result = await commservice.result$
                    /* Take the list of failed test cases */
                    const fails = [
                        ...result.sections.messageCount,
                        ...result.sections.messageTimings
                    ].filter(
                        line => !line.passing
                    )
                    if (fails.length > 0) {
                        /* If some of the tests which are checked by commservice
                        * instance, raise the error and exit the program with a
                        * non-zero exit code. */
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
