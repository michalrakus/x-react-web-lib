import React from "react";
import {XFormRowCol} from "./XFormRowCol";
import {XFormBase} from "../XFormBase";

export interface XFormColProps {
    form?: XFormBase;
    labelStyle?: React.CSSProperties;
    style?: React.CSSProperties; // prenesie sa na div
    children: JSX.Element | JSX.Element[];
}

export const XFormCol = (props: XFormColProps) => {
    return <XFormRowCol className="x-form-col" form={props.form} labelStyle={props.labelStyle} style={props.style} children={props.children}/>;
}
