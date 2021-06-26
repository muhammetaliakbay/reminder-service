import {expect, use} from "chai"
import * as chaiAsPromised from "chai-as-promised"
import {BufferedReader} from "../reader/buffered";
import {CSVTokenizer} from "./tokenizer";
import {CSVParser, InvalidColumnsError, ParserError} from "./parser";
import {StringReader} from "../reader/string";

use(chaiAsPromised)

describe("CSVParser", () => {
    const tokenizer = new CSVTokenizer({
        columnSeparator: ','
    })

    describe("readHeader()", () => {

        it('should throw ParserError if no header line was found before end of the CSV document', async () => {
            const reader = new StringReader("")
            const buffered = new BufferedReader(reader)
            const parser = new CSVParser(tokenizer, buffered)

            expect(parser.readHeader()).rejectedWith(ParserError)
        })

        it('should read header with correct column titles', async () => {
            const reader = new StringReader(
                'header-a,B,"header,c"'
            )
            const buffered = new BufferedReader(reader)
            const parser = new CSVParser(tokenizer, buffered)

            await parser.readHeader()
            const header = parser.getHeader()
            expect(header).eql([
                "header-a",
                "B",
                "header,c"
            ])

            expect(await parser.readRow()).null
        })

    })

    describe('readRow()', () => {

        it('should throw InvalidColumnsError when a row has invalid number of columns', async () => {
            const reader = new StringReader(
                '1,2'
            )
            const buffered = new BufferedReader(reader)
            const parser = new CSVParser(tokenizer, buffered)

            parser.setHeader(["a", "b", "c"])

            expect(parser.readRow()).rejectedWith(InvalidColumnsError)
        })

        it('should return correct values of cells for a row', async () => {
            const reader = new StringReader(
                'a,b,c\n' +
                '1,",","3"\n' +
                'z,"""","y"\n'
            )
            const buffered = new BufferedReader(reader)
            const parser = new CSVParser(tokenizer, buffered)

            await parser.readHeader()

            expect(parser.getHeader()).eql(["a", "b", "c"])

            expect(await parser.readRow()).eql(['1', ',', '3'])
            expect(await parser.readRow()).eql(['z', '"', 'y'])

            expect(await parser.readRow()).null
        })

    });

    describe("readRowObject()", () => {

        it("should return an object with correct key-value pairs", async () => {
            const reader = new StringReader(
                'A,B,C\n' +
                'x,y,z\n'
            )
            const buffered = new BufferedReader(reader)
            const parser = new CSVParser(tokenizer, buffered).setHeader([
                'COL1',
                'col2',
                'LAST_COL'
            ])

            expect(
                await parser.readRowObject()
            ).eql({
                COL1: 'A',
                col2: 'B',
                LAST_COL: 'C'
            })

            expect(
                await parser.readRowObject()
            ).eql({
                COL1: 'x',
                col2: 'y',
                LAST_COL: 'z'
            })

            expect(await parser.readRow()).null
        })

    })
})
