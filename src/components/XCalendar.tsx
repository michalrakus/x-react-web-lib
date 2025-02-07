import React, {useState} from "react";
import {Calendar, CalendarSelectEvent} from "primereact/calendar";
import {dateAsUI, dateFormatCalendar, dateFromModel, dateFromUI, XDateScale} from "../serverApi/XUtilsConversions";
import {XUtils} from "./XUtils";
import {FormEvent} from "primereact/ts-helpers";

// wrapper for Calendar component, maybe better name would be XInputDateBase
// TODO - nefunguje rezim datetime pre zapis - dorobit konverziu!
export const XCalendar = (props: {
    id?: string;
    value: Date | null;
    onChange: (value: Date | null) => void;
    readOnly?: boolean;
    error?: string; // chybova hlaska, ak chceme field oznacit za nevalidny
    scale: XDateScale;
    datetime?: boolean;
}) => {

    // true, ak uzivatel typuje hodnotu
    // false, ak uz uzivatel dotypoval (zavolal sa onBlur) - hodnotu berieme "z hora" (z prop.value)
    const [inputChanged, setInputChanged] = useState<boolean>(false);
    // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute
    const [inputValueState, setInputValueState] = useState<string | undefined>(undefined);

    const onChange = (e: FormEvent<Date>) => {
        // standardne prichadza z Calendar e.value - typ Date alebo null
        // typ Date prichadza ak uzivatel vyplnil validny datum, null (typeof e.value vracia "object") prichadza ak uzivatel vymazal datum
        // alebo je este datum nekompletny (uzivatel prave zadava datum)
        // nastavili sme keepInvalid={true} -> bude chodit nevalidny string (typeof e.value vracia "string")
        // naviac sme vypli parsovanie na datum (metoda parseDateTime), takze vzdy chodi "string" a konverziu robime v onBlur

        setInputChanged(true);
        setInputValueState(e.value as any); // vzdycky string
    }

    const onSelect = (e: CalendarSelectEvent) => {
        // musime tu zavolat props.onChange lebo event select zavola aj onChange ale my umyselne v onChange nevolame props.onChange
        // (cakame na event blur, ktory po selecte nepride)
        //props.onChange(e.value as any); // vzdycky Date
        // <- bolo takto ale vytvaralo Tue Feb 04 2025 00:00:00 GMT+0100 (Central European Standard Time) a cez onBlur (a ked prisiel string z DB)
        //               tak vytvaralo Tue Feb 04 2025 01:00:00 GMT+0100 (Central European Standard Time)
        //               a potom nefungoval XUtilsCommon.dateEquals (cez date1.getTime() === date2.getTime())
        // aby bol onSelect aj onBlur jednotne, tak dame:
        const value: Date | null | undefined = dateFromUI(dateAsUI(e.value as any, props.scale), props.scale); // e.value je vzdy Date
        props.onChange(value ?? null);

        // pre poriadok resetneme stav
        setInputChanged(false);
        setInputValueState(undefined);
    }

    const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (inputChanged) {
            // poznamka: e.target.value aj inputValueState obsahuju tu istu string hodnotu
            const value: Date | null | undefined = dateFromUI(e.target.value, props.scale);
            props.onChange(value ?? null); // nekorektnu hodnotu reprezentovanu cez undefined budeme riesit akokeby user zadal null (field sa vyprazdni)
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
            inputValue = dateFromModel(props.value);
        }
        return inputValue;
    }

    const getView = (dateScale: XDateScale): "date" | "month" | "year" => {
        let view: "date" | "month" | "year";
        if (dateScale === XDateScale.Date) {
            view = "date";
        }
        else if (dateScale === XDateScale.Month) {
            view = "month";
        }
        else if (dateScale === XDateScale.Year) {
            view = "year";
        }
        else {
            throw "Unimplemented dateScale = " + dateScale;
        }
        return view;
    }

    const datetime: boolean = props.datetime ?? false;

    // poznamka: parseDateTime nerobi ziadny parse, nechceme aby Calendar "rusil" uzivatela pri typovani datumu
    // konverzia (a volanie props.onChange) sa robi az pri onBlur
    return (
        <Calendar id={props.id} value={getInputValue()} onChange={onChange} disabled={props.readOnly} showIcon={true} showOnFocus={false}
                  view={getView(props.scale)} dateFormat={dateFormatCalendar(props.scale)} keepInvalid={true} parseDateTime={(text: string) => text as any}
                  showTime={datetime} showSeconds={datetime} inputClassName={datetime ? 'x-input-datetime' : 'x-input-date'}
                  onSelect={onSelect} onBlur={onBlur} {...XUtils.createTooltipOrErrorProps(props.error)}/>
    );
}

XCalendar.defaultProps = {
    scale: XDateScale.Date
};
