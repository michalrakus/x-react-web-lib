import React from "react";
import {XInputDT, XInputDTProps} from "./XInputDT";
import {XCalendar} from "./XCalendar";
import {dateFromModel} from "../serverApi/XUtilsConversions";

export interface XInputDateDTProps extends XInputDTProps {
}

export class XInputDateDT extends XInputDT<XInputDateDTProps> {

    constructor(props: XInputDateDTProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): Date | null {
        return dateFromModel(this.getValueFromRowData());
    }

    onValueChange(value: Date | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <XCalendar id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} error={this.getError()}
                       scale={this.xField.scale} datetime={this.xField.type === 'datetime'}/>
        );
    }
}
