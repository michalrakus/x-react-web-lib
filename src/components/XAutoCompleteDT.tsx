import React from "react";
import {XFormComponentDT, XFormComponentDTProps} from "./XFormComponentDT";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {OperationType} from "./XUtils";
import {XError} from "./XErrors";
import {XAutoCompleteBase, XSuggestionsLoadProp} from "./XAutoCompleteBase";
import {XTableFieldFilterProp} from "./XFormDataTable2";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";
import {DataTableSortMeta} from "primereact/datatable";

export interface XAutoCompleteDTProps extends XFormComponentDTProps {
    assocField: string;
    displayField: string;
    searchBrowse?: JSX.Element;
    assocForm?: JSX.Element; // na insert/update
    suggestions?: any[]; // ak chceme overridnut suggestions ziskavane cez asociaciu
                        // poznamka: treba zabezpecit volanie setState, ak overridneme suggestions
                        // poznamka2: ak sa zmeni asociovany objekt cez "assocForm",
                        // tak treba nejako zabezpecit aby sa zmenili data aj v tychto overridnutych suggestions
                        // (pozri XAutoCompleteBase.formDialogOnSaveOrCancel)
    suggestionsLoad?: XSuggestionsLoadProp; // ak nemame suggestions, tak suggestionsLoad (resp. jeho default) urcuje ako sa nacitaju suggestions
    lazyLoadMaxRows?: number; // max pocet zaznamov ktore nacitavame pri suggestionsLoad = lazy
    splitQueryValue?: boolean;
    filter?: XTableFieldFilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // ak chceme pri citani suggestions nacitat aj asociovane objekty
}

export class XAutoCompleteDT extends XFormComponentDT<XAutoCompleteDTProps> {

    protected xAssoc: XAssoc;
    protected errorInBase: string | undefined; // sem si odkladame info o nevalidnosti XAutoCompleteBase (nevalidnost treba kontrolovat na stlacenie Save)

    constructor(props: XAutoCompleteDTProps) {
        super(props);

        this.xAssoc = XUtilsMetadataCommon.getXAssocToOne(XUtilsMetadataCommon.getXEntity(props.entity), props.assocField);
        this.errorInBase = undefined;

        this.onChangeAutoCompleteBase = this.onChangeAutoCompleteBase.bind(this);
        this.onErrorChangeAutoCompleteBase = this.onErrorChangeAutoCompleteBase.bind(this);
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
        const assocObject: any | null = this.getValueFromRowData();
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
            // TODO - fieldLabel
            return {field: this.getField(), xError: {onChange: this.errorInBase, fieldLabel: undefined}};
        }
        // zavolame povodnu metodu
        return super.validate();
    }

    render() {
        const xEntityAssoc = XUtilsMetadataCommon.getXEntity(this.xAssoc.entityName);
        //const xDisplayField = XUtilsMetadataCommon.getXFieldByPath(xEntityAssoc, this.props.displayField);

        // TODO - size
        //const size = this.props.size ?? xDisplayField.length;

        // div className="col" nam zabezpeci aby XAutoCompleteBase nezaberal celu dlzku grid-u (ma nastaveny width=100% vdaka "formgroup-inline")
        return (
            <XAutoCompleteBase value={this.getValue()} onChange={this.onChangeAutoCompleteBase}
                               field={this.props.displayField} searchBrowse={this.props.searchBrowse} valueForm={this.props.assocForm}
                               idField={xEntityAssoc.idField} readOnly={this.isReadOnly()}
                               error={this.getError()} onErrorChange={this.onErrorChangeAutoCompleteBase}
                               suggestions={this.props.suggestions} suggestionsLoad={this.props.suggestionsLoad} lazyLoadMaxRows={this.props.lazyLoadMaxRows} splitQueryValue={this.props.splitQueryValue}
                               suggestionsQuery={{entity: this.xAssoc.entityName, filter: () => this.getFilterBase(this.props.filter), sortField: this.props.sortField ?? this.props.displayField, fields: this.props.fields}}/>
        );
    }
}
