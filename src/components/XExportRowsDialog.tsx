import {CsvDecimalFormat, CsvParam, CsvSeparator, ExportType} from "../serverApi/ExportImportParam";
import React, {useState} from "react";
import {Dialog} from "primereact/dialog";
import {InputText} from "primereact/inputtext";
import {Dropdown} from "primereact/dropdown";
import {Checkbox} from "primereact/checkbox";
import {XButton} from "./XButton";
import {XUtils} from "./XUtils";

export const XExportRowsDialog = (props: {dialogOpened: boolean; rowCount?: number; onHideDialog: (ok: boolean, exportType: ExportType | undefined, csvParam: CsvParam | undefined) => void;}) => {

    const [exportType, setExportType] = useState(ExportType.Csv);
    const [createHeaderLine, setCreateHeaderLine] = useState(false);
    const [csvSeparator, setCsvSeparator] = useState(CsvSeparator.Semicolon);
    const [decimalFormat, setDecimalFormat] = useState(CsvDecimalFormat.Comma);

    // bez tejto metody by pri opetovnom otvoreni dialogu ponechal povodne hodnoty
    const onShow = () => {

        setExportType(ExportType.Csv);
        setCreateHeaderLine(false); // excel hadze hlasky koli prvemu riadku header-ov
        setCsvSeparator(CsvSeparator.Semicolon);
        setDecimalFormat(CsvDecimalFormat.Comma);
    }

    const onExport = () => {

        // export vykoname az po zatvoreni dialogu - moze dlho trvat a pobezi asynchronne (user zatial moze pracovat s aplikaciou)
        props.onHideDialog(true, exportType, {useHeaderLine: createHeaderLine, csvSeparator: csvSeparator, csvDecimalFormat: decimalFormat});
    }

    let elem: any = null;
    if (props.dialogOpened) {
        if (exportType === ExportType.Csv) {
            elem = <span>
            <div className="p-field p-grid">
                <label className="p-col-fixed" style={{width:'130px'}}>Create header line</label>
                <Checkbox checked={createHeaderLine} onChange={(e: any) => setCreateHeaderLine(e.checked)}/>
            </div>
            <div className="p-field p-grid">
                <label className="p-col-fixed" style={{width:'130px'}}>Csv separator</label>
                <Dropdown value={csvSeparator} options={XUtils.csvSeparatorOptions} onChange={(e: any) => setCsvSeparator(e.value)}/>
            </div>
            <div className="p-field p-grid">
                <label className="p-col-fixed" style={{width:'130px'}}>Decimal format</label>
                <Dropdown value={decimalFormat} options={XUtils.decimalFormatOptions} onChange={(e: any) => setDecimalFormat(e.value)}/>
            </div>
        </span>;
        }
    }

    // poznamka: renderovanie vnutornych komponentov Dialogu sa zavola az po otvoreni dialogu
    return (
        <Dialog visible={props.dialogOpened} onShow={onShow} onHide={() => props.onHideDialog(false, undefined, undefined)}>
            <div className="p-field p-grid">
                <label className="p-col-fixed" style={{width:'130px'}}>Row count</label>
                <InputText value={props.rowCount} readOnly={true}/>
            </div>
            <div className="p-field p-grid">
                <label className="p-col-fixed" style={{width:'130px'}}>Export type</label>
                <Dropdown value={exportType} options={XUtils.exportTypeOptions} onChange={(e: any) => setExportType(e.value)}/>
            </div>
            {elem}
            <XButton label="Export" onClick={onExport}/>
        </Dialog>
    );
}
