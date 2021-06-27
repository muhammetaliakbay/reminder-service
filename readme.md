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

#### Check consistency
```bash
service parse <csv-file> # Parse given csv-file to check its consistency
```

#### Schedule reminders
```bash
service schedule <csv-file> # Schedule by reading given csv-file
    --start-commservice [boolean] # [default: false]
    --commservice-host  <string> # [default: "127.0.0.1"]
    --commservice-port  <number> # [default: 9090]
```
> **Note:** It is possible to run a commservice internally and check the test cases at the end of the execution by passing the argument: `--start-commservice`

## Used Dependencies

### Yargs
Yargs is used as a dependency in the task since it is not directly related to the core of the project.
It is just a library to parse and evaluate commandline parameters/commands easier.