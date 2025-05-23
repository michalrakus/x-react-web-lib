import React from "react";
import {Dialog} from "primereact/dialog";
import {XOnSaveOrCancelProp} from "./XFormBase";
import {OperationType} from "./XUtils";
import { XFormProps } from "./XFormBase"; /* DO NOT REMOVE - IS USED EVEN IF IT IS MARKED AS NOT USED */

export interface XFormDialogState {
    opened: boolean;
    id?: number;
    initValues?: object;
    onSaveOrCancel?: XOnSaveOrCancelProp;
    form?: JSX.Element; // overrides prop form in XFormDialog
}

export const XFormDialog = (props: {
    dialogState: XFormDialogState;
    form?: JSX.Element;
}) => {

    const onHide = () => {
        if (props.dialogState.onSaveOrCancel) {
            props.dialogState.onSaveOrCancel(null, OperationType.None);
        }
    }

    const form: JSX.Element | undefined = props.dialogState.form ?? props.form;

    return (
        <Dialog key="dialog-form" className="x-dialog-without-header" visible={props.dialogState.opened} onHide={onHide}>
            {/* using cloneElement we add props id, initValues, onSaveOrCancel */}
            {form ? React.cloneElement(form, {
                id: props.dialogState.id, initValues: props.dialogState.initValues, onSaveOrCancel: props.dialogState.onSaveOrCancel, isInDialog: true
            } satisfies XFormProps/*, props.form.children*/) : null}
        </Dialog>
    );
}
