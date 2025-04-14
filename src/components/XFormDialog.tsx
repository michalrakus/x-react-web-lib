import React from "react";
import {Dialog} from "primereact/dialog";
import {XOnSaveOrCancelProp} from "./XFormBase";
import {OperationType} from "./XUtils";
import { XFormProps } from "./XFormBase"; /* DO NOT REMOVE - IS USED EVEN IF IT IS MARKED AS NOT USED */

export interface XFormDialogState {
    opened: boolean;
    id?: number;
    initValues?: object;
}

export const XFormDialog = (props: {
    dialogState: XFormDialogState;
    form: JSX.Element;
    onSaveOrCancel: XOnSaveOrCancelProp;
}) => {

    const onHide = () => {
        if (props.onSaveOrCancel) {
            props.onSaveOrCancel(null, OperationType.None);
        }
    }

    return (
        <Dialog key="dialog-form" className="x-dialog-without-header" visible={props.dialogState.opened} onHide={onHide}>
            {/* klonovanim elementu pridame atributy id, initValues, onSaveOrCancel */}
            {React.cloneElement(props.form, {
                id: props.dialogState.id, initValues: props.dialogState.initValues, onSaveOrCancel: props.onSaveOrCancel
            } satisfies XFormProps/*, this.props.valueForm.children*/)}
        </Dialog>
    );
}
