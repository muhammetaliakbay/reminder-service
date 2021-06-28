[![Test](https://github.com/muhammetaliakbay/reminder-service/actions/workflows/test.yml/badge.svg)](https://github.com/muhammetaliakbay/reminder-service/actions/workflows/test.yml)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Yarn](https://img.shields.io/badge/Yarn-2C8EBB?style=for-the-badge&logo=yarn&logoColor=white)
![Node.JS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node-dot-js&logoColor=white)
---

# Reminder-Service
*As a test task for job opening in [Collect.ai](https://www.collect.ai)*

## Installing
```bash
yarn install # Install the project dependencies
yarn build # Compile the typescript sources
```

## Running

### Unit tests
```bash
yarn test # Run all the unit tests
```

### Challenge tests
The command below will run the service with the given CSV document, and run the commservice internally to check test cases at the end of the execution of all the scheduled reminders.
```bash
yarn service schedule given/customers.csv --start-commservice
```

### Commandline
Both of the commands listed below are reading the CSV document from the file with the path specified by the argument just after the name of the command.
It is also possible to let the reminder-service read the CSV document from standard input by not specifying any path.
With this way, the commands can be piped, eg:
```bash
cat given/customers.csv | yarn service <command>
```

#### Check consistency
```bash
yarn service parse [csv-file] # Parse given csv-file to check its consistency
```

#### Schedule reminders
```bash
yarn service schedule [csv-file]  # Schedule by reading given csv-file
    --start-commservice [boolean] # [default: false]
    --commservice-host  <string>  # [default: "127.0.0.1"]
    --commservice-port  <number>  # [default: 9090]
```
> **Note:** It is possible to run a commservice internally and check the test cases at the end of the execution by passing the argument: `--start-commservice`

## How it works
There are 2 main parts of reminder-service which are implemented in the project:
* CSV Parser
    * It consists of 2 internal parts, Readers and Tokenizer.
      2 kind of reader is implemented, StringReader and StreamReader, also an additional one named BufferedReader is implemented and used (very crucial one) by the tokenizer.
      The tokenizer reads the characters from the buffered reader to be evaluated. It is very important to use buffered reader's push-back functionality.
    * The parser can work continuously without storing the rows in the memory, so it is possible to read and parse millions of rows with no memory issue.
    * It also performs checks against the expected structure of the row, as the cell counts, and the column names.
* Scheduler
    * Handles the core logic of the challenge, stores the scheduled reminders into an internal list, which is sorted at the insert time by the offsets.
    * Uses Javascript's `setTimeout` function as the time based task scheduler, but since it is also designed to execute the logic in a continuous manner,
      it doesn't register more than one timeout at the same time, it uses only one. When a new reminder gets scheduled, it re-schedule the timeout for the earliest one.
    * It needs to keep only non-fulfilled reminders in the memory, so the requirement of memory sources are only depends on the amount of non-fulfilled scheduled reminders.
      This lets the service to handle the reminders in a continuous way, eg. supplying an endless CSV document from the standard input.

> **Note:** It is possible to feed the service with an endless CSV document to operate it as a micro-service.

## Used Dependencies

### Yargs
Yargs is used as a dependency in the task since it is not directly related to the core of the project.
It is just a library to parse and evaluate commandline parameters/commands easier.