import React from "react";

export const XFormHeader = (props: {label: string;}) => {

    return (
        <div className="x-form-header">{props.label}</div>
    );
}