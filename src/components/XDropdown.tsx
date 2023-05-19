import React from "react";
import {Dropdown} from "primereact/dropdown";
import {XUtils} from "./XUtils";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {XObject} from "./XObject";

export interface XDropdownProps extends XFormComponentProps<XObject> {
    assocField: string;
    displayField: string;
}

export class XDropdown extends XFormComponent<XObject, XDropdownProps> {

    protected xAssoc: XAssoc;

    state: {
        options: any[];
    };

    constructor(props: XDropdownProps) {
        super(props);

        this.xAssoc = XUtilsMetadata.getXAssocToOne(XUtilsMetadata.getXEntity(props.form.getEntity()), props.assocField);

        this.state = {
            options: []
        };

        props.form.addField(props.assocField + '.' + props.displayField);

        this.onValueChange = this.onValueChange.bind(this);
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

    onValueChange(e: any) {
        let newValueOrNull: any;
        // specialna null polozka nema ziadne atributy
        if (Object.keys(e.target.value).length === 0) {
            newValueOrNull = null;
        } else {
            newValueOrNull = e.target.value;
        }
        this.onValueChangeBase(newValueOrNull, this.props.onChange);
    }

    componentDidMount() {
        this.findOptions(this.props.form.getEntity(), this.props.assocField);
    }

    private async findOptions(entity: string, assocField: string) {
        // TODO - mozno je lepsie uz na klientovi zistit entitu za asociaciou - zatial takto (findRowsForAssoc)
        const options: any[] = await XUtils.fetchMany('findRowsForAssoc', {entity: entity, assocField: assocField});
        options.splice(0, 0, {}); // null polozka (nepridavat pre not null atributy)
        this.setState({options: options});
    }

    render() {
        // TODO - pridat cez generikum typ objektu v Dropdown-e (ak sa da)
        const options: any[] = this.state.options;

        // TODO - mozno by nebolo od veci pouzivat InputText ak readOnly === true (chybala by len sipka (rozbalovac)) a dalo by sa copy-paste-ovat
        // propertiesy na Dropdown-e: readOnly vyseduje, disabled znemoznuje vyber polozky
        const readOnly: boolean = this.isReadOnly();

        // Dropdown setuje do atributu object.assocField asociovany objekt zo zoznamu objektov ktore ziskame podla asociacie
        // appendTo={document.body} appenduje overlay panel na element body - eliminuje "skakanie" formularu na mobile pri kliknuti na dropdown
        return (
            <div className="field grid">
                <label htmlFor={this.props.assocField} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <Dropdown appendTo={document.body} id={this.props.assocField} optionLabel={this.props.displayField} value={this.getValue()} options={options}
                          onChange={this.onValueChange} readOnly={readOnly} disabled={readOnly} {...this.getClassNameTooltip()}/>
            </div>
        );
    }
}