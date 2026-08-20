import React, {useState} from "react";
import {Dialog} from "primereact/dialog";
import {Checkbox} from "primereact/checkbox";
import {xLocaleOption} from "../XLocale";
import {XButton} from "../XButton";

export interface XColumnToggleDialogItem {
    index: number; // index in columnToggles / props.children
    label: string;
}

export const XColumnToggleDialog = (props: {
    dialogOpened: boolean;
    items: XColumnToggleDialogItem[];
    columnToggles: boolean[];
    initColumnToggles: boolean[];
    onOk: (columnToggles: boolean[]) => void;
    onHide: () => void;
}) => {

    const [columnTogglesLocal, setColumnTogglesLocal] = useState<boolean[]>(props.columnToggles);

    // without onShow, reopening the dialog would keep previous local edits after Cancel
    const onShow = () => {
        setColumnTogglesLocal([...props.columnToggles]);
    }

    const onCheckboxChange = (index: number, checked: boolean) => {
        const columnTogglesNew: boolean[] = [...columnTogglesLocal];
        while (columnTogglesNew.length <= index) {
            columnTogglesNew.push(true);
        }
        columnTogglesNew[index] = checked;
        setColumnTogglesLocal(columnTogglesNew);
    }

    const onResetColumns = () => {
        setColumnTogglesLocal([...props.initColumnToggles]);
    }

    const onOk = () => {
        props.onOk(columnTogglesLocal);
        props.onHide();
    }

    return (
        <Dialog header={xLocaleOption('columnToggle')} visible={props.dialogOpened} onShow={onShow} onHide={props.onHide}>
            {props.items.map((item: XColumnToggleDialogItem) => {
                const inputId: string = `x-column-toggle-${item.index}`;
                return (
                    <div key={item.index} className="field-checkbox mb-2">
                        <Checkbox inputId={inputId} checked={columnTogglesLocal[item.index] !== false}
                                  onChange={(e) => onCheckboxChange(item.index, e.checked ?? false)}/>
                        <label htmlFor={inputId} className="ml-2">{item.label}</label>
                    </div>
                );
            })}
            <div className="flex justify-content-center mt-3">
                <XButton label={xLocaleOption('resetColumns')} onClick={onResetColumns}/>
            </div>
            <div className="flex justify-content-center mt-2">
                <XButton label={xLocaleOption('ok')} onClick={onOk}/>
                <XButton label={xLocaleOption('cancel')} onClick={props.onHide}/>
            </div>
        </Dialog>
    );
}
