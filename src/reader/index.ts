/* `End` is a unique symbol which points the end of the reader's source. */
export const End: unique symbol = Symbol('End')
export type End = typeof End;

export interface Reader {
    /**
     * Reads next character and returns. If no character left to be
     * red in the source, then it returns `End` symbol.
     */
    readCharacter(): Promise<string | End>

    /**
     * Attempts to close related resources of the underlying source
     * that the reader fetches characters from.
     */
    close(): void
}
