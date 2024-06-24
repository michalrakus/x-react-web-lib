import React from "react";
import {XFormBase} from "./XFormBase";
import {xLocaleOption} from "./XLocale";

export const XFormHeader = (props: {form?: XFormBase; label: string; appendNewRow: boolean; style?: React.CSSProperties;}) => {

    return (
        <div className="x-form-header" style={props.style}>{props.label + (props.appendNewRow && props.form?.isAddRow() ? " - " + xLocaleOption('newRow') : "")}</div>
    );
}

XFormHeader.defaultProps = {
    appendNewRow: true
};
