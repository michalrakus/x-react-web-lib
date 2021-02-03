import React, {useEffect, useState} from "react";
import {XFormBase} from "./XFormBase";
import { XObject } from "./XObject";
import {Dropdown} from "primereact/dropdown";
import {XUtils} from "./XUtils";

export const XDropdown = (props: {form: XFormBase; assocField: string; displayField: string, label?: string; readOnly?: boolean}) => {

    props.form.addField(props.assocField + '.' + props.displayField);

    // TODO - pridat cez generikum typ objektu v Dropdown-e (ak sa da)
    const [options, setOptions] = useState<any[]>([]);

    // parameter [] zabezpeci ze sa metoda zavola len po prvom renderingu (a nie po kazdej zmene stavu (zavolani setNieco()))
    useEffect(() => {
        findOptions(props.form.getEntity(), props.assocField);
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const label = props.label !== undefined ? props.label : props.assocField;
    const readOnly = props.readOnly !== undefined ? props.readOnly : false;

    const onValueChange = (e: any) => {
        let newValueOrNull: any;
        // specialna null polozka nema ziadne atributy
        if (Object.keys(e.target.value).length === 0) {
            newValueOrNull = null;
        }
        else {
            newValueOrNull = e.target.value;
        }
        props.form.onFieldChange(props.assocField, newValueOrNull);
    }

    const findOptions = async (entity: string, assocField: string) => {
        // TODO - mozno je lepsie uz na klientovi zistit entitu za asociaciou - zatial takto (findRowsForAssoc)
        const options: any[] = await XUtils.fetchMany('findRowsForAssoc', {entity: entity, assocField: assocField});
        options.splice(0, 0, {}); // null polozka (nepridavat pre not null atributy)
        setOptions(options);
    }

    // TODO - readOnly implementovat
    // Dropdown setuje do atributu object.assocField asociovany objekt zo zoznamu objektov ktore ziskame podla asociacie

    const object: XObject | null = props.form.state.object;
    let assocObject = object !== null ? object[props.assocField] : null;
    // ak je undefined, pre istotu dame na null, null je standard
    if (assocObject === undefined) {
        assocObject = null;
    }
    return (
        <div className="p-field p-grid">
            <label htmlFor={props.assocField} className="p-col-fixed" style={{width:'150px'}}>{label}</label>
            <Dropdown id={props.assocField} optionLabel={props.displayField} value={assocObject} options={options} onChange={onValueChange}/>
        </div>
    );
}