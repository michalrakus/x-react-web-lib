import React, {Component} from "react";
import {XFormBase} from "./XFormBase";
import {XError} from "./XErrors";
import {XObject} from "./XObject";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {OperationType, XUtils} from "./XUtils";
import {XFieldChangeEvent} from "./XFieldChangeEvent";
import {XCustomFilter} from "../serverApi/FindParam";

// typ metody pre onChange - pouzil som XFieldChangeEvent<any>, pri deklarovani onChange metody na komponente
// sa da vdaka tomu pouzit (e: XFieldChangeEvent<Dobrovolnik>) a kompilator sa nestazuje. Je to hack, mozno existuje krajsie riesenie
export type FieldOnChange = (e: XFieldChangeEvent<any>) => void;

// typ metody pre getFilter - pouziva sa na assoc fieldoch (XAutoComplete, XDropdown, ...)
// pouzivame (zatial) parameter typu any aby sme na formulari vedeli pouzit konkretny typ (alebo XObject)
export type GetFilter = (object: any) => XCustomFilter | undefined;

export interface XFormComponentProps<T> {
    form: XFormBase;
    label?: string;
    readOnly?: boolean;
    labelStyle?: React.CSSProperties;
    inline?: boolean;
    onChange?: FieldOnChange;
}

export abstract class XFormComponent<T, P extends XFormComponentProps<T>> extends Component<P> {

    protected constructor(props: P) {
        super(props);

        props.form.addXFormComponent(this);
    }

    // nazov fieldu, pod ktorym sa hodnota uklada do objektu form.state.object
    // pri jednoduchych inputoch nazov fieldu (props.field), pri asociacnych inputoch nazov asociacie (props.assocField)
    // pouziva sa aj ako id-cko fieldu pre errorMap pri validacii (form.state.errorMap)
    // must be overridden
    abstract getField(): string;

    // ******** read and write from/into form.state.object ***********

    // reads value from form.state.object
    // can be overridden, but this should work for every component
    getValueFromObject(): any {
        let objectValue: any = null;
        const object: XObject | null = this.props.form.state.object;
        if (object !== null) {
            objectValue = XUtilsCommon.getValueByPath(object, this.getField());
            //  pre istotu dame na null, null je standard
            if (objectValue === undefined) {
                objectValue = null;
            }
        }
        return objectValue;
    }

    // writes value into form.state.object
    onValueChangeBase(value: any, onChange?: FieldOnChange, assocObjectChange?: OperationType) {
        const error: string | undefined = this.validateOnChange(value);
        this.props.form.onFieldChange(this.getField(), value, error, onChange, assocObjectChange);
    }

    // ******** properties (not only) for rendering ***********

    // must be overridden
    abstract isNotNull(): boolean;

    isReadOnly(): boolean {
        // tuto do buducna planujeme pridat aj dynamicky readOnly, bude ho treba ukladat do form.state podobne ako sa ukladaju errory do form.state.errorMap
        return XUtils.isReadOnly(this.getField(), this.props.readOnly);
    }

    getLabel(): string {
        let label = this.props.label ?? this.getField();
        // test na readOnly je tu hlavne koli tomu aby sme nemali * pri ID atribute, ktory sa pri inserte generuje az pri zapise do DB
        if (this.isNotNull() && !this.isReadOnly()) {
            label = XUtils.markNotNull(label);
        }
        return label;
    }

    getLabelStyle(): React.CSSProperties {
        let labelStyle: React.CSSProperties = this.props.labelStyle ?? {};
        const inline: boolean = this.props.inline ?? false;
        if (!inline) {
            XUtils.addCssPropIfNotExists(labelStyle, {width: XUtils.FIELD_LABEL_WIDTH});
        }
        else {
            XUtils.addCssPropIfNotExists(labelStyle, {width: 'auto'}); // podla dlzky labelu
            XUtils.addCssPropIfNotExists(labelStyle, {marginLeft: '1rem'});
        }
        return labelStyle;
    }

    // *********** validation support ************

    // volane po kliknuti na Save
    // vrati (field, XError) ak nezbehne "field validacia", ak zbehne, vrati undefined
    validate(): {field: string; xError: XError} | undefined {
        // TODO - FILOZOFICKA OTAZKA - volat validaciu aj ked je field readOnly (this.isReadOnly() === true)? zatial dame ze hej...
        const value: any = this.getValueFromObject();
        // not null validacia + custom field validacia volana na onChange
        let errorOnChange: string | undefined = this.validateOnChange(value);
        // custom field validacia volana na onBlur (focus lost)
        // TODO
        if (errorOnChange) {
            return {field: this.getField(), xError: {onChange: errorOnChange, fieldLabel: this.getLabel()}};
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
        // validacia by mala sediet s metodou getLabel(), kde sa pridava * , preto tu mame aj test !this.isReadOnly() - id fieldy pri inserte nechceme testovat
        // otazka je ci nevypinat validaciu pre readOnly fieldy vzdy (aj ked napr. readOnly vznikne dynamicky)
        if (this.isNotNull() && !this.isReadOnly() && value === null) {
            return "Field is required.";
        }
        return undefined;
    }

    // deprecated - nie je to pekne riesenie - do komponentu treba posielat error message (string) a nie props (asi ako v XAutoComplete)
    getClassNameTooltip(): {} {
        const error = this.getError();
        return error ? {
            className: "p-invalid",
            tooltip: error,
            tooltipOptions: {className: 'pink-tooltip', position: 'bottom'}
        } : {};
    }

    // vrati error message z form.state.errorMap
    getError(): string | undefined {
        const error: XError = this.props.form.state.errorMap[this.getField()];
        return error ? XUtils.getXErrorMessage(error) : undefined;
    }

    callOnChangeFromOnBlur() {
        if (this.props.onChange) {
            const object: XObject = this.props.form.getXObject();
            // developer v onChange nastavi atributy na object-e
            this.props.onChange({object: object});
            // rovno zavolame form.setState({...}), nech to nemusi robit developer
            this.props.form.setStateXForm();
        }
    }

    // len pre assoc fieldy sa pouziva
    getFilterBase(getFilter: GetFilter | undefined): XCustomFilter | undefined {
        let filter: XCustomFilter | undefined = undefined;
        if (getFilter) {
            //const object: XObject = this.props.form.getXObject();
            const object: XObject = this.props.form.state.object;
            if (object) {
                filter = getFilter(object);
            }
        }
        return filter;
    }
}