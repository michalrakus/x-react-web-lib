import {
    CsvDecimalFormat,
    CsvEncoding,
    CsvParam,
    CsvSeparator, ExportParam,
    ExportType, LazyDataTableQueryParam
} from "../serverApi/ExportImportParam";
import React, {useState} from "react";
import {Dialog} from "primereact/dialog";
import {InputText} from "primereact/inputtext";
import {Dropdown} from "primereact/dropdown";
import {Checkbox} from "primereact/checkbox";
import {XButton} from "./XButton";
import {XUtils} from "./XUtils";
import {numberAsUI} from "../serverApi/XUtilsConversions";
import {xLocaleOption} from "./XLocale";

// parametre potrebne na zavolanie servisu pre export
export interface XExportParams {
    path: string; // service for export
    queryParam: LazyDataTableQueryParam | any; // parametre specificke pre konkretny export (zvycajne hodnoty filtra)
    headers?: string[];
    fileName: string; // fileName without extension
}

export const XExportRowsDialog = (props: {dialogOpened: boolean; hideDialog: () => void; rowCount?: number; exportTypeOptions?: ExportType[]; exportParams: XExportParams | (() => XExportParams);}) => {

    const [exportType, setExportType] = useState(ExportType.Csv);
    const [createHeaderLine, setCreateHeaderLine] = useState(true);
    const [csvSeparator, setCsvSeparator] = useState(CsvSeparator.Semicolon);
    const [decimalFormat, setDecimalFormat] = useState(CsvDecimalFormat.Comma);
    const [csvEncoding, setCsvEncoding] = useState(CsvEncoding.Win1250);

    // bez tejto metody by pri opetovnom otvoreni dialogu ponechal povodne hodnoty
    const onShow = () => {

        setExportType(ExportType.Csv);
        setCreateHeaderLine(true); // excel hadze hlasky koli prvemu riadku header-ov
        setCsvSeparator(CsvSeparator.Semicolon);
        setDecimalFormat(CsvDecimalFormat.Comma);
        setCsvEncoding(CsvEncoding.Win1250);
    }

    const onExport = async () => {

        // export vykoname az po zatvoreni dialogu - moze dlho trvat a pobezi asynchronne (user zatial moze pracovat s aplikaciou)

        // zavrieme dialog
        props.hideDialog();
        // TODO - pridat nejake koliesko, pripadne progress bar

        // exportParams vieme vytvorit aj cez funkciu, lebo XLazyDataTable nevedel vytvorit headers v case ked sa vytvaral XExportRowsDialog
        let exportParams: XExportParams;
        if (typeof props.exportParams === 'function') {
            exportParams = props.exportParams();
        }
        else {
            exportParams = props.exportParams;
        }

        // samotny export
        let csvParam: CsvParam | undefined = undefined;
        if (exportType === ExportType.Csv) {
            csvParam = {useHeaderLine: createHeaderLine, csvSeparator: csvSeparator, csvDecimalFormat: decimalFormat, csvEncoding: csvEncoding}
            if (csvParam.useHeaderLine) {
                csvParam.headers = exportParams.headers;
            }
        }
        const exportParam: ExportParam = {exportType: exportType, csvParam: csvParam, queryParam: exportParams.queryParam};
        let response;
        try {
            response = await XUtils.fetchBasicJson(exportParams.path, exportParam);
        }
        catch (e) {
            XUtils.showErrorMessage("Export failed.", e);
            return;
        }
        const fileExt: string = exportType;
        const fileName = `${exportParams.fileName}.${fileExt}`;
        // let respJson = await response.json(); - konvertuje do json objektu
        let respBlob = await response.blob();

        // download blob-u (download by mal fungovat asynchronne a "stream-ovo" v spolupraci so servrom)
        let url = window.URL.createObjectURL(respBlob);
        let a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
    }

    let elem: any = null;
    if (props.dialogOpened) {
        if (exportType === ExportType.Csv) {
            elem = <span>
            <div className="field grid">
                <label className="col-fixed" style={{width:'10rem'}}>{xLocaleOption('expCreateHeaderLine')}</label>
                <Checkbox checked={createHeaderLine} onChange={(e: any) => setCreateHeaderLine(e.checked)}/>
            </div>
            <div className="field grid">
                <label className="col-fixed" style={{width:'10rem'}}>{xLocaleOption('expCsvSeparator')}</label>
                <Dropdown value={csvSeparator} options={XUtils.csvSeparatorOptions} onChange={(e: any) => setCsvSeparator(e.value)}/>
            </div>
            <div className="field grid">
                <label className="col-fixed" style={{width:'10rem'}}>{xLocaleOption('expDecimalFormat')}</label>
                <Dropdown value={decimalFormat} options={XUtils.decimalFormatOptions} onChange={(e: any) => setDecimalFormat(e.value)}/>
            </div>
            <div className="field grid">
                <label className="col-fixed" style={{width:'10rem'}}>{xLocaleOption('expEncoding')}</label>
                <Dropdown value={csvEncoding} options={XUtils.csvEncodingOptions} onChange={(e: any) => setCsvEncoding(e.value)}/>
            </div>
        </span>;
        }
    }

    // poznamka: renderovanie vnutornych komponentov Dialogu sa zavola az po otvoreni dialogu
    return (
        <Dialog visible={props.dialogOpened} onShow={onShow} onHide={() => props.hideDialog()}>
            {props.rowCount ?
                <div className="field grid">
                    <label className="col-fixed" style={{width:'10rem'}}>{xLocaleOption('expRowCount')}</label>
                    <InputText value={numberAsUI(props.rowCount ?? null, 0)} readOnly={true}/>
                </div>
                : null
            }
            <div className="field grid">
                <label className="col-fixed" style={{width:'10rem'}}>{xLocaleOption('expExportType')}</label>
                <Dropdown value={exportType} options={props.exportTypeOptions ?? XUtils.exportTypeOptions} onChange={(e: any) => setExportType(e.value)}/>
            </div>
            {elem}
            <div className="flex justify-content-center">
                <XButton label={xLocaleOption('exportRows')} onClick={onExport}/>
            </div>
        </Dialog>
    );
}
