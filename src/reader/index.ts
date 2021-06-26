export const End: unique symbol = Symbol('End')
export type End = typeof End;

export interface Reader {
    readCharacter(): Promise<string | End>

    close(): void
}
