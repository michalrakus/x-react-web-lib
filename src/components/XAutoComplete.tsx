import React from "react";
import {XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XObject} from "./XObject";
import {OperationType, XUtils} from "./XUtils";
import {XAutoCompleteBase} from "./XAutoCompleteBase";
import {XError} from "./XErrors";

export interface XAutoCompleteProps extends XFormComponentProps {
    assocField: string;
    displayField: string;
    searchTable?: any; // do buducna
    assocForm?: any; // na insert/update
    size?: number;
    inputStyle?: React.CSSProperties;
}

export class XAutoComplete extends XFormComponent<XAutoCompleteProps> {

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
        this.readAndSetSuggestions();
    }

    async readAndSetSuggestions() {
        const suggestions: any[] = await XUtils.fetchMany('findRows', {entity: this.xAssoc.entityName, sortMeta: {field: this.props.displayField, order: 1}});
        this.setState({suggestions: suggestions});
    }

    getFieldForEdit(): string | undefined {
        // TODO - zohladnit aj aktualny readOnly stav
        const readOnly = this.props.readOnly ?? false;
        if (!readOnly) {
            return this.props.assocField;
        }
        return undefined;
    }

    checkNotNull(): boolean {
        // TODO - zohladnit aj aktualny readOnly stav
        return !this.xAssoc.isNullable && !(this.props.readOnly ?? false);
    }

    getValueFromObject(): any {
        const object: XObject | null = this.props.form.state.object;
        let assocObject = object !== null ? object[this.props.assocField] : null;
        // ak je undefined, pre istotu dame na null, null je standard
        if (assocObject === undefined) {
            assocObject = null;
        }
        return assocObject;
    }

    onChangeAutoCompleteBase(object: any, objectChange: OperationType) {
        const error: string | undefined = this.validateOnChange(object);
        this.props.form.onFieldChange(this.props.assocField, object, error);

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
            const field = this.getFieldForEdit();
            if (field) {
                // error message dame na onChange, mohli by sme aj na onSet (predtym onBlur), je to jedno viac-menej
                return {field: field, xError: {onChange: this.errorInBase}};
            }
        }
        // zavolame povodnu metodu
        return super.validate();
    }

    render() {

        const xEntityAssoc = XUtilsMetadata.getXEntity(this.xAssoc.entityName);
        const xDisplayField = XUtilsMetadata.getXFieldByPath(xEntityAssoc, this.props.displayField);

        let label = this.props.label ?? this.props.assocField;
        if (this.checkNotNull()) {
            label = XUtils.markNotNull(label);
        }

        const readOnly = this.props.readOnly ?? false;

        const size = this.props.size ?? xDisplayField.length;

        const labelStyle = this.props.labelStyle ?? {width: XUtils.FIELD_LABEL_WIDTH};

        // div className="col" nam zabezpeci aby XAutoCompleteBase nezaberal celu dlzku grid-u (ma nastaveny width=100% vdaka "formgroup-inline")
        return (
            <div className="field grid">
                <label htmlFor={this.props.assocField} className="col-fixed" style={labelStyle}>{label}</label>
                <XAutoCompleteBase value={this.getValueFromObject()} suggestions={this.state.suggestions} onChange={this.onChangeAutoCompleteBase}
                                   field={this.props.displayField} valueForm={this.props.assocForm} idField={xEntityAssoc.idField}
                                   error={this.getError()} onErrorChange={this.onErrorChangeAutoCompleteBase}/>
            </div>
        );
    }
}