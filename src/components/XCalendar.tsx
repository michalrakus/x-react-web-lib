import React from "react";
import {Calendar, CalendarChangeEvent} from "primereact/calendar";
import {dateFormatCalendar} from "../serverApi/XUtilsConversions";

// wrapper for Calendar component, maybe better name would be XInputDateBase
export const XCalendar = (props: {
    id?: string;
    value: Date | null;
    onChange: (value: Date | null) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement, Element>) => void;
    readOnly?: boolean;
    datetime?: boolean;
}) => {

    const onChange = (e: CalendarChangeEvent) => {
        // z Calendar prichadza e.value - typ Date alebo null
        // typ Date prichadza ak uzivatel vyplnil validny datum, null (typeof e.value vracia "object") prichadza ak uzivatel vymazal datum
        // alebo je este datum nekompletny (uzivatel prave zadava datum)
        // ak nastavime keepInvalid={true}, tak bude chodit nevalidny string (typeof e.value vracia "string")
        //console.log(typeof e.value);
        //console.log(e.value instanceof Date);
        if (e.value instanceof Date || e.value === null) {
            props.onChange(e.value);
        }
    }

    const datetime: boolean = props.datetime ?? false;

    return (
        <Calendar id={props.id} value={props.value} onChange={onChange} disabled={props.readOnly} showIcon={true} showOnFocus={false}
                  dateFormat={dateFormatCalendar()} showTime={datetime} showSeconds={datetime} inputClassName={datetime ? 'x-input-datetime' : 'x-input-date'}
                  onBlur={props.onBlur}/>
    );
}
