import {expect, use} from "chai"
import {createReadStream} from "fs";
import * as path from "path";
import * as chaiAsPromised from "chai-as-promised"
import {ChunkTypeError, StreamReader} from "./stream";
import {End} from "./index";

use(chaiAsPromised)

describe("StreamReader", () => {
    describe("readCharacter()", () => {
        const testResourcesPath = path.join(__dirname, "../../test-resources")

        it('should return `End` for the first call if the file is empty', async () => {
            const stream = createReadStream(path.join(testResourcesPath, "empty.txt"))
            const reader = new StreamReader(stream)
            expect(await reader.readCharacter()).eq(End)
        })

        it('should throw ChunkTypeError if the stream emits not a string chunk', async () => {
            const stream = createReadStream(path.join(testResourcesPath, "hello-world.txt"))
            const reader = new StreamReader(stream)

            await expect(reader.readCharacter()).rejectedWith(ChunkTypeError)
        })

        it('should return all the characters in the correct order and `End` at last', async () => {
            const content = "Hello World!"
            const stream = createReadStream(
                path.join(testResourcesPath, "hello-world.txt"),
                {
                    encoding: 'utf8'
                }
            )
            const reader = new StreamReader(stream)

            for (let i = 0; i < content.length; i ++) {
                expect(await reader.readCharacter()).eq(content[i])
            }
            expect(await reader.readCharacter()).eq(End)
        })
    })
})
