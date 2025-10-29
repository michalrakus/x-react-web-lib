import React from "react";
import {XInput, XInputProps} from "./XInput";
import {XUtils} from "./XUtils";
import {XInputTextareaBase} from "./XInputTextareaBase";
import {Tooltip} from "primereact/tooltip";

export interface XInputTextareaProps extends XInputProps<string> {
    rows?: number;
    cols?: number | "full"; // full - maximalna sirka (width:100%)
    labelOnTop?: boolean;
    autoResize?: boolean;
    fieldStyle?: React.CSSProperties; // zatial sem, mozno v buducnosti posunieme do superclass
}

export class XInputTextarea extends XInput<string, XInputTextareaProps> {

    public static defaultProps = {
        cols: "full"
    };

    xInputTextareaBaseRef: any;
    labelOnTop: boolean;

    constructor(props: XInputTextareaProps) {
        super(props);

        this.xInputTextareaBaseRef = React.createRef();

        if (props.labelOnTop !== undefined) {
            this.labelOnTop = props.labelOnTop;
        }
        else {
            this.labelOnTop = XUtils.isMobile();
        }

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): string | null {
        return this.getValueFromObject();
    }

    onValueChange(value: string | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    getLabelStyle(): React.CSSProperties {
        return this.labelOnTop ? (this.props.labelStyle ?? {}) : super.getLabelStyle();
    }

    // api method - can be called through "ref" from parent if needed to adjust the height of the input textarea according to the (changed) content
    autoResize() {
        if (this.xInputTextareaBaseRef.current) {
            this.xInputTextareaBaseRef.current.autoResize();
        }
    }

    render() {

        let fieldStyle: React.CSSProperties | undefined = this.props.fieldStyle;
        const labelStyle: React.CSSProperties = this.getLabelStyle();
        let inputStyle: React.CSSProperties = this.props.inputStyle ?? {};
        let cols: number | undefined;
        if (this.props.cols === "full") {
            cols = undefined;
            // pridame width:100%
            //fieldStyle = {width: '100%'};
            let widthValue: string;
            if (this.labelOnTop) {
                widthValue = '100%';
            }
            else {
                // ak nemame labelOnTop=true, musime odratat sirku labelu, inac sa label dostane nad input (koli flex-wrap: wrap)
                const labelStyleWidth: string | number | undefined = labelStyle.width;
                if (labelStyleWidth) {
                    widthValue = `calc(100% - ${labelStyleWidth})`;
                }
                else {
                    widthValue = '100%';
                }
            }
            XUtils.addCssPropIfNotExists(inputStyle, {width: widthValue});
        }
        else {
            // TODO - nastavenie cols nefunguje ak labelOnTop=true - vtedy je input roztiahnuty na 100%
            // roztiahnutie na 100% sposobuje .x-inputtextarea-label-on-top {flex-direction: column;}
            // aj tak sa asi vzdy bude pouzivat "full"
            cols = this.props.cols;
        }

        const label: string | undefined = this.getLabel();
        const value: string | null = this.getValue();

        const {labelTooltip, labelElemId, inputTooltip} = this.getTooltipsAndLabelElemId(
            this.props.field, label, value, this.props.labelTooltip, this.props.tooltip, this.props.desc);

        // InputTextarea renderujeme az ked mame nacitany object, lebo inac pri autoResize sa nam nenastavi spravna velkost (hodnota nie je k dispozicii pri prvom renderingu)
        return (
            <div className={!this.labelOnTop ? 'field grid' : 'field grid x-inputtextarea-label-on-top'} style={fieldStyle}>
                {label !== undefined ? <label id={labelElemId} htmlFor={this.props.field} className={!this.labelOnTop ? 'col-fixed' : undefined} style={labelStyle}>{label}</label> : null}
                {labelTooltip ? <Tooltip target={`#${labelElemId}`} content={labelTooltip}/> : null}
                {this.props.form.state.object ?
                    <XInputTextareaBase ref={this.xInputTextareaBaseRef} id={this.props.field} value={value} onChange={this.onValueChange} readOnly={this.isReadOnly()}
                               maxLength={this.xField.length} style={inputStyle} className={this.props.inputClassName} rows={this.props.rows} cols={cols}
                               autoResize={this.props.autoResize} error={this.getError()} tooltip={inputTooltip} placeholder={this.props.placeholder ?? this.props.desc}/>
                    : null
                }
            </div>
        );
    }
}
