import React from "react";
import {XInputDT, XInputDTProps} from "./XInputDT";
import {XCheckboxBase} from "./XCheckboxBase";

export interface XCheckboxDTProps extends XInputDTProps {
}

export class XCheckboxDT extends XInputDT<XCheckboxDTProps> {

    constructor(props: XCheckboxDTProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): boolean | null {
        return this.getValueFromRowData();
    }

    onValueChange(value: boolean | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <XCheckboxBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange}
                           readOnly={this.isReadOnly()} isNotNull={this.isNotNull()}
                           error={this.getError()} style={this.props.inputStyle}/>
        );
    }
}
