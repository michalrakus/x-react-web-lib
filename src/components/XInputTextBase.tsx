import React, {useState} from "react";
import {
    stringAsUI,
    stringFromUI
} from "../serverApi/XUtilsConversions";
import {XUtils} from "./XUtils";
import {InputText} from "primereact/inputtext";

// koli optimalizacii - typovany text si zapisuje do svojej stavovej premennej a onChange zavola az z onBlur
// used for filter element in XLazyDataTable - if there was many rows/columns in datatable, typing in filter was slow (if setState was called after every character change)

export const XInputTextBase = (props: {
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    readOnly?: boolean;
    maxLength?: number;
    size?: string | number;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
    error?: string; // chybova hlaska, ak chceme field oznacit za nevalidny
}) => {

    // true, ak uzivatel typuje hodnotu
    // false, ak uz uzivatel dotypoval (zavolal sa onBlur) - hodnotu berieme "z hora" (z prop.value)
    const [inputChanged, setInputChanged] = useState<boolean>(false);
    // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute
    const [inputValueState, setInputValueState] = useState<string | undefined>(undefined);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // standardne prichadza z Calendar e.value - typ Date alebo null
        // typ Date prichadza ak uzivatel vyplnil validny datum, null (typeof e.value vracia "object") prichadza ak uzivatel vymazal datum
        // alebo je este datum nekompletny (uzivatel prave zadava datum)
        // nastavili sme keepInvalid={true} -> bude chodit nevalidny string (typeof e.value vracia "string")
        // naviac sme vypli parsovanie na datum (metoda parseDateTime), takze vzdy chodi "string" a konverziu robime v onBlur

        //const value: string | null = stringFromUI(e.target.value);

        setInputChanged(true);
        setInputValueState(e.target.value); // vzdycky string
    }

    const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (inputChanged) {
            // poznamka: e.target.value aj inputValueState obsahuju tu istu string hodnotu
            const value: string | null = stringFromUI(e.target.value);
            props.onChange(value);
            setInputChanged(false);
            setInputValueState(undefined); // pre poriadok
        }
    }

    const getInputValue = (): any => {
        let inputValue: any;
        if (inputChanged) {
            inputValue = inputValueState!; // vzdycky string
        }
        else {
            inputValue = stringAsUI(props.value);
        }
        return inputValue;
    }

    return (
        <InputText id={props.id} value={getInputValue()} onChange={onChange} onBlur={onBlur}
                   readOnly={props.readOnly} maxLength={props.maxLength} size={props.size} className={props.className} style={props.style}
                   {...XUtils.createTooltipOrErrorProps(props.error)} placeholder={props.placeholder}/>
    );
}

XInputTextBase.defaultProps = {
};
