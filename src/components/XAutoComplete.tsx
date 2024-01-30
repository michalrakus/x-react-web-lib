import React from "react";
import {XFilterProp, XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {OperationType, XUtils} from "./XUtils";
import {XAutoCompleteBase} from "./XAutoCompleteBase";
import {XError} from "./XErrors";
import {XObject} from "./XObject";
import {DataTableSortMeta} from "primereact/datatable";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export interface XAutoCompleteProps extends XFormComponentProps<XObject> {
    assocField: string;
    displayField: string;
    searchBrowse?: JSX.Element;
    assocForm?: JSX.Element; // na insert/update
    filter?: XFilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // ak chceme pri citani suggestions nacitat aj asociovane objekty
    suggestions?: any[]; // ak chceme overridnut suggestions ziskavane cez asociaciu (pozri poznamky v XAutoCompleteDT)
    lazy?: boolean;
    width?: string;
    inputStyle?: React.CSSProperties;
}

export class XAutoComplete extends XFormComponent<XObject, XAutoCompleteProps> {

    protected xAssoc: XAssoc;
    protected errorInBase: string | undefined; // sem si odkladame info o nevalidnosti XAutoCompleteBase (nevalidnost treba kontrolovat na stlacenie Save)

    state: {
        suggestions: any[];
    };

    constructor(props: XAutoCompleteProps) {
        super(props);

        this.xAssoc = XUtilsMetadataCommon.getXAssocToOne(XUtilsMetadataCommon.getXEntity(props.form.getEntity()), props.assocField);
        this.errorInBase = undefined;

        this.state = {
            suggestions: []
        };

        this.onChangeAutoCompleteBase = this.onChangeAutoCompleteBase.bind(this);
        this.onErrorChangeAutoCompleteBase = this.onErrorChangeAutoCompleteBase.bind(this);
        this.onSearchStart = this.onSearchStart.bind(this);

        props.form.addField(props.assocField + '.' + props.displayField);
    }

    componentDidMount() {
        //console.log("volany XAutoComplete.componentDidMount()");
        if (!this.props.lazy) {
            this.readAndSetSuggestions();
        }
    }

    async readAndSetSuggestions(setStateCallback?: () => void) {
        if (this.props.suggestions === undefined) {
            let suggestions: any[] = await XUtils.fetchRows(this.xAssoc.entityName, this.getFilterBase(this.props.filter), this.props.sortField ?? this.props.displayField, this.props.fields);
            this.setState({suggestions: suggestions}, setStateCallback);
        }
    }

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

        if (objectChange !== OperationType.None) {
            // zmenil sa zaznam dobrovolnika v DB
            // zatial len refreshneme z DB
            // ak by bol reqest pomaly, mozme pri inserte (nove id) / update (existujuce id) upravit zoznam a usetrime tym request do DB
            // ak bol delete (dobrovolnik === null), treba urobit refresh do DB (alebo si poslat id-cko zmazaneho zaznamu)
            this.readAndSetSuggestions();
        }
    }

    onErrorChangeAutoCompleteBase(error: string | undefined) {
        this.errorInBase = error; // odlozime si error
    }

    onSearchStart(finishSearchStart?: () => void) {
        this.readAndSetSuggestions(finishSearchStart);
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
                <XAutoCompleteBase value={this.getValue()} suggestions={this.props.suggestions ?? this.state.suggestions} onChange={this.onChangeAutoCompleteBase}
                                   field={this.props.displayField} searchBrowse={this.props.searchBrowse} valueForm={this.props.assocForm} idField={xEntityAssoc.idField}
                                   readOnly={this.isReadOnly()} error={this.getError()} onErrorChange={this.onErrorChangeAutoCompleteBase} width={this.props.width}
                                   customFilterFunction={() => this.getFilterBase(this.props.filter)}
                                   onSearchStart={this.props.lazy ? this.onSearchStart : undefined}/>
            </div>
        );
    }
}