export interface XFile {
    id: number;
    name: string;
    size: number;
    pathName: string;
    // used only in backend
    //data: Buffer;

    modifDate: Date;
    modifXUser: number;
}
