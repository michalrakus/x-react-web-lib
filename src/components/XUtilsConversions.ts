import {dateFormat} from "../serverApi/XUtilsCommon";
import {IPostgresInterval} from "./XUtils";

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

// v modeli na klientovi by mal byt vzdy number, teraz je tam niekedy string (z json-u zo servera) a niekedy number (z komponentu)
// provizorne zatial takato konverzia
export function numberFromModel(value: any): number | null {
    let numberValue: number | null = null;
    if (typeof value === 'string') {
        numberValue = parseFloat(value);
    }
    else if (typeof value === 'number') {
        numberValue = value;
    }
    return numberValue;
}

// v modeli na klientovi by mal byt vzdy Date, teraz je tam niekedy string (z json-u zo servera) a niekedy Date (z komponentu)
// provizorne zatial takato konverzia
export function dateFromModel(value: any): Date | null {
    let dateValue: Date | null = null;
    if (typeof value === 'string') {
        dateValue = new Date(value);
    }
    else if (typeof value === 'object' && value instanceof Date) {
        dateValue = value;
    }
    return dateValue;
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

// provizorne zatial takato konverzia
export function timeFromModel(value: any): Date | null {
    let timeValue: Date | null = null;
    if (typeof value === 'string') {
        // ak prichadza cas priamo z databazy, pride '19:30:00'
        // ak prichadza reloadnuty objekt (napr. cez webservis saveRow), pride '2021-06-07 19:30:00'
        let rowDataCasStr = value;
        if (rowDataCasStr.length < 10) {
            // mame '19:30:00' -> pridame hociaky rok aby sme skonvertovali na validny Date
            rowDataCasStr = '1970-01-01 ' + rowDataCasStr;
        }
        // na safari nefunguje konverzia new Date('2021-06-07 19:30:00') - vrati NaN
        // preto string prehodime na '2021-06-07T19:30:00+01:00'
        // 19:30:00 je cas z timezony Central Europe (taka je nastavena na nodejs)), preto oznacime tento cas touto timezonou
        // (spravne riesenie je posielat time cez json vzdy vo formate '2021-06-07T18:30:00Z', v tomto formate chodia aj datetime atributy)
        rowDataCasStr = rowDataCasStr.replace(' ', 'T');
        if (!rowDataCasStr.endsWith('Z') && rowDataCasStr.indexOf('+') === -1) {
            rowDataCasStr += '+01:00'; // Central Europe timezone
        }
        timeValue = new Date(rowDataCasStr);
    }
    else if (typeof value === 'object' && value instanceof Date) {
        timeValue = value;
    }
    return timeValue;
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

export function intervalFromUI(valueString: string): IPostgresInterval | null | undefined {
    // convert e.target.value (e.g. 10:29) into IPostgresInterval (e.g. {hours: 10, minutes: 29})
    // if stringValue is invalid, returns undefined
    let valueInterval: IPostgresInterval | null | undefined = undefined;
    if (valueString === '') {
        valueInterval = null;
    }
    else {
        const posColon = valueString.indexOf(':');
        if (posColon === -1) {
            let minutes: number = parseInt(valueString);
            if (!isNaN(minutes)) {
                const hours = Math.floor(minutes / 60);
                minutes = minutes - (hours * 60);
                valueInterval = {hours: hours, minutes: minutes};
            }
        }
        else {
            let hours: number = parseInt(valueString.substring(0, posColon));
            let minutes: number = parseInt(valueString.substring(posColon + 1));
            if (!isNaN(hours) && !isNaN(minutes)) {
                if (minutes >= 60) {
                    const hoursFromMinutes = Math.floor(minutes / 60);
                    hours += hoursFromMinutes;
                    minutes = minutes - (hoursFromMinutes * 60);
                }
                valueInterval = {hours: hours, minutes: minutes};
            }
        }
    }
    return valueInterval;
}

export function intervalAsUI(valueInterval: IPostgresInterval | null): string {
    // conversion e.g. {hours: 10, minutes: 29} => '10:29'
    let valueString: string;
    if (valueInterval !== null) {
        let hours: number = valueInterval.hours ?? 0;
        const minutes: number = valueInterval.minutes ?? 0;
        //const seconds: number = value.seconds ?? 0;
        if (valueInterval.days) {
            hours += valueInterval.days * 24;
        }
        valueString = `${hours.toString()}:${minutes.toString().padStart(2, '0')}`;
    }
    else {
        valueString = ''; // null
    }
    return valueString;
}
