import React from "react";
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

    getTooltipsAndLabelElemId(
        field: string, label: string | undefined, value: string | null, labelTooltip: string | undefined, inputTooltip: string | undefined, desc: string | undefined
        ): {labelTooltip: string | undefined; labelElemId: string | undefined; inputTooltip: string | undefined} {

        if (value !== null) {
            // nevidno placeholder, skusime ho umiestnit do tooltip-u
            if (label !== undefined && labelTooltip === undefined) {
                labelTooltip = desc;
            }
            else {
                // nemame label alebo labelTooltip je obsadeny -> dame pripadny desc ako tooltip na input
                if (inputTooltip === undefined) {
                    inputTooltip = desc;
                }
            }
        }

        let labelElemId: string | undefined = undefined;
        if (labelTooltip) {
            labelElemId = `${field}_label_id`.replaceAll(".", "_"); // dots must be replaced, otherwise the selector does not work
        }
        return {labelTooltip, labelElemId, inputTooltip};
    }
}
