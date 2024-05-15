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
    tooltip?: string;
    placeholder?: string;
}) => {

    // true, ak uzivatel typuje hodnotu
    // false, ak bol zavolany onBlur
    const [inputChanged, setInputChanged] = useState<boolean>(false);
    // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute
    const [inputValueState, setInputValueState] = useState<string | undefined>(undefined);

    const onChange = (e: any) => {
        setInputChanged(true);
        setInputValueState(e.target.value);
    }

    const onBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        // optimalizacia - onChange volame len ak inputChanged === true
        if (inputChanged) {
            const value: string | null = stringFromUI(e.target.value);
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
                       autoResize={props.autoResize} {...XUtils.createTooltipOrErrorProps(props.error, props.tooltip)} placeholder={props.placeholder}/>
    );
}
