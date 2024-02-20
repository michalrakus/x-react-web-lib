import React from "react";
import {XFormRowCol} from "./XFormRowCol";
import {XFormBase} from "../XFormBase";

export interface XFormRowProps {
    form?: XFormBase;
    labelStyle?: React.CSSProperties;
    style?: React.CSSProperties; // prenesie sa na div
    children: JSX.Element | JSX.Element[];
}

export const XFormRow = (props: XFormRowProps) => {
    return <XFormRowCol className="x-form-row" form={props.form} labelStyle={props.labelStyle} style={props.style} children={props.children}/>;
}
