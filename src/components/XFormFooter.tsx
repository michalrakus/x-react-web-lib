import React from "react";
import {XFormBase} from "./XFormBase";
import {XButton} from "./XButton";
import {xLocaleOption} from "./XLocale";

// constant to be used in method formReadOnly to identify save button
export const xSaveButtonId: string = "x-save-button-id";

// helper wrapper
export const XFormFooter = (props: {form: XFormBase;}) => {

    const readOnly = props.form.formReadOnlyBase(xSaveButtonId);

    return (
        <div className="flex justify-content-center">
            <XButton icon="pi pi-save" label={xLocaleOption('save')} onClick={props.form.onClickSave} disabled={readOnly}/>
            <XButton icon="pi pi-times" label={xLocaleOption('cancel')} onClick={props.form.onClickCancel}/>
        </div>
    );
}