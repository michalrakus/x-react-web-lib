import React from "react";
import {Component} from "react";
import {FileUpload, FileUploadHandlerEvent} from "primereact/fileupload";
import {XFormBase} from "./XFormBase";
import {XAssoc, XEntity} from "../serverApi/XEntityMetadata";
import {XUtils} from "./XUtils";
import {XObject} from "./XObject";
import {XButton} from "./XButton";
import {XButtonIconNarrow} from "./XButtonIconNarrow";
import {numberAsUI} from "../serverApi/XUtilsConversions";
import {xLocaleOption} from "./XLocale";
import {XFileJsonField} from "../serverApi/XFileJsonField";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

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
    maxFileSize?: number; // maximum file size allowed in bytes
}

// notice: in skch there is new version XInputFileList2 and that version don´t use fetch api because fetch api does not support progress bar
export class XInputFileList extends Component<XInputFileListProps> {

    public static defaultProps = {
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
        const xEntityForm: XEntity = XUtilsMetadataCommon.getXEntity(props.form.getEntity());
        const xAssocToMany: XAssoc = XUtilsMetadataCommon.getXAssocToMany(xEntityForm, props.assocField);
        this.entity = xAssocToMany.entityName;
        const xEntity = XUtilsMetadataCommon.getXEntity(this.entity);
        this.idField = xEntity.idField;
        this.xFileField = XUtilsMetadataCommon.getXAssocToOneByAssocEntity(xEntity, 'XFile').name;

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
            // skontrolujeme velkost - robime to tuto, lebo ked nastavime maxFileSize na komponente FileUpload, tak prilis velky subor sem do handlera ani neposle
            if (this.props.maxFileSize !== undefined && file.size > this.props.maxFileSize) {
                alert(xLocaleOption('fileUploadSizeToBig', {fileName: file.name, fileSize: XInputFileList.sizeInMB(file.size), maxFileSize: XInputFileList.sizeInMB(this.props.maxFileSize)}))
                continue; // ideme na dalsi subor
            }
            // uploadneme subor na server, insertne sa tam zaznam XFile a tento insertnuty zaznam pride sem a zapiseme ho do zoznamu form.object.<assocField>
            const jsonFieldValue: XFileJsonField = {
                filename: file.name,
                subdir: this.props.subdir,
                modifDate: new Date(),
                modifXUser: XUtils.getXToken()?.xUser?.id
            }
            let xFile: XFile;
            try {
                xFile = await XUtils.fetchFile(endpoint, jsonFieldValue, file);
            }
            catch (e) {
                XUtils.showErrorMessage(xLocaleOption('fileUploadFailed', {fileName: file.name}), e);
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

    static sizeInMB(size: number): string {
        const sizeInMB = size / (10 ** 6);
        return numberAsUI(sizeInMB, 2) + ' MB'; // zobrazime 2 desatinky
    }

    async onDownloadFile(xFile: XFile) {
        XUtils.downloadFile('x-download-file',{xFileId: xFile.id}, xFile.name);
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
                            chooseLabel={this.props.chooseLabel ?? xLocaleOption('addRow')} className="m-1" disabled={readOnly}/>
            </div>
        );
    }
}