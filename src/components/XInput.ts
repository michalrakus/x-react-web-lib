import React from "react";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XField} from "../serverApi/XEntityMetadata";

export interface XInputProps<T> extends XFormComponentProps<T> {
    field: string;
    inputStyle?: React.CSSProperties;
}

// spolocna nadtrieda pre jednoduche inputy (nie asociacne)
export abstract class XInput<T, P extends XInputProps<T>> extends XFormComponent<T, P> {

    protected xField: XField;

    protected constructor(props: P) {
        super(props);

        this.xField = XUtilsMetadata.getXFieldByPathStr(props.form.getEntity(), props.field);

        props.form.addField(props.field);
    }

    getField(): string {
        return this.props.field;
    }

    isNotNull(): boolean {
        return !this.xField.isNullable;
    }
}
