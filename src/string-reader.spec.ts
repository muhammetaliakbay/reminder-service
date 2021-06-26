import {End, StringReader} from "./reader";
import {expect} from "chai"

describe("StringReader", () => {
    describe("readCharacter()", () => {
        it('should return `End` for the first call if the string is empty', async () => {
            const reader = new StringReader("")
            expect(await reader.readCharacter()).eq(End)
        })

        it('should return all the characters in the correct order and `End` at last', async () => {
            const string = "Hello World!"
            const reader = new StringReader(string)

            for (let i = 0; i < string.length; i ++) {
                expect(await reader.readCharacter()).eq(string[i])
            }
            expect(await reader.readCharacter()).eq(End)
        })
    })
})
