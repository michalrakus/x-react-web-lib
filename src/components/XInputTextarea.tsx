import React from "react";
import {XInput, XInputProps} from "./XInput";
import {XUtils} from "./XUtils";
import {XInputTextareaBase} from "./XInputTextareaBase";

export interface XInputTextareaProps extends XInputProps<string> {
    rows?: number;
    cols?: number | "full"; // full - maximalna sirka (width:100%)
    labelOnTop?: boolean;
    autoResize?: boolean;
}

export class XInputTextarea extends XInput<string, XInputTextareaProps> {

    public static defaultProps = {
        cols: "full",
        labelOnTop: false
    };

    constructor(props: XInputTextareaProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): string | null {
        return this.getValueFromObject();
    }

    onValueChange(value: string | null) {
        this.onValueChangeBase(value);
    }

    getLabelStyle(): React.CSSProperties {
        return this.props.labelOnTop ? (this.props.labelStyle ?? {}) : super.getLabelStyle();
    }

    render() {

        let inputStyle: React.CSSProperties = this.props.inputStyle ?? {};
        let cols: number | undefined;
        if (this.props.cols === "full") {
            cols = undefined;
            // pridame width:100%
            // ak nemame labelOnTop=true, musime odratat sirku labelu, inac sa label dostane nad input (koli flex-wrap: wrap)
            const widthValue: string = this.props.labelOnTop ? '100%' : `calc(100% - ${XUtils.FIELD_LABEL_WIDTH})`;
            XUtils.addCssPropIfNotExists(inputStyle, {width: widthValue});
        }
        else {
            // TODO - nastavenie cols nefunguje ak labelOnTop=true - vtedy je input roztiahnuty na 100%
            // roztiahnutie na 100% sposobuje .x-inputtextarea-label-on-top {flex-direction: column;}
            // aj tak sa asi vzdy bude pouzivat "full"
            cols = this.props.cols;
        }

        // InputTextarea renderujeme az ked mame nacitany object, lebo inac pri autoResize sa nam nenastavi spravna velkost (hodnota nie je k dispozicii pri prvom renderingu)
        return (
            <div className={!this.props.labelOnTop ? 'field grid' : 'field grid x-inputtextarea-label-on-top'}>
                <label htmlFor={this.props.field} className={!this.props.labelOnTop ? 'col-fixed' : undefined} style={this.getLabelStyle()}>{this.getLabel()}</label>
                {this.props.form.state.object ?
                    <XInputTextareaBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()}
                               maxLength={this.xField.length} style={inputStyle} rows={this.props.rows} cols={cols}
                               autoResize={this.props.autoResize} error={this.getError()}/>
                    : null
                }
            </div>
        );
    }
}
