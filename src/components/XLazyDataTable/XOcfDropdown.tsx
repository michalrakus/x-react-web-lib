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
        // specialna null polozka ma label === ""
        if (e.value.label === "") {
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
    options.splice(0, 0, {label: ""});

    return (
        <Dropdown options={options} dataKey="label" optionLabel="label" value={props.value} onChange={onChange} className={props.className}/>
    );
}