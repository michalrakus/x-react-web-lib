import {dateFormat} from "../serverApi/XUtilsCommon";

export function stringFromUI(stringValue: string): string | null {
    let value: string | null;
    if (stringValue === '') {
        value = null;
    }
    else {
        value = stringValue;
    }
    return value;
}

export function stringAsUI(value: string | null): string {
    return value !== null ? value : "";
}

export function numberFromUI(stringValue: string): number | null {
    let value: number | null;
    if (stringValue === '') {
        value = null;
    }
    else {
        value = parseInt(stringValue, 10);
    }
    return value;
}

export function numberAsUI(value: number | null, fractionDigits?: number): string {
    if (fractionDigits === undefined) {
        fractionDigits = 2; // default
    }
    if (value !== null) {
        return value.toLocaleString('de-DE', {style: 'decimal', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits});
    }
    else {
        return "";
    }
}

export function dateAsUI(value: Date | null): string {
    if (value !== null) {
        return dateFormat(value, dateFormatUI());
    }
    else {
        return "";
    }
}

export function datetimeAsUI(value: Date | null): string {
    if (value !== null) {
        return dateFormat(value, datetimeFormatUI());
    }
    else {
        return "";
    }
}

export function dateFormatUI(): string {
    return "dd.mm.yyyy";
}

export function dateFormatCalendar(): string {
    return "dd.mm.yy";
}

export function datetimeFormatUI(): string {
    return "dd.mm.yyyy HH:MM:ss";
}
