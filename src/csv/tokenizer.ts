import {BufferedReader} from "../reader/buffered";
import {End} from "../reader";

export type Row = string[]

export class TokenizeError extends Error {
    constructor(msg: string) {
        super(msg)
    }
}

export const ColumnSeparator: unique symbol = Symbol('ColumnSeparator')
export type ColumnSeparator = typeof ColumnSeparator;

export const RowSeparator: unique symbol = Symbol('RowSeparator')
export type RowSeparator = typeof RowSeparator;

export const CSVEnd: unique symbol = Symbol('CSVEnd')
export type CSVEnd = typeof CSVEnd;

export class CSVTokenizer {
    private columnSeparator: string
    constructor(
        {
            columnSeparator = ','
        }: {
            columnSeparator?: string
        } = {}
    ) {
        if (columnSeparator.length !== 1) {
            throw new TokenizeError("Column separator's length must be 1, single character")
        }
        this.columnSeparator = columnSeparator
    }

    async readRow(reader: BufferedReader): Promise<Row | CSVEnd> {
        const cells: Row = []

        let wasColumnSeparator = false;

        while(true) {
            const token = await this.readToken(reader)
            if (
                token === RowSeparator ||
                token === End
            ) {
                if (wasColumnSeparator) {
                    cells.push('')
                } else if (cells.length === 0) {
                    return CSVEnd
                }
                break
            } else if (token === ColumnSeparator) {
                if (cells.length === 0 || wasColumnSeparator) {
                    cells.push('')
                }
                wasColumnSeparator = true
            } else {
                cells.push(token)
                wasColumnSeparator = false
            }
        }

        return cells
    }

    async readToken(reader: BufferedReader): Promise<string | ColumnSeparator | RowSeparator | End> {
        let char = await reader.readCharacter()
        if (char === '"') {
            return CSVTokenizer.readQuoted(reader, true)
        } else if (char === this.columnSeparator) {
            return ColumnSeparator
        } else if (char === '\r') {
            char = await reader.readCharacter()
            if (char !== '\n') {
                reader.pushCharacter(char)
            }
            return RowSeparator
        } else if (char === '\n') {
            return RowSeparator
        } else if (char === End) {
            return char
        } else {
            let content = char
            while(true) {
                char = await reader.readCharacter()
                if (
                    char === this.columnSeparator ||
                    char === '\r' ||
                    char === '\n' ||
                    char === End
                ) {
                    reader.pushCharacter(char)
                    break
                } else if (char === '"') {
                    throw new TokenizeError("Quotation mark characters must be wrapped and escaped by double quotation marks")
                } else {
                    content += char
                }
            }
            return content
        }
    }

    static async readQuoted(reader: BufferedReader, skipFirstQuotationMark: boolean = false): Promise<string> {
        let char: string | End
        if (!skipFirstQuotationMark) {
            char = await reader.readCharacter()
            if (char !== '"') {
                throw new TokenizeError("Expected quotation character (\")")
            }
        }

        let content = ''
        while(true) {
            char = await reader.readCharacter()
            if (char === '"') {
                char = await reader.readCharacter()
                if (char === '"') {
                    content += '"'
                } else {
                    reader.pushCharacter(char)
                    break
                }
            } else if (char === End) {
                break
            } else {
                content += char
            }
        }
        return content
    }
}
