import React from "react";
import { XObject } from "./XObject";
import {Dropdown} from "primereact/dropdown";
import {XUtils} from "./XUtils";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {InputText} from "primereact/inputtext";

export interface XDropdownProps extends XFormComponentProps {
    assocField: string;
    displayField: string;
}

export class XDropdown extends XFormComponent<XDropdownProps> {

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
        const props = this.props;

        // TODO - pridat cez generikum typ objektu v Dropdown-e (ak sa da)
        const options: any[] = this.state.options;

        let label = props.label ?? props.assocField;
        if (this.checkNotNull()) {
            label = XUtils.markNotNull(label);
        }

        const readOnly = props.readOnly ?? false;

        const labelStyle = props.labelStyle ?? {width:'150px'};

        const onValueChange = (e: any) => {
            let newValueOrNull: any;
            // specialna null polozka nema ziadne atributy
            if (Object.keys(e.target.value).length === 0) {
                newValueOrNull = null;
            } else {
                newValueOrNull = e.target.value;
            }
            const error: string | undefined = this.validateOnChange(newValueOrNull);
            props.form.onFieldChange(props.assocField, newValueOrNull, error);
        }

        // TODO - readOnly implementovat
        // Dropdown setuje do atributu object.assocField asociovany objekt zo zoznamu objektov ktore ziskame podla asociacie

        let assocObject = this.getValueFromObject();

        return (
            <div className="p-field p-grid">
                <label htmlFor={props.assocField} className="p-col-fixed" style={labelStyle}>{label}</label>
                <Dropdown id={props.assocField} optionLabel={props.displayField} value={assocObject} options={options} onChange={onValueChange}
                          {...this.getClassNameTooltip()}/>
            </div>
        );
    }
}