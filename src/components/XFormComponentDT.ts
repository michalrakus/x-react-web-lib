import {XFormBase} from "./XFormBase";
import React, {Component} from "react";
import {XObject} from "./XObject";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {OperationType, XUtils} from "./XUtils";
import {XError} from "./XErrors";
import {XCustomFilter} from "../serverApi/FindParam";
import {XTableFieldFilterProp, XTableFieldOnChange, XTableFieldReadOnlyProp} from "./XFormDataTable2";

export interface XFormComponentDTProps {
    form: XFormBase;
    entity: string;
    rowData: any;
    readOnly?: XTableFieldReadOnlyProp;
    onChange?: XTableFieldOnChange;
    placeholder?: string; // poznamka: placeholder moze byt nastavovany aj cez property desc (ak pouzivame napr. XFormPanelList)

    // props pouzivane ak vytvarame component s label-om (nie sme v XFormDataTable, ale pouzivame napr. XFormPanelList)
    label?: string;
    tooltip?: string;
    desc?: string; // specialny prop pouzivany ako placeholder a tooltip pre label naraz (aby sme nemuseli duplikovat placeholder a tooltip pre label) - vytvoreny pre depaul
    labelStyle?: React.CSSProperties;
}

export abstract class XFormComponentDT<P extends XFormComponentDTProps> extends Component<P> {

    private valueChanged: boolean; // priznak, ci uzivatel zmenil hodnotu v inpute (pozri poznamku v XFormComponent)

    protected constructor(props: P) {
        super(props);

        this.valueChanged = false;

        XFormBase.getXRowTechData(props.rowData).xFormComponentDTList.push(this);
    }

    // nazov fieldu, pod ktorym sa hodnota uklada do objektu this.props.rowData
    // pri jednoduchych inputoch nazov fieldu (props.field), pri asociacnych inputoch nazov asociacie (props.assocField)
    // pouziva sa aj ako id-cko fieldu pre errorMap pri validacii (form.state.errorMap) - TODO - doriesit
    // must be overridden
    abstract getField(): string;

    // ******** read and write from/into this.props.rowData ***********

    // reads value from this.props.rowData
    // can be overridden, but this should work for every component
    getValueFromRowData(): any {
        let rowDataValue: any = null;
        // test na undefined je tu koli insertu noveho riadku
        if (this.props.rowData !== undefined && this.props.rowData !== null) {
            rowDataValue = XUtilsCommon.getValueByPath(this.props.rowData, this.getField());
            //  pre istotu dame na null, null je standard
            if (rowDataValue === undefined) {
                rowDataValue = null;
            }
        }
        return rowDataValue;
    }

    // writes value into form.state.object
    onValueChangeBase(value: any, onChange?: XTableFieldOnChange, assocObjectChange?: OperationType) {
        const error: string | undefined = this.validateOnChange(value);
        this.props.form.onTableFieldChange(this.props.rowData, this.getField(), value, error, onChange, assocObjectChange);
        this.valueChanged = true;
    }

    // ******** properties (not only) for rendering ***********

    // must be overridden
    abstract isNotNull(): boolean;

    isReadOnly(): boolean {

        let readOnly: boolean;
        if (!XUtilsCommon.isSingleField(this.getField())) {
            // if the length of field is 2 or more, then readOnly
            readOnly = true;
        }
        // formReadOnlyBase is called on the level XFormDataTable2 and XFormPanelList
        // the reason is (probably) that in XFormDataTable2 and XFormPanelList we know the assoc name whereas here in component we know only field name
        // (assoc name is param of formReadOnlyBase)
        // else if (this.props.form.formReadOnlyBase("xxx")) {
        //     readOnly = true;
        // }
        else if (typeof this.props.readOnly === 'boolean') {
            readOnly = this.props.readOnly;
        }
        else if (typeof this.props.readOnly === 'function') {
            // TODO - tazko povedat ci niekedy bude object === null (asi ano vid metodu getFilterBase)
            const object: XObject = this.props.form.state.object;
            if (object) {
                readOnly = this.props.readOnly(this.props.form.getXObject(), this.props.rowData);
            }
            else {
                readOnly = true;
            }
        }
        else {
            // readOnly is undefined
            readOnly = false;
        }

        return readOnly;
    }

    // *********** label support - len pre ne-DT componenty pouzivany ************

    // ak je label undefined, label element sa nevykresli
    getLabel(): string | undefined {
        let label: string | undefined = this.props.label;
        if (label !== undefined) {
            // test na readOnly je tu hlavne koli tomu aby sme nemali * pri ID atribute, ktory sa pri inserte generuje az pri zapise do DB
            if (this.isNotNull() && !this.isReadOnly()) {
                label = XUtils.markNotNull(label);
            }
        }
        return label;
    }

    getLabelStyle(): React.CSSProperties {
        let labelStyle: React.CSSProperties = this.props.labelStyle ?? {};
        // this.props.inline nepouzivame, lebo je to asi zombie
        XUtils.addCssPropIfNotExists(labelStyle, {width: XUtils.FIELD_LABEL_WIDTH});
        return labelStyle;
    }

    // *********** validation support ************

    // volane po kliknuti na Save
    // vrati (field, XError) ak nezbehne "field validacia", ak zbehne, vrati undefined
    validate(): { field: string; xError: XError } | undefined {
        // TODO - FILOZOFICKA OTAZKA - volat validaciu aj ked je field readOnly (this.isReadOnly() === true)? zatial dame ze hej...
        const value: any = this.getValueFromRowData();
        // not null validacia + custom field validacia volana na onChange
        let errorOnChange: string | undefined = this.validateOnChange(value);
        // custom field validacia volana na onBlur (focus lost)
        // TODO - fieldLabel
        if (errorOnChange) {
            return {field: this.getField(), xError: {onChange: errorOnChange, fieldLabel: undefined}};
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

    // vrati error message z rowData.errorMap
    getError(): string | undefined {
        const error: XError = XFormBase.getXRowTechData(this.props.rowData).errorMap[this.getField()];
        return error ? XUtils.getErrorMessage(error) : undefined;
    }

    callOnChangeFromOnBlur() {
        if (this.valueChanged && this.props.onChange) {
            const object: XObject = this.props.form.getXObject();
            // developer v onChange nastavi atributy na object-e
            this.props.onChange({object: object, tableRow: this.props.rowData, assocObjectChange: undefined});
            // rovno zavolame form.setState({...}), nech to nemusi robit developer
            this.props.form.setStateXForm();
            this.valueChanged = false; // resetneme na false (dalsi onChange volame az ked user zmeni hodnotu)
        }
    }

    // len pre assoc fieldy sa pouziva, aj to nie pre vsetky
    getFilterBase(filter: XTableFieldFilterProp | undefined): XCustomFilter | undefined {
        let customFilter: XCustomFilter | undefined = undefined;
        if (typeof filter === 'object') {
            customFilter = filter;
        }
        if (typeof filter === 'function') {
            //const object: XObject = this.props.form.getXObject();
            const object: XObject = this.props.form.state.object;
            // zatial zakomentujeme, aby sa zavolal aj pre XAutoComplete (tam zatial nemame k dispozicii object
            // (componentDidMount pre XAutoComplete sa vola skor ako componentDidMount pre XFormBase))
            //if (object) {
            customFilter = filter(object, this.props.rowData);
            //}
        }
        return customFilter;
    }
}