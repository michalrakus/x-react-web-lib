import React from "react";
import {XCalendar} from "./XCalendar";
import {XFormComponentProps} from "./XFormComponent";
import {XInput} from "./XInput";

export interface XInputDateProps extends XFormComponentProps<number> {
    field: string;
}

export class XInputDate extends XInput<Date, XInputDateProps> {

    constructor(props: XInputDateProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    getValue(): Date | null {
        let value: Date | null = null;
        const objectValue: string | Date | null = this.getValueFromObject();
        // tuto zatial hack, mal by prist Date
        if (typeof objectValue === 'string') {
            value = new Date(objectValue);
        }
        else if (typeof objectValue === 'object' && objectValue instanceof Date) {
            value = objectValue;
        }
        // value zostalo null ak nebol vykonany ziaden if
        return value;
    }

    onValueChange(value: Date | null) {
        // z XCalendar prichadza value - typ Date alebo null
        this.onValueChangeBase(value);
    }

    // nedame do onChange inputu, lebo by sa nas onChange volal po kazdej zmene pismenka
    // ak bude treba, mozme este dorobit metodu "onChange2", ktora sa bude volat po kazdej zmene pismenka (asi iba do XInputText)
    onBlur(e: any) {
        this.callOnChangeFromOnBlur();
    }

    render() {
        // note: style overrides size (width of the input according to character count)
        return (
            <div className="field grid">
                <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <XCalendar id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()}
                           datetime={this.xField.type === 'datetime'}/>
            </div>
        );
    }
}
