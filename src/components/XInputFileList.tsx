import React from "react";
import {Component} from "react";
import {FileUpload, FileUploadHandlerEvent} from "primereact/fileupload";
import {XFormBase} from "./XFormBase";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XAssoc, XEntity} from "../serverApi/XEntityMetadata";
import {XUtils} from "./XUtils";
import {XObject} from "./XObject";
import {XButton} from "./XButton";
import {XButtonIconNarrow} from "./XButtonIconNarrow";

interface XFile {
    id: number;
    name: string;
    size: number;
    pathName?: string;
}

export interface XInputFileListProps {
    form: XFormBase;
    assocField: string;
    label?: string;
    chooseLabel?: string;
    readOnly?: boolean;
    saveDest: "fileSystem" | "database";
    subdir?: string; // subdirectory, where to save uploaded file (for the case saveDest === "fileSystem")
}

export class XInputFileList extends Component<XInputFileListProps> {

    public static defaultProps = {
        chooseLabel: "Add",
        saveDest: "fileSystem"
    };

    fileUploadRef: any;

    props: XInputFileListProps;
    entity: string;
    idField: string;
    xFileField: string;

    constructor(props: XInputFileListProps) {
        super(props);

        this.fileUploadRef = React.createRef();

        this.props = props;
        const xEntityForm: XEntity = XUtilsMetadata.getXEntity(props.form.getEntity());
        const xAssocToMany: XAssoc = XUtilsMetadata.getXAssocToMany(xEntityForm, props.assocField);
        this.entity = xAssocToMany.entityName;
        const xEntity = XUtilsMetadata.getXEntity(this.entity);
        this.idField = xEntity.idField;
        this.xFileField = XUtilsMetadata.getXAssocToOneByAssocEntity(xEntity, 'XFile').name;

        this.onDownloadFile = this.onDownloadFile.bind(this);
        this.onRemoveFile = this.onRemoveFile.bind(this);
        this.uploadHandler = this.uploadHandler.bind(this);

        const fieldFilename = `${props.assocField}.${this.xFileField}.filename`;
        props.form.addField(fieldFilename);
    }

    async uploadHandler(event: FileUploadHandlerEvent) {
        //const file = event.files[0];

        const endpoint: string = this.props.saveDest === 'fileSystem' ? 'x-upload-file-into-file-system' : 'x-upload-file-into-db';

        for (const file of event.files) {
            // uploadneme subor na server, insertne sa tam zaznam XFile a tento insertnuty zaznam pride sem a zapiseme ho do zoznamu form.object.<assocField>
            let xFile: XFile;
            try {
                xFile = await XUtils.fetchFile(endpoint,{filename: file.name, subdir: this.props.subdir}, file);
            }
            catch (e) {
                XUtils.showErrorMessage(`Upload of file "${file.name}" failed.`, e);
                this.fileUploadRef.current.clear(); // vyprazdnime hidden input, nech moze user znova zadat subory
                return; // prerusime upload tohto a dalsich suborov
            }

            const newFileItem: any = {};
            newFileItem[this.xFileField] = xFile;
            this.props.form.onTableAddRow(this.props.assocField, newFileItem, this.idField);
        }

        // vymaze zaznamy v event.files (hidden input type="file"), sposobi ze tlacitko "+Pridat" otvori dialog na vyber suborov
        this.fileUploadRef.current.clear();
    }

    async onDownloadFile(xFile: XFile) {
        let response;
        try {
            response = await XUtils.fetchBasicJson('x-download-file', {xFileId: xFile.id});
        }
        catch (e) {
            XUtils.showErrorMessage("Download failed.", e);
            return;
        }
        const fileName = xFile.name;
        // let respJson = await response.json(); - konvertuje do json objektu
        let respBlob = await response.blob();

        // download blob-u (download by mal fungovat asynchronne a "stream-ovo" v spolupraci so servrom)
        let url = window.URL.createObjectURL(respBlob);
        let a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
    }

    async onRemoveFile(fileItem: any) {
        // poznamka: nemozme zmazat zaznam na backend-e, lebo ak user ukonci editaciu formulara tlacitkom Cancel (alebo odide uplne prec),
        // tak musime mat v databaze zachovany povodny stav dat/suborov
        this.props.form.onTableRemoveRow(this.props.assocField, fileItem);
    }

    render() {
        const label = this.props.label ?? this.props.assocField;
        const readOnly = this.props.form.formReadOnlyBase(this.props.assocField) || (this.props.readOnly ?? false);

        const object: XObject | null = this.props.form.state.object;
        const fileItemList: any[] = object !== null ? object[this.props.assocField] : [];

        let elemList: any[] = [];
        for (const fileItem of fileItemList) {
            const xFile: XFile = fileItem[this.xFileField];
            // p-inputgroup uklada child elementy do riadku (display:flex)
            // TODO - pouzit XButtonIconSmall pre button na mazanie - problem je ze tam nevieme (narychlo) dat class m-1
            elemList.push(
                <div key={fileItem[this.idField].toString()} className="p-inputgroup p-mb-1">
                    <XButton label={xFile.name} onClick={() => this.onDownloadFile(xFile)}/>
                    <XButtonIconNarrow icon="pi pi-times" onClick={() => this.onRemoveFile(fileItem)} disabled={readOnly}/>
                </div>
            );
        }

        // vrchny div uklada child elementy pod seba (standardny display:block), zarovnane su dolava
        return (
            <div>
                <label>{label}</label>
                {elemList}
                <FileUpload ref={this.fileUploadRef} mode="basic" multiple auto customUpload uploadHandler={this.uploadHandler}
                            chooseLabel={this.props.chooseLabel} className="m-1" disabled={readOnly}/>
            </div>
        );
    }
}