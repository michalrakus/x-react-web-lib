import {InputText} from "primereact/inputtext";
import React, {CSSProperties, useState} from "react";
import {intervalAsUI, intervalFromUI} from "../serverApi/XUtilsConversions";
import {IPostgresInterval, XUtils} from "./XUtils";

// zatial podporuje len hours a minutes - TODO - pridat aj seconds, ale cez nejaky prepinac
export const XInputIntervalBase = (props: {
    id?: string;
    value: IPostgresInterval | null;
    onChange: (value: IPostgresInterval | null) => void;
    readOnly?: boolean;
    error?: string;
    style?: CSSProperties | undefined;
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

    const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        // optimalizacia - testujeme len ak inputChanged === true
        if (inputChanged) {
            // convert e.target.value (e.g. 10:29) into IPostgresInterval (e.g. {hours: 10, minutes: 29})
            let valueInterval: IPostgresInterval | null | undefined = intervalFromUI(e.target.value);
            if (valueInterval === undefined) {
                // user odisiel z inputu a nechal tam nevalidnu hodnotu - zapiseme hodnotu null, nech nemusime kontrolovat field pri validacii
                valueInterval = null;
            }
            props.onChange(valueInterval);
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
            inputValue = intervalAsUI(props.value);
        }
        return inputValue;
    }

    // remark - width:'3.5rem' is default, can be overriden by value from props.style, if needed
    return (
        <InputText id={props.id} value={getInputValue()} onChange={onChange} onBlur={onBlur}
                   readOnly={props.readOnly} {...XUtils.createTooltipOrErrorProps(props.error)} style={{width:'3.5rem', ...props.style}}/>
    );
}
