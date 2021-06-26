import {CSVEnd, CSVTokenizer, Row} from "./csv-tokenizer";
import {BufferedReader} from "./buffered-reader";

export class ParserError extends Error {
    constructor(msg: string) {
        super(msg)
    }
}

export class InvalidColumnsError extends ParserError {
    constructor() {
        super("Number of columns in the header and the row just red are not equal");
    }
}

export type RowObject<H extends string = string> = {[header in H]: string}

export class CSVParser<H extends string = string> {
    constructor(
        private tokenizer: CSVTokenizer,
        private source: BufferedReader
    ) {
    }

    close(): void {
        this.source.close()
    }

    private header: (H[] & Row) | undefined = undefined

    getHeader(): Row {
        if (this.header == undefined) {
            throw new ParserError("No header was defined/red yet")
        }
        return this.header
    }

    hasHeaderColumns<HNEW extends H>(...columns: HNEW[]): this is CSVParser<HNEW> {
        const header = this.getHeader()
        return columns.every(
            column => header.includes(column)
        )
    }

    hasHeader(): boolean {
        return this.header != undefined
    }

    setHeader<HNEW extends H>(header: HNEW[] & Row): CSVParser<HNEW> {
        if (this.header != undefined) {
            throw new ParserError("A header was already defined/red")
        }
        this.header = header
        return this as any
    }

    async readHeader(): Promise<void> {
        if (this.header != undefined) {
            throw new ParserError("A header was already defined/red")
        }

        const row = await this.tokenizer.readRow(
            this.source
        )
        if (row === CSVEnd) {
            throw new ParserError("No header found before end of the CSV document")
        } else {
            this.header = row as H[]
        }
    }

    async readRow(): Promise<Row | null> {
        const header = this.getHeader()
        const row = await this.tokenizer.readRow(
            this.source
        )
        if (row === CSVEnd) {
            return null
        } else if (header.length !== row.length) {
            throw new InvalidColumnsError()
        } else {
            return row
        }
    }

    async readRowObject(): Promise<RowObject<H> | null> {
        const row = await this.readRow()
        if (row === null) {
            return null
        } else {
            return Object.fromEntries(
                row.map(
                    (value, index) => [
                        this.header![index] as H,
                        value
                    ] as const
                )
            ) as RowObject<H>
        }
    }
}
