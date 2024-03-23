import React from "react";
import {XInput, XInputProps} from "./XInput";
import {XUtils} from "./XUtils";
import {XEditorBase} from "./XEditorBase";

export interface XEditorProps extends XInputProps<string> {
    labelOnTop: boolean;
}

export class XEditor extends XInput<string, XEditorProps> {

    public static defaultProps = {
        labelOnTop: false
    };

    constructor(props: XEditorProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): string | null {
        return this.getValueFromObject();
    }

    onValueChange(value: string | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    getLabelStyle(): React.CSSProperties {
        return this.props.labelOnTop ? (this.props.labelStyle ?? {}) : super.getLabelStyle();
    }

    render() {

        // TODO - neni to otestovane

        let style: React.CSSProperties = this.props.inputStyle ?? {};
        // defaultne pridame width:100%
        // ak nemame labelOnTop=true, musime odratat sirku labelu, inac sa label dostane nad input (koli flex-wrap: wrap)
        const widthValue: string = this.props.labelOnTop ? '100%' : `calc(100% - ${XUtils.FIELD_LABEL_WIDTH})`;
        XUtils.addCssPropIfNotExists(style, {width: widthValue});

        // x-editor-label-on-top - nastavuje orientation: column, aby boli label a XEditorBase pod sebou (robene podla XInputTextarea)
        // XEditorBase renderujeme az ked mame nacitany object, lebo inac sa nam nenastavi spravna velkost (hodnota nie je k dispozicii pri prvom renderingu) (robene podla XInputTextarea)
        return (
            <div className={!this.props.labelOnTop ? 'field grid' : 'field grid x-editor-label-on-top'}>
                <label htmlFor={this.props.field} className={!this.props.labelOnTop ? 'col-fixed' : undefined} style={this.getLabelStyle()}>{this.getLabel()}</label>
                {this.props.form.state.object ?
                    <XEditorBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()}
                                 style={style} error={this.getError()}/>
                    : null
                }
            </div>
        );
    }
}
