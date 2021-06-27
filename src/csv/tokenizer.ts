import {BufferedReader} from "../reader/buffered";
import {End} from "../reader";

export type Row = string[]

export class TokenizeError extends Error {
    constructor(msg: string) {
        super(msg)
    }
}

/* === Constants for unique symbols which specifies some tokens that appear in CSV documents === */

export const ColumnSeparator: unique symbol = Symbol('ColumnSeparator')
export type ColumnSeparator = typeof ColumnSeparator;

export const RowSeparator: unique symbol = Symbol('RowSeparator')
export type RowSeparator = typeof RowSeparator;

/**
 * Points for the end of a valid CSV document, the end can be indicated by the end of the file
 *  or an empty line after (to be used to separate multiple CSV documents in the same file)
 */
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
        /* Column separator must be a character */
        if (columnSeparator.length !== 1) {
            throw new TokenizeError("Column separator's length must be 1, single character")
        }
        this.columnSeparator = columnSeparator
    }

    /**
     * Reads CSV tokens from the given reader, and parses the row. If a valid
     * row is found, returns an array of contents of cells. If and end of CSV
     * document is found, then it returns `CSVEnd` symbol.
     * @param reader `BufferedReader` instance to read characters of the tokens from
     */
    async readRow(reader: BufferedReader): Promise<Row | CSVEnd> {
        const cells: Row = []

        /* Used to determine whether the previous token was a column separator, which
        * is used to determine that if it the column was an empty one */
        let wasColumnSeparator = false;

        while(true) {
            const token = await this.readToken(reader)
            if (
                token === RowSeparator ||
                token === End
            ) {
                if (wasColumnSeparator) {
                    /* If a terminate token is found just after a column separator, then
                    * it was an empty cell */
                    cells.push('')
                } else if (cells.length === 0) {
                    /* If no cell content (even an empty one) found before the end of
                    * the row, then it is the end of the CSV document*/
                    return CSVEnd
                }
                /* Otherwise, it was just the end of the row, with at least one cell */
                break
            } else if (token === ColumnSeparator) {
                if (cells.length === 0 || wasColumnSeparator) {
                    /* If a column separator is found, at the start of the row or just
                    * after another column separator, then it was an empty cell*/
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

    /**
     * Reads individual CSV tokens, by individual it means the tokens previous or next do
     * not effect the value that is returned by the function. If a column separator, row
     * separator or end of the reader is red from the reader, then it returns the related
     * symbol constant. If a quoted string, or a raw content which doesn't contains any
     * special character is found, returns the content.
     * @param reader `BufferedReader` instance to read characters from
     */
    async readToken(reader: BufferedReader): Promise<string | ColumnSeparator | RowSeparator | End> {
        let char = await reader.readCharacter()
        if (char === '"') {
            /* If the very first character is quotation mark ("), then the rest of the
            * characters, until the end of the quoted string, is evaluated as the content */
            return CSVTokenizer.readQuoted(reader, true)
        } else if (char === this.columnSeparator) {
            return ColumnSeparator
        } else if (char === '\r') {
            /* If the character is a carriage-return character, then check also the next one... */
            char = await reader.readCharacter()
            if (char !== '\n') {
                /* ... if it is not a newline character, then push it back to make it available
                * to be red again by future `read` calls */
                reader.pushCharacter(char)
            }
            /* ... otherwise, if it is a newline character, then evaluate both of them as the row separator */
            return RowSeparator
        } else if (char === '\n') {
            return RowSeparator
        } else if (char === End) {
            return char
        } else {
            /* If the very first character was not any special one, then evaluate it and subsequent ones
            * as raw-content until a special one is found */
            let content = char
            while(true) {
                char = await reader.readCharacter()
                if (
                    char === this.columnSeparator ||
                    char === '\r' ||
                    char === '\n' ||
                    char === End
                ) {
                    /* If the last red character is a special one, then push it back to the buffer
                    * and stop reading following ones */
                    reader.pushCharacter(char)
                    break
                } else if (char === '"') {
                    /* Unescaped quotation marks can not be placed in raw-contents */
                    throw new TokenizeError("Quotation mark characters must be wrapped and escaped by double quotation marks")
                } else {
                    content += char
                }
            }
            return content
        }
    }

    /**
     * Reads the content of supplied quoted string by converting escaped (nested) quotation
     * marks into regular ones. first quotation marks can be skipped as being controlled by
     * the parameter named `skipFirstQuotationMark` if it was already red previously.
     * @param reader `BufferedReader` instance to read characters from
     * @param skipFirstQuotationMark Controls the behaviour whether the first quotation mark
     * is needed to be red
     */
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
                /* If the latest character is a quotation mark, check next one also... */
                char = await reader.readCharacter()
                if (char === '"') {
                    /* if it is a quotation mark too, then evaluate both of them as an
                    * escaped quotation mark together, ... */
                    content += '"'
                } else {
                    /* ... otherwise, push the latest one back to the buffer and evaluate
                    * the first one as the ending mark. */
                    reader.pushCharacter(char)
                    break
                }
            } else if (char === End) {
                throw new TokenizeError("No ending found for quoted string before the end")
            } else {
                content += char
            }
        }
        return content
    }
}
