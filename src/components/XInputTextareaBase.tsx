import React, {useState} from "react";
import {stringAsUI, stringFromUI} from "../serverApi/XUtilsConversions";
import {XUtils} from "./XUtils";
import {InputTextarea} from "primereact/inputtextarea";

// koli optimalizacii - typovany text si zapisuje do svojej stavovej premennej a onChange zavola az z onBlur
// pri velkych formularoch je totiz volanie zmeny stavu this.setState({object: this.state.object, errorMap: this.state.errorMap}); pomale
export const XInputTextareaBase = (props: {
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    rows?: number;
    cols?: number;
    autoResize?: boolean;
    readOnly?: boolean;
    error?: string;
    style?: React.CSSProperties;
    maxLength?: number;
}) => {

    // true, ak uzivatel typuje hodnotu ale hodnota sa este neda skonvertovat na korektny interval (este nevieme vytvorit IPostgresInterval)
    // false, ak uz mame v inpute korektnu hodnotu - vtedy zavolame props.onChange a posleme mu IPostgresInterval
    const [inputChanged, setInputChanged] = useState<boolean>(false);
    // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute
    const [inputValueState, setInputValueState] = useState<string | undefined>(undefined);

    const onChange = (e: any) => {
        // conversion to IPostgresInterval will be done in onBlur
        setInputChanged(true);
        setInputValueState(e.target.value);
    }

    const onBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        // optimalizacia - testujeme len ak inputChanged === true
        if (inputChanged) {
            let value: string | null = stringFromUI(e.target.value);
            props.onChange(value);
            setInputChanged(false);
            setInputValueState(undefined); // pre poriadok
        }
    }

    const getInputValue = (): string => {
        let inputValue: string;
        if (inputChanged) {
            inputValue = inputValueState!;
        }
        else {
            inputValue = stringAsUI(props.value);
        }
        return inputValue;
    }

    return (
        <InputTextarea id={props.id} value={getInputValue()} onChange={onChange} onBlur={onBlur} readOnly={props.readOnly}
                       maxLength={props.maxLength} style={props.style} rows={props.rows} cols={props.cols}
                       autoResize={props.autoResize} {...XUtils.createErrorProps(props.error)}/>
    );
}
