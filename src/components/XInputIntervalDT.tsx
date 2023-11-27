import React from "react";
import {XInputIntervalBase} from "./XInputIntervalBase";
import {IPostgresInterval} from "./XUtils";
import {XInputDT, XInputDTProps} from "./XInputDT";

export interface XInputIntervalDTProps extends XInputDTProps {
}

export class XInputIntervalDT extends XInputDT<XInputIntervalDTProps> {

    constructor(props: XInputIntervalDTProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): IPostgresInterval | null {
        return this.getValueFromRowData();
    }

    onValueChange(value: IPostgresInterval | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <XInputIntervalBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} error={this.getError()}/>
        );
    }
}
