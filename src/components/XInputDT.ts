import {XField} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XFormComponentDT, XFormComponentDTProps} from "./XFormComponentDT";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";
import React from "react";

export interface XInputDTProps extends XFormComponentDTProps {
    field: string;
    inputStyle?: React.CSSProperties; // pridane koli label/desc funkcionalite ale mozno sa zide aj pri DT sposobe (pouziva sa v subclasses, napr. XInputTextareaRow)
}

// spolocna nadtrieda pre jednoduche inputy (nie asociacne)
export abstract class XInputDT<P extends XInputDTProps> extends XFormComponentDT<P> {

    protected xField: XField;

    protected constructor(props: P) {
        super(props);

        this.xField = XUtilsMetadataCommon.getXFieldByPathStr(props.entity, props.field);
    }

    getField(): string {
        return this.props.field;
    }

    isNotNull(): boolean {
        return !this.xField.isNullable;
    }
}
