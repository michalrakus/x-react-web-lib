import React, {useState} from "react";
import {Dialog} from "primereact/dialog";
import {XFieldSelector} from "./XFieldSelector";
import {InputText} from "primereact/inputtext";
import {Checkbox} from "primereact/checkbox";
import {XButton} from "./XButton";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";

export interface XEditColumnDialogValues {
    field: string;
    header: string;
    dropdownInFilter: boolean;
}

export const XEditColumnDialog = (props: {dialogOpened: boolean; addColumn: boolean; entity: string; xEditColumnDialogValues?: XEditColumnDialogValues; onHideDialog: (xEditColumnDialogValues: XEditColumnDialogValues | null) => void;}) => {

    const notNullValues = props.xEditColumnDialogValues ?? {field: "", header: "", dropdownInFilter: false};

    const [field, setField] = useState<string>(notNullValues.field);
    const [header, setHeader] = useState(notNullValues.header);
    const [dropdownInFilter, setDropdownInFilter] = useState(notNullValues.dropdownInFilter);
    const [dropdownInFilterReadOnly, setDropdownInFilterReadOnly] = useState(true);

    // bez tejto metody by nefungovala inicializacia stavu podla "props.xEditColumnDialogValues" pri opetovnom otvarani dialogu
    // asi to neni moc pekny sposob ale nechce sa mi posuvat stav do vyssej komponenty, zatial nechame takto
    const onShow = () => {

        setField(notNullValues.field);
        setHeader(notNullValues.header);
        setDropdownInFilter(notNullValues.dropdownInFilter);

        setupDropdownInFilter(notNullValues.field); // depends on "field"
    }

    const onFieldChange = (selectedField: string) => {

        setField(selectedField);
        setupDropdownInFilter(selectedField); // depends on "field"
    }

    const setupDropdownInFilter = (field: string) => {
        const fieldList: string[] = XUtilsCommon.getFieldListForPath(field);
        if (fieldList.length < 2) {
            setDropdownInFilter(false);
            setDropdownInFilterReadOnly(true);
        }
        else {
            setDropdownInFilterReadOnly(false);
        }
    }

    const onSave = () => {

        if (!field) {
            alert("Please select the row.");
            return;
        }

        props.onHideDialog({field: field, header: header, dropdownInFilter: dropdownInFilter});
    }


    let fieldElement;
    let buttonLabel;
    if (props.addColumn) {
        fieldElement =
            <div className="mb-3">
                <XFieldSelector entity={props.entity} assocSelectable={false}
                                           selectionField={field} onSelectionChange={onFieldChange}/>
            </div>;
        buttonLabel = "Add column";
    }
    else {
        fieldElement =
            <div className="field grid">
                <label htmlFor="field" className="col-fixed" style={{width:'9.3rem'}}>Field</label>
                <InputText id="field" value={field} readOnly={true}/>
            </div>;
        buttonLabel = "Modify column";
    }

    // poznamka: renderovanie vnutornych komponentov Dialogu sa zavola az po otvoreni dialogu
    return (
        <Dialog visible={props.dialogOpened} onShow={onShow} onHide={() => props.onHideDialog(null)}>
            {fieldElement}
            <div className="field grid">
                <label htmlFor="header" className="col-fixed" style={{width:'9.3rem'}}>Header</label>
                <InputText id="header" value={header} onChange={(e: any) => setHeader(e.target.value)} maxLength={64}/>
            </div>
            <div className="field grid">
                <label htmlFor="dropdownInFilter" className="col-fixed" style={{width:'9.3rem'}}>Dropdown in filter</label>
                <Checkbox id="dropdownInFilter" checked={dropdownInFilter} onChange={(e: any) => setDropdownInFilter(e.checked)} readOnly={dropdownInFilterReadOnly}/>
            </div>
            <XButton label={buttonLabel} onClick={onSave}/>
        </Dialog>
    );
}
