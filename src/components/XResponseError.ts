// tento error pouzivame ak http request vrati http kod <> 2xx
export interface XResponseErrorBody {
    statusCode: number;
    message: string;
    exceptionName: string;
    sqlMessage?: string;
    sql?: string;
}

export class XResponseError extends Error {

    xResponseErrorBody: XResponseErrorBody;

    constructor(path: string, status: number, statusText: string, body: XResponseErrorBody) {
        super(`Http request "${path}" failed. Status: ${status}, status text: ${statusText}`);
        // see: typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        this.name = XResponseError.name; // stack traces display correctly now

        this.xResponseErrorBody = body;
    }
}