import React from "react";
import {XFormBase} from "./XFormBase";
import {XButton} from "./XButton";

// helper wrapper
export const XFormFooter = (props: {form: XFormBase;}) => {

    return (
        <div className="flex justify-content-center">
            <XButton label="Save" onClick={props.form.onClickSave}/>
            <XButton label="Cancel" onClick={props.form.onClickCancel}/>
        </div>
    );
}