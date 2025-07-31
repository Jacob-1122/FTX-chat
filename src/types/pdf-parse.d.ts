// This file is to provide a type definition for pdf-parse, which doesn't have its own.
declare module 'pdf-parse/lib/pdf-parse.js' {
    const pdf: (dataBuffer: ArrayBuffer) => Promise<{
        numpages: number;
        numrender: number;
        info: any;
        metadata: any;
        version: string;
        text: string;
    }>;
    export default pdf;
}
