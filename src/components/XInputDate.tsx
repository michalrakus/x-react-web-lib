import React from "react";
import {XCalendar} from "./XCalendar";
import {XFormComponentProps} from "./XFormComponent";
import {XInput} from "./XInput";
import {dateFromModel, XDateScale} from "../serverApi/XUtilsConversions";

export interface XInputDateProps extends XFormComponentProps<number> {
    field: string;
    scale?: XDateScale;
}

export class XInputDate extends XInput<Date, XInputDateProps> {

    constructor(props: XInputDateProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): Date | null {
        const value: Date | null = dateFromModel(this.getValueFromObject());
        return value;
    }

    onValueChange(value: Date | null) {
        // z XCalendar prichadza value - typ Date alebo null
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <div className="field grid">
                <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <XCalendar id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()} error={this.getError()}
                           scale={this.props.scale ?? this.xField.scale} datetime={this.xField.type === 'datetime'}/>
            </div>
        );
    }
}
