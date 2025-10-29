import PrimeReact, {localeOption, localeOptions, updateLocaleOption} from "primereact/api";
// using json-loader module we import x-en.json file into variable xEnJsonObject
import xEnJsonObject from "./locale/x-en.json";

// type for x-locale
export interface XLocaleOptions {
    // XLazyDataTable
    searchInAllFields?: string;
    filter?: string;
    resetTable?: string;
    addRow?: string;
    editRow?: string;
    removeRow?: string;
    exportRows?: string;
    chooseRow?: string;
    totalRecords?: string;
    pleaseSelectRow?: string;
    removeRowConfirm?: string;
    removeRowFailed?: string;
    // XFormBase, XFormFooter
    save?: string;
    cancel?: string;
    optimisticLockFailed?: string;
    formRemoveRowConfirm?: string;
    xAutoComplete?: string;
    // XExportRowsDialog
    expRowCount?: string;
    expExportType?: string;
    expCreateHeaderLine?: string;
    expCsvSeparator?: string;
    expDecimalFormat?: string;
    expEncoding?: string;
    // XInputFileList
    fileUploadSizeToBig?: string;
    fileUploadFailed?: string;
    fileDownloadFailed?: string;
    // XFieldSet
    fieldSetSaveEditConfirm?: string;
    fieldSetCancelEditConfirm?: string;
    fieldSetRemoveFieldConfirm?: string;
    // statistics
    runStatisticMissingDateField?: string;
    upload?: string;
    yes?: string;
    no?: string;
    dateFrom?: string;
    dateTo?: string;
    year?: string;
    yearForAgeCalculation?: string;
}

// under this key are x-locale saved inside of PrimeReact locale
const xOptionsKey: string = "xOptions";

export function xAddLocale(locale: string, xOptions: XLocaleOptions) {
    updateLocaleOption(xOptionsKey, xOptions, locale);
}

// using this method are x-locale read
export function xLocaleOption(xOptionKey: string, options?: any[string]) {
    const _locale: string = PrimeReact.locale || 'en';

    try {
        let optionValue = (localeOptions(_locale) as any)[xOptionsKey][xOptionKey];

        if (optionValue && options) {
            for (const key in options) {
                if (options.hasOwnProperty(key)) {
                    optionValue = optionValue.replace(`{${key}}`, options[key]);
                }
            }
        }

        return optionValue;
    } catch (error) {
        throw new Error(`The ${xOptionKey} option is not found in the current x-locale('${_locale}').`);
    }
}

// localeOption of primereact without locale param (helper)
export function prLocaleOption(key: string) {
    const _locale: string = PrimeReact.locale || 'en';
    return localeOption(key, _locale);
}

// add en locale into PrimeReact locale (global variable "locales" declared in file Locale.js)
xAddLocale('en', xEnJsonObject.en);
