import React from "react";
import {Dropdown, DropdownChangeEvent} from "primereact/dropdown";
import {XOptionalCustomFilter} from "./XLazyDataTable";

// dropdown for optional custom filter (ocf)
export const XOcfDropdown = (props: {
    optionalCustomFilters: XOptionalCustomFilter[];
    value: XOptionalCustomFilter | undefined;
    onChange: (value: XOptionalCustomFilter | undefined) => void;
    className?: string;
}) => {

    const onChange = (e: DropdownChangeEvent) => {
        let value: any | undefined;
        // specialna null polozka nema ziadne atributy
        if (Object.keys(e.value).length === 0) {
            value = undefined;
        }
        else {
            value = e.value;
        }
        props.onChange(value);
    }

    // pridame prazdnu polozku
    // polozku pridavame do kopie zoznamu, lebo inac sa nam "polozka" v props.optionalCustomFilters "mnozi"
    let options: any[] = [...props.optionalCustomFilters];
    options.splice(0, 0, {});

    return (
        <Dropdown options={options} optionLabel="label" value={props.value} onChange={onChange} className={props.className}/>
    );
}