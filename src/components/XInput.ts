import React from "react";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XField} from "../serverApi/XEntityMetadata";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export interface XInputProps<T> extends XFormComponentProps<T> {
    field: string;
    inputStyle?: React.CSSProperties;
    inputClassName?: string;
}

// spolocna nadtrieda pre jednoduche inputy (nie asociacne)
export abstract class XInput<T, P extends XInputProps<T>> extends XFormComponent<T, P> {

    protected xField: XField;

    protected constructor(props: P) {
        super(props);

        this.xField = XUtilsMetadataCommon.getXFieldByPathStr(props.form.getEntity(), props.field);

        props.form.addField(props.field);
    }

    getField(): string {
        return this.props.field;
    }

    isNotNull(): boolean {
        return !this.xField.isNullable;
    }
}
