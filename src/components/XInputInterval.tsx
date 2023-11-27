import React from "react";
import {XFormComponentProps} from "./XFormComponent";
import {XInput} from "./XInput";
import {IPostgresInterval} from "./XUtils";
import {XInputIntervalBase} from "./XInputIntervalBase";

export interface XInputIntervalProps extends XFormComponentProps<number> {
    field: string;
    inputStyle?: React.CSSProperties;
}

export class XInputInterval extends XInput<number, XInputIntervalProps> {

    constructor(props: XInputIntervalProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): IPostgresInterval | null {
        return this.getValueFromObject();
    }

    onValueChange(value: IPostgresInterval | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <div className="field grid">
                <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <XInputIntervalBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange}
                                    readOnly={this.isReadOnly()} error={this.getError()} style={this.props.inputStyle} {...this.getClassNameTooltip()}/>
            </div>
        );
    }
}
