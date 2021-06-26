import {End, StringReader} from "./reader";
import {expect, use} from "chai"
import * as chaiAsPromised from "chai-as-promised"
import {BufferedReader} from "./buffered-reader";
import {ColumnSeparator, CSVEnd, CSVTokenizer, RowSeparator, TokenizeError} from "./csv-tokenizer";

use(chaiAsPromised)

describe("CSVTokenizer", () => {
    const tokenizer = new CSVTokenizer({
        columnSeparator: ','
    })

    describe("readQuoted(reader)", () => {

        it('should throw TokenizeError for a quoted string with empty content', async () => {
            const reader = new StringReader('""')
            const buffered = new BufferedReader(reader)

            expect(CSVTokenizer.readQuoted(buffered)).rejectedWith(TokenizeError)
        })

        it('should return the correct string as the content for a quoted string', async () => {
            const reader = new StringReader('"Hello World!"')
            const buffered = new BufferedReader(reader)

            expect(await CSVTokenizer.readQuoted(buffered)).eq("Hello World!")
        })

        it('should return line-break/new-line characters in the content for a quoted string', async () => {
            const reader = new StringReader('"Hello\nWor\rld!\r\n"')
            const buffered = new BufferedReader(reader)

            expect(await CSVTokenizer.readQuoted(buffered)).eq("Hello\nWor\rld!\r\n")
        })

        it('should return quotation mark characters in the content for a quoted string which includes escaped quotation marks', async () => {
            const reader = new StringReader('"Hello ""W""""orld"""')
            const buffered = new BufferedReader(reader)

            expect(await CSVTokenizer.readQuoted(buffered)).eq('Hello "W""orld"')
        })

    })

    describe("readToken(reader)", () => {

        it('should return `End` for empty source', async () => {
            const reader = new StringReader("")
            const buffered = new BufferedReader(reader)

            expect(await tokenizer.readToken(buffered)).eq(End)
        })

        it('should return raw-content for a token with no special character', async () => {
            const reader = new StringReader("Hello World!")
            const buffered = new BufferedReader(reader)

            expect(await tokenizer.readToken(buffered)).eq("Hello World!")
            expect(await tokenizer.readToken(buffered)).eq(End)
        })

        it('should return `RowSeparator` for line-break/new-line tokens', async () => {
            const reader = new StringReader("\n" + "\n" + "\r\n" + "\r" + "\r")
            const buffered = new BufferedReader(reader)

            for (let i = 0; i < 5; i ++) {
                expect(await tokenizer.readToken(buffered)).eq(RowSeparator)
            }
            expect(await tokenizer.readToken(buffered)).eq(End)
        })

        it('should return correct content for a quoted string token', async () => {
            const reader = new StringReader('"He,""""ll""""o ""World""!"')
            const buffered = new BufferedReader(reader)

            expect(await tokenizer.readToken(buffered)).eq('He,""ll""o "World"!')
            expect(await tokenizer.readToken(buffered)).eq(End)
        })

        it('should throw TokenizeError for unescaped quotation marks', async () => {
            const reader = new StringReader('Hello" World')
            const buffered = new BufferedReader(reader)

            expect(tokenizer.readToken(buffered)).rejectedWith(TokenizeError)
        })

        it('should return `ColumnSeparator` for column separator tokens', async () => {
            const reader = new StringReader(',,,,,')
            const buffered = new BufferedReader(reader)

            for (let i = 0; i < 5; i ++) {
                expect(await tokenizer.readToken(buffered)).eq(ColumnSeparator)
            }
            expect(await tokenizer.readToken(buffered)).eq(End)
        })

    })

    describe('readRow(reader)', () => {

        it('should return `CSVEnd` for empty source at the first call', async () => {
            const reader = new StringReader('')
            const buffered = new BufferedReader(reader)

            expect(await tokenizer.readRow(buffered)).eq(CSVEnd)
        })

        it('should return correct cell values for a row', async () => {
            const reader = new StringReader(
                'a,bb,ccc'
            )
            const buffered = new BufferedReader(reader)

            expect(await tokenizer.readRow(buffered)).eql(['a', 'bb', 'ccc'])
            expect(await tokenizer.readRow(buffered)).eq(CSVEnd)
        })

        it('should return correct cell values for a row with a trailing new-line character', async () => {
            const reader = new StringReader(
                'zzz,yyy,xxx\n'
            )
            const buffered = new BufferedReader(reader)

            expect(await tokenizer.readRow(buffered)).eql(['zzz', 'yyy', 'xxx'])
            expect(await tokenizer.readRow(buffered)).eq(CSVEnd)
        })

        it('should return correct cell values for each of multiple rows', async () => {
            const reader = new StringReader(
                'zzz,yyy,xxx\n' +
                'a,bb,ccc\r\n' +
                '0,"1",""""'
            )
            const buffered = new BufferedReader(reader)

            expect(await tokenizer.readRow(buffered)).eql(['zzz', 'yyy', 'xxx'])
            expect(await tokenizer.readRow(buffered)).eql(['a', 'bb', 'ccc'])
            expect(await tokenizer.readRow(buffered)).eql(['0', '1', '"'])
            expect(await tokenizer.readRow(buffered)).eq(CSVEnd)
        })

        it('should return two empty cells for a line which has just a column separator character', async () => {
            const reader = new StringReader(',')
            const buffered = new BufferedReader(reader)

            expect(await tokenizer.readRow(buffered)).eql(['',''])
            expect(await tokenizer.readRow(buffered)).eq(CSVEnd)
        })

        it('should return correct cell values for a row which has quoted strings', async () => {
            const reader = new StringReader(
                '"Hello","""World"""'
            )
            const buffered = new BufferedReader(reader)

            expect(await tokenizer.readRow(buffered)).eql(['Hello','"World"'])
            expect(await tokenizer.readRow(buffered)).eq(CSVEnd)
        })

    });
})
