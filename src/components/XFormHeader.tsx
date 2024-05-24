import React from "react";
import {XFormBase} from "./XFormBase";
import {xLocaleOption} from "./XLocale";

export const XFormHeader = (props: {form?: XFormBase; label: string;}) => {

    return (
        <div className="x-form-header">{props.label + (props.form?.isAddRow() ? " - " + xLocaleOption('newRow') : "")}</div>
    );
}