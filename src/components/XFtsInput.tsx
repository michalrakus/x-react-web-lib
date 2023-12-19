import {InputText} from "primereact/inputtext";
import React from "react";
import {stringAsUI, stringFromUI} from "./XUtilsConversions";

// typ XFtsInputValue reprezentuje hodnoty ktore sa daju menit touto komponentou
// tento typ ciastocne zodpoveda typu XFullTextSearch pouzivanom v api
export interface XFtsInputValue {
    value: string | null; // null znamena prazdny input, neaplikuje sa full text search podmienka
    matchMode: 'startsWith' | 'contains' | 'endsWith' | 'equals'; // zatial tieto (podmnozina z DataTableFilterMetaData), default bude 'contains'
}

export const XFtsInput = (props: {value: XFtsInputValue; onChange: (value: XFtsInputValue) => void;}) => {

    const onChange = (e: any) => {
        const value: string | null = stringFromUI(e.target.value);
        props.value.value = value;
        props.onChange({...props.value}); // vyklonujeme aby react zaregistroval, ze sme urobili zmenu
    }

    // TODO - pridat input na zmenu matchMode
    return (
        <InputText value={stringAsUI(props.value.value)} onChange={onChange} style={{height: '2.5rem', width: '17rem'}} className="m-1"/>
    );
}
