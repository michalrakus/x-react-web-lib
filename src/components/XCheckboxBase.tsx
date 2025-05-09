import React, {CSSProperties} from "react";
import {TriStateCheckbox, TriStateCheckboxChangeEvent} from "primereact/tristatecheckbox";
import {Checkbox, CheckboxChangeEvent} from "primereact/checkbox";
import {XUtils} from "./XUtils";

export const XCheckboxBase = (props: {
    id?: string;
    value: boolean | null;
    onChange: (value: boolean | null) => void;
    readOnly?: boolean;
    isNotNull?: boolean;
    tooltip?: string;
    error?: string;
    style?: CSSProperties | undefined;
}) => {

    const checkboxOnChange = (e: CheckboxChangeEvent) => {
        props.onChange(e.checked ?? false);
    }

    const triStateCheckboxChange = (e: TriStateCheckboxChangeEvent) => {
        // for blank value comes empty string "" (bug in primereact?)
        let newValue: boolean | null = null;
        if (typeof e.value !== 'string') {
            newValue = e.value ?? null;
        }
        // pri klikani na TriStateCheckbox prichadza v newValue cyklicky: true -> false -> null
        // ak mame not null atribut, tak pri null hodnote skocime rovno na true
        // TODO - pouzijeme, ked zrusime Checkbox a nechame len TriStateCheckbox
        // if (props.isNotNull) {
        //     if (newValue === null) {
        //         newValue = true;
        //     }
        // }
        props.onChange(newValue);
    }

    return (
        // pre not null atributy pouzijeme standardny checkbox aby sme pre false mali prazdny biely checkbox
        // TODO - pomenit ikonky na TriStateCheckbox aby to pekne sedelo, potom mozme zrusit Checkbox
        props.isNotNull ?
            <Checkbox id={props.id} checked={props.value ?? false} onChange={checkboxOnChange}
                      disabled={props.readOnly} style={props.style} {...XUtils.createTooltipOrErrorProps(props.error, props.tooltip)}/>
            : <TriStateCheckbox id={props.id} value={props.value} onChange={triStateCheckboxChange}
                                disabled={props.readOnly} style={props.style} {...XUtils.createTooltipOrErrorProps(props.error, props.tooltip)}/>
    );
}
