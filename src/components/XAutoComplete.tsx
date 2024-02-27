import React from "react";
import {XFilterProp, XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {OperationType} from "./XUtils";
import {XAutoCompleteBase, XSuggestionsLoadProp} from "./XAutoCompleteBase";
import {XError} from "./XErrors";
import {XObject} from "./XObject";
import {DataTableSortMeta} from "primereact/datatable";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export interface XAutoCompleteProps extends XFormComponentProps<XObject> {
    assocField: string;
    displayField: string;
    searchBrowse?: JSX.Element;
    assocForm?: JSX.Element; // na insert/update
    suggestions?: any[]; // ak chceme overridnut suggestions ziskavane cez asociaciu (pozri poznamky v XAutoCompleteDT) (suggestionsLoad sa nepouziva)
    suggestionsLoad?: XSuggestionsLoadProp; // ak nemame suggestions, tak suggestionsLoad (resp. jeho default) urcuje ako sa nacitaju suggestions
    lazyLoadMaxRows?: number; // max pocet zaznamov ktore nacitavame pri suggestionsLoad = lazy
    splitQueryValue?: boolean;
    filter?: XFilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // ak chceme pri citani suggestions nacitat aj asociovane objekty
    width?: string;
    inputStyle?: React.CSSProperties;
}

export class XAutoComplete extends XFormComponent<XObject, XAutoCompleteProps> {

    protected xAssoc: XAssoc;
    protected errorInBase: string | undefined; // sem si odkladame info o nevalidnosti XAutoCompleteBase (nevalidnost treba kontrolovat na stlacenie Save)

    constructor(props: XAutoCompleteProps) {
        super(props);

        this.xAssoc = XUtilsMetadataCommon.getXAssocToOne(XUtilsMetadataCommon.getXEntity(props.form.getEntity()), props.assocField);
        this.errorInBase = undefined;

        this.onChangeAutoCompleteBase = this.onChangeAutoCompleteBase.bind(this);
        this.onErrorChangeAutoCompleteBase = this.onErrorChangeAutoCompleteBase.bind(this);

        props.form.addField(props.assocField + '.' + props.displayField);
    }

    // componentDidMount() {
    // }

    getField(): string {
        return this.props.assocField;
    }

    isNotNull(): boolean {
        return !this.xAssoc.isNullable;
    }

    getValue(): any | null {
        const assocObject: any | null = this.getValueFromObject();
        return assocObject;
    }

    onChangeAutoCompleteBase(object: any, objectChange: OperationType) {
        this.onValueChangeBase(object, this.props.onChange, objectChange);
    }

    onErrorChangeAutoCompleteBase(error: string | undefined) {
        this.errorInBase = error; // odlozime si error
    }

    // overrides method in XFormComponent
    validate(): {field: string; xError: XError} | undefined {
        if (this.errorInBase) {
            // error message dame na onChange, mohli by sme aj na onSet (predtym onBlur), je to jedno viac-menej
            return {field: this.getField(), xError: {onChange: this.errorInBase, fieldLabel: this.getLabel()}};
        }
        // zavolame povodnu metodu
        return super.validate();
    }

    render() {

        const xEntityAssoc = XUtilsMetadataCommon.getXEntity(this.xAssoc.entityName);

        // div className="col" nam zabezpeci aby XAutoCompleteBase nezaberal celu dlzku grid-u (ma nastaveny width=100% vdaka "formgroup-inline")
        return (
            <div className="field grid">
                <label htmlFor={this.props.assocField} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <XAutoCompleteBase value={this.getValue()} onChange={this.onChangeAutoCompleteBase}
                                   field={this.props.displayField} searchBrowse={this.props.searchBrowse} valueForm={this.props.assocForm} idField={xEntityAssoc.idField}
                                   readOnly={this.isReadOnly()} error={this.getError()} onErrorChange={this.onErrorChangeAutoCompleteBase} width={this.props.width}
                                   suggestions={this.props.suggestions} suggestionsLoad={this.props.suggestionsLoad} lazyLoadMaxRows={this.props.lazyLoadMaxRows} splitQueryValue={this.props.splitQueryValue}
                                   suggestionsQuery={{entity: this.xAssoc.entityName, filter: () => this.getFilterBase(this.props.filter), sortField: this.props.sortField ?? this.props.displayField, fields: this.props.fields}}/>
            </div>
        );
    }
}