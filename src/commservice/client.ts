import * as http from "http";
import {IncomingMessage} from "http";

export class CommserviceClient {
    constructor(
        private host: string,
        private port: number
    ) {
    }

    private async request(
        {
            path,
            body
        }: {
            path: string,
            body: any
        }
    ): Promise<{body: any, statusCode: number}> {
        const request = http.request({
            host: this.host,
            port: this.port,
            path,
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        })
        try {
            request.write(JSON.stringify(body))
            request.end()
            const response = await new Promise<IncomingMessage>(
                (resolve, reject) => {
                    request.once("response", response => resolve(response))
                    request.once("close", () => reject())
                    request.once("error", err => reject(err))
                }
            )
            const statusCode = response.statusCode
            const contentType = response.headers["content-type"]
            if (
                typeof contentType !== 'string' ||
                !/^application\/json;?/.test(contentType)
            ) {
                throw new Error("Unaccepted content-type in response: " + response.headers["content-type"])
            } else if (!Number.isInteger(statusCode)) {
                throw new Error("Invalid status code of response: " + statusCode)
            } else {
                const bodyString = await new Promise<string>(
                    (resolve, reject) => {
                        const parts: Buffer[] = []
                        let total = 0
                        response.on('data', chunk => {
                            if (!Buffer.isBuffer(chunk)) {
                                reject(new Error('Unexpected type of chunk in response\'s body: ' + typeof chunk));
                            } else {
                                parts.push(chunk)
                                total += chunk.length
                            }
                        })
                        response.once('end', () => resolve(
                            Buffer.concat(parts, total).toString('utf8')
                        ))
                        response.once("close", () => reject())
                        response.once("error", err => reject(err))
                    }
                )
                const body = JSON.parse(bodyString)
                return {
                    body,
                    statusCode
                }
            }
        } finally {
            request.destroy()
        }
    }

    async messages(
        {
            email,
            text
        }: {
            email: string,
            text: string
        }
    ): Promise<{paid: boolean}> {
        const {body, statusCode} = await this.request({
            body: {
                email,
                text
            },
            path: '/messages'
        })
        if (statusCode !== 201) {
            throw new Error('Unexpected status code of response, expected 201, got ' + statusCode)
        }
        const paid = typeof body.paid === 'boolean' ? body.paid : false
        return {paid}
    }
}
