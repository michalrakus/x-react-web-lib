import React from "react";
import {XFormBase} from "./XFormBase";
import {XButton} from "./XButton";

// constant to be used in method formReadOnly to identify save button
export const xSaveButtonId: string = "x-save-button-id";

// helper wrapper
export const XFormFooter = (props: {form: XFormBase;}) => {

    const readOnly = props.form.formReadOnlyBase(xSaveButtonId);

    return (
        <div className="flex justify-content-center">
            <XButton label="Save" onClick={props.form.onClickSave} disabled={readOnly}/>
            <XButton label="Cancel" onClick={props.form.onClickCancel}/>
        </div>
    );
}