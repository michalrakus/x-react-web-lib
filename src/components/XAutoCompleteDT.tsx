import {XUtilsMetadata} from "./XUtilsMetadata";
import React from "react";
import {XFormComponentDT, XFormComponentDTProps} from "./XFormComponentDT";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {OperationType, XUtils} from "./XUtils";
import {XError} from "./XErrors";
import {XAutoCompleteBase} from "./XAutoCompleteBase";
import {XTableFieldFilterProp} from "./XFormDataTable2";

export interface XAutoCompleteDTProps extends XFormComponentDTProps {
    assocField: string;
    displayField: string | ((suggestion: any) => string);
    searchTable?: any; // do buducna
    assocForm?: any; // na insert/update
    filter?: XTableFieldFilterProp;
}

export class XAutoCompleteDT extends XFormComponentDT<XAutoCompleteDTProps> {

    protected xAssoc: XAssoc;
    protected errorInBase: string | undefined; // sem si odkladame info o nevalidnosti XAutoCompleteBase (nevalidnost treba kontrolovat na stlacenie Save)

    state: {
        suggestions: any[];
    };

    constructor(props: XAutoCompleteDTProps) {
        super(props);

        this.xAssoc = XUtilsMetadata.getXAssocToOne(XUtilsMetadata.getXEntity(props.entity), props.assocField);
        this.errorInBase = undefined;

        this.state = {
            suggestions: []
        };

        this.onChangeAutoCompleteBase = this.onChangeAutoCompleteBase.bind(this);
        this.onErrorChangeAutoCompleteBase = this.onErrorChangeAutoCompleteBase.bind(this);
    }

    componentDidMount() {
        this.readAndSetSuggestions();
    }

    async readAndSetSuggestions() {
        let suggestions: any[] = await XUtils.fetchRows(this.xAssoc.entityName, this.getFilterBase(this.props.filter), typeof this.props.displayField === 'string' ? this.props.displayField : undefined);
        // ak mame funkciu, zosortujeme tu
        if (typeof this.props.displayField === 'function') {
            suggestions = XUtils.arraySort(suggestions, this.props.displayField);
        }
        this.setState({suggestions: suggestions});
    }

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
            // TODO - fieldLabel
            return {field: this.getField(), xError: {onChange: this.errorInBase, fieldLabel: undefined}};
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
            <XAutoCompleteBase value={this.getValue()} suggestions={this.state.suggestions} onChange={this.onChangeAutoCompleteBase}
                               field={this.props.displayField} valueForm={this.props.assocForm} idField={xEntityAssoc.idField}
                               error={this.getError()} onErrorChange={this.onErrorChangeAutoCompleteBase}/>
        );
    }
}
