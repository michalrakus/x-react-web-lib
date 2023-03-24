// pouzivane na custom validaciu na urovni formulara
export interface XErrors {
    [name: string]: string;
}

export interface XError {
    onChange?: string;
    onBlur?: string;
    form?: string; // sem pride error z XErrors (custom validacia na urovni formulara)
    fieldLabel?: string; // z technickych dovodov si uz pri vytvoreni XError sem ulozime label componentu ktory vyprodukoval XError
    // (teoreticky mozme mat viacero komponentov na jednej asociacii (XSearchButton, XDropdown, ...) a potom je problem spatne najst component podla fieldId)
}

// pouzivane v lib-ke
export interface XErrorMap {
    [name: string]: XError;
}