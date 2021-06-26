import {End, StringReader} from "./reader";
import {expect, use} from "chai"
import * as chaiAsPromised from "chai-as-promised"
import {BufferedReader, UnableToPushEndError} from "./buffered-reader";

use(chaiAsPromised)

describe("BufferedReader", () => {
    describe("readCharacter()", () => {

        it('should return `End` for the first call if the string is empty', async () => {
            const reader = new StringReader("")
            const buffered = new BufferedReader(reader)
            expect(await buffered.readCharacter()).eq(End)
        })

        it('should return all the characters in the correct order and `End` at last', async () => {
            const string = "Hello World!"
            const reader = new StringReader(string)
            const buffered = new BufferedReader(reader)

            for (let i = 0; i < string.length; i ++) {
                expect(await buffered.readCharacter()).eq(string[i])
            }
            expect(await buffered.readCharacter()).eq(End)
        })

    })

    describe("pushCharacter(char)", () => {
        it('should be able to push `End` signal back', async () => {
            const reader = new StringReader("")
            const buffered = new BufferedReader(reader)
            expect(await buffered.readCharacter()).eq(End)
            await buffered.pushCharacter(End)
            expect(await buffered.readCharacter()).eq(End)
        })

        it('should throw UnableToPushEndError when try to push `End` before the end', async () => {
            const string = "Not-An-Empty-String"
            const reader = new StringReader(string)
            const buffered = new BufferedReader(reader)
            expect(await buffered.readCharacter()).eq(string[0])
            expect(() => buffered.pushCharacter(End)).throws(UnableToPushEndError)
        })

        it('should push the character back to make it available again', async () => {
            const string = "Hello World!"

            const reader = new StringReader(string)
            const buffered = new BufferedReader(reader)

            const char = await buffered.readCharacter()
            expect(char).eq(string[0])
            buffered.pushCharacter(char)

            for (let i = 0; i < string.length; i ++) {
                expect(await buffered.readCharacter()).eq(string[i])
            }
            expect(await buffered.readCharacter()).eq(End)
        })

        it('should push modified character back to override upcoming reads', async () => {
            const string = "Hello World!"
            const modifiedString = 'h' + string.substring(1)

            const reader = new StringReader(string)
            const buffered = new BufferedReader(reader)

            expect(await buffered.readCharacter()).eq(string[0])
            buffered.pushCharacter('h')

            for (let i = 0; i < modifiedString.length; i ++) {
                expect(await buffered.readCharacter()).eq(modifiedString[i])
            }
            expect(await buffered.readCharacter()).eq(End)
        })
    })
})
