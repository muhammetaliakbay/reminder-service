import {CSVEnd, CSVTokenizer, Row} from "./tokenizer";
import {BufferedReader} from "../reader/buffered";

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

    /**
     * Closes the source reader.
     */
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

    /**
     * Checks that if the headers, red or set, are valid. If all the column
     * names which are specified by the parameter `columns` are present
     * in the headers, then returns true, and false otherwise
     * @param columns Column names to look for in headers
     */
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

    /**
     * Reads next row as the header row, takes the cell contents as the column
     * names. This method is useful when the header row is present in the CSV
     * document, and can be used to load them instead of passing explicitly.
     * @see `setHeader`
     */
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

    /**
     * Reads next row in the CSV document, and returns the cell contents
     * as an array of strings. It also checks if the count of the cells
     * are equal to the count of columns in header, to make sure that the
     * row is valid. If no row left to be red in the document, then returns
     * `null`.
     */
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

    /**
     * Does almost the same what `readRow` does, but it also builds an
     * object by pairing corresponding column names and values of the cells
     * in the row as keys and values. As how `readRow` behaves, it returns
     * `null` if no row left to be red in the CSV document.
     * @see `readRow`
     */
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
