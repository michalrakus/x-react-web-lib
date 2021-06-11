// pouzivane na custom validaciu na urovni formulara
export interface XErrors {
    [name: string]: string;
}

export interface XError {
    onChange?: string;
    onBlur?: string;
    form?: string; // sem pride error z XErrors (custom validacia na urovni formulara)
}

// pouzivane v lib-ke
export interface XErrorMap {
    [name: string]: XError;
}