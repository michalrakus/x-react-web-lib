import React from "react";
import {XFilterProp, XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {OperationType, XUtils} from "./XUtils";
import {XAutoCompleteBase} from "./XAutoCompleteBase";
import {XError} from "./XErrors";
import {XObject} from "./XObject";

export interface XAutoCompleteProps extends XFormComponentProps<XObject> {
    assocField: string;
    displayField: string;
    searchBrowse?: JSX.Element;
    assocForm?: JSX.Element; // na insert/update
    filter?: XFilterProp;
    suggestions?: any[]; // ak chceme overridnut suggestions ziskavane cez asociaciu (pozri poznamky v XAutoCompleteDT)
    size?: number;
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

        this.xAssoc = XUtilsMetadata.getXAssocToOne(XUtilsMetadata.getXEntity(props.form.getEntity()), props.assocField);
        this.errorInBase = undefined;

        this.state = {
            suggestions: []
        };

        this.onChangeAutoCompleteBase = this.onChangeAutoCompleteBase.bind(this);
        this.onErrorChangeAutoCompleteBase = this.onErrorChangeAutoCompleteBase.bind(this);

        props.form.addField(props.assocField + '.' + props.displayField);
    }

    componentDidMount() {
        //console.log("volany XAutoComplete.componentDidMount()");
        this.readAndSetSuggestions();
    }

    async readAndSetSuggestions() {
        if (this.props.suggestions === undefined) {
            let suggestions: any[] = await XUtils.fetchRows(this.xAssoc.entityName, this.getFilterBase(this.props.filter), this.props.displayField);
            this.setState({suggestions: suggestions});
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

        const xEntityAssoc = XUtilsMetadata.getXEntity(this.xAssoc.entityName);
        //const xDisplayField = XUtilsMetadata.getXFieldByPath(xEntityAssoc, this.props.displayField);

        // TODO - readOnly

        // TODO - size
        //const size = this.props.size ?? xDisplayField.length;

        // div className="col" nam zabezpeci aby XAutoCompleteBase nezaberal celu dlzku grid-u (ma nastaveny width=100% vdaka "formgroup-inline")
        return (
            <div className="field grid">
                <label htmlFor={this.props.assocField} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <XAutoCompleteBase value={this.getValue()} suggestions={this.props.suggestions ?? this.state.suggestions} onChange={this.onChangeAutoCompleteBase}
                                   field={this.props.displayField} searchBrowse={this.props.searchBrowse} valueForm={this.props.assocForm} idField={xEntityAssoc.idField}
                                   error={this.getError()} onErrorChange={this.onErrorChangeAutoCompleteBase}
                                   customFilterFunction={() => this.getFilterBase(this.props.filter)}/>
            </div>
        );
    }
}