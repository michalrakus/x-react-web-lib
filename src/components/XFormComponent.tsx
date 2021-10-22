import React, {Component} from "react";
import {XFormBase} from "./XFormBase";
import {XError} from "./XErrors";

export interface XFormComponentProps {
    form: XFormBase;
    label?: string;
    readOnly?: boolean;
    labelStyle?: React.CSSProperties;
    inline?: boolean;
}

export class XFormComponent<P extends XFormComponentProps> extends Component<P> {

    constructor(props: P) {
        super(props);

        props.form.addXFormComponent(this);
    }

    // pomocna metodka, sluzi napr. na validaciu not null atributov
    // should be overriden
    getFieldForEdit(): string | undefined {
        return undefined;
    }

    // volane po kliknuti na Save
    // vrati error message ak nezbehne "field validacia", ak zbehne, vrati undefined
    validate(): {field: string; xError: XError} | undefined {
        const value: any = this.getValueFromObject();
        // not null validacia + custom field validacia volana na onChange
        let errorOnChange: string | undefined = this.validateOnChange(value);
        // custom field validacia volana na onBlur (focus lost)
        // TODO
        if (errorOnChange) {
            const field = this.getFieldForEdit();
            if (field) {
                return {field: field, xError: {onChange: errorOnChange}};
            }
        }
        return undefined;
    }

    validateOnChange(value: any): string | undefined {
        let error: string | undefined = this.validateNotNull(value);
        if (error) {
            return error;
        }
        // custom field validacia volana na onChange
        // TODO
        return undefined;
    }

    validateNotNull(value: any): string | undefined {
        if (this.checkNotNull() && value === null) {
            return "Field is required.";
        }
        return undefined;
    }

    // should be overriden
    checkNotNull(): boolean {
        return false;
    }

    // should be overriden
    getValueFromObject(): any {
        return null;
    }

    // vrati error message z form.state.errorMap
    getError(): string | undefined {
        const field = this.getFieldForEdit();
        if (field) {
            const error: XError = this.props.form.state.errorMap[field];
            if (error) {
                if (error.onChange || error.onBlur || error.form) {
                    let message: string = '';
                    if (error.onChange) {
                        message += error.onChange;
                    }
                    if (error.onBlur) {
                        if (message !== '') {
                            message += ' ';
                        }
                        message += error.onBlur;
                    }
                    if (error.form) {
                        if (message !== '') {
                            message += ' ';
                        }
                        message += error.form;
                    }
                    return message;
                }
            }
        }
        return undefined;
    }

    // deprecated - nie je to pekne riesenie - do komponentu treba posielat error message (string) a nie props
    getClassNameTooltip(): {} {
        const error = this.getError();
        return error ? {
            className: "p-invalid",
            tooltip: error,
            tooltipOptions: {className: 'pink-tooltip', position: 'bottom'}
        } : {};
    }
}