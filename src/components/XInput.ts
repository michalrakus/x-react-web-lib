import React from "react";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XField} from "../serverApi/XEntityMetadata";

export interface XInputProps extends XFormComponentProps {
    field: string;
    inputStyle?: React.CSSProperties;
}

// spolocna nadtrieda pre jednoduche inputy (nie asociacne)
export abstract class XInput<P extends XInputProps> extends XFormComponent<P> {

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
