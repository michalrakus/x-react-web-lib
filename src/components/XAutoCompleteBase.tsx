import React, {Component} from "react";
import {AutoComplete, AutoCompleteChangeEvent} from "primereact/autocomplete";
import {SplitButton} from "primereact/splitbutton";
import {Dialog} from "primereact/dialog";
import {OperationType, XUtils} from "./XUtils";
import {Button} from "primereact/button";
import {MenuItem} from "primereact/menuitem";
import {XSearchBrowseParams} from "./XSearchBrowseParams";
import {XCustomFilter} from "../serverApi/FindParam";
import { XFormProps } from "./XFormBase";

export interface XAutoCompleteBaseProps {
    value: any;
    suggestions: any[];
    onChange: (object: any, objectChange: OperationType) => void; // odovzda vybraty objekt, ak bol vybraty objekt zmeneny cez dialog (aj v DB), tak vrati objectChange !== OperationType.None
    field: string; // field ktory zobrazujeme v input-e (niektory z fieldov objektu z value/suggestions)
    searchBrowse?: JSX.Element; // ak je zadany, moze uzivatel vyhladavat objekt podobne ako pri XSearchButton (obchadza tym suggestions)
    valueForm?: JSX.Element; // formular na editaciu aktualne vybrateho objektu; ak je undefined, neda sa editovat
    idField?: string; // id field (nazov atributu) objektu z value/suggestions - je potrebny pri otvoreni formularu na editaciu, formular potrebuje id-cko na nacitanie/update zaznamu z DB
    maxLength?: number;
    readOnly?: boolean;
    error?: string; // chybova hlaska, ak chceme field oznacit za nevalidny (pozor! netreba sem davat error z onErrorCahnge, ten si riesi XAutoCompleteBase sam)
    onErrorChange: (error: string | undefined) => void; // "vystup" pre validacnu chybu ktoru "ohlasi" AutoComplete; chyba by mala byt ohlasena vzdy ked this.state.inputChanged = true (a nemame focus na inpute)
    setFocusOnCreate?: boolean; // ak je true, nastavi focus do inputu po vytvoreni komponentu
    customFilterFunction?: () => XCustomFilter | undefined; // pouziva sa pri searchBrowse a planuje sa pouzivat pri lazy citani suggestions (vyhodnocuje sa pri otvoreni searchBrowse, t.j. co najneskor)
    onSearchStart?: (finishSearchStart?: () => void) => void; // pouziva sa ak chceme vykonat nieco tesne pred tym ako zacne user pracovat s autocomplete-om - pouziva sa hlavne na lazy nacitavanie suggestions
}

export class XAutoCompleteBase extends Component<XAutoCompleteBaseProps> {

    autoCompleteRef: any;

    state: {
        inputChanged: boolean; // priznak, ci uzivatel typovanim zmenil hodnotu v inpute
        inputValueState: string | undefined; // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute
        notValid: boolean; // true, ak je autocomplete v nekonzistentom stave - user napisal do inputu nieco, na zaklade coho nevieme vybrat existujucu hodnotu
                            // (natypovanej hodnote zodpovedaju 2 a viac poloziek alebo ziadna polozka) a uzivatel odisiel z inputu
                            // ak je true, input je cerveny
                            // zmena je hlasena cez onErrorChange parentovi, parent by mal zabezpecit, ze ak mame nejaky nevalidny autocomplete, formular sa neda sejvnut na stacenie Save
        filteredSuggestions: any[] | undefined;
        formDialogOpened: boolean;
        searchDialogOpened: boolean;
    };

    wasSearchStartCalled: boolean; // pomocny priznak - zapisujeme si sem, ci sme uz zavolali onSearchStart v pripade ak user zadava hodnotu typovanim

    // parametre pre form dialog (vzdy aspon jeden musi byt undefined)
    formDialogObjectId: number | undefined;
    formDialogInitValuesForInsert: any | undefined;

    constructor(props: XAutoCompleteBaseProps) {
        super(props);

        this.autoCompleteRef = React.createRef();

        this.state = {
            inputChanged: false,
            inputValueState: undefined,
            notValid: false,
            filteredSuggestions: undefined,
            formDialogOpened: false,
            searchDialogOpened: false
        };

        this.wasSearchStartCalled = false;

        this.completeMethod = this.completeMethod.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.formDialogOnSaveOrCancel = this.formDialogOnSaveOrCancel.bind(this);
        this.formDialogOnHide = this.formDialogOnHide.bind(this);
        this.searchDialogOnChoose = this.searchDialogOnChoose.bind(this);
        this.searchDialogOnHide = this.searchDialogOnHide.bind(this);
    }

    componentDidMount() {
        if (this.props.setFocusOnCreate) {
            this.setFocusToInput();
        }
    }

    completeMethod(event: {query: string;}) {
        let filteredSuggestions: any[];
        if (!event.query.trim().length) {
            filteredSuggestions = [...this.props.suggestions];
        }
        else {
            const queryNormalized = XUtils.normalizeString(event.query);
            filteredSuggestions = this.props.suggestions.filter((suggestion) => {
                const fieldValue: string = suggestion[this.props.field];
                // specialna null polozka (prazdny objekt) - test dame az za test fieldValue na undefined - koli performance
                if (fieldValue === undefined && Object.keys(suggestion).length === 0) {
                    return false;
                }
                // bolo:
                //return XUtils.normalizeString(fieldValue).startsWith(queryNormalized);
                return XUtils.normalizeString(fieldValue).indexOf(queryNormalized) !== -1;
            });
        }

        this.setState({filteredSuggestions: filteredSuggestions});
    }

    onChange(e: AutoCompleteChangeEvent) {
        if (typeof e.value === 'string') {
            // ak user zacne typovat znaky, nacitame suggestions, ak sme lazy (onSearchStart !== undefined)
            if (this.props.onSearchStart) {
                if (e.value !== '') { // ak user vymaze cely input, este nechceme nacitat suggestions, az ked zapise nejaky znak
                    if (!this.wasSearchStartCalled) {
                        this.props.onSearchStart();
                        this.wasSearchStartCalled = true; // ak user dalej typuje, nechceme znova nacitavat suggestions
                    }
                }
            }
            this.setState({inputChanged: true, inputValueState: e.value});
        }
    }

    onSelect(e: any) {
        this.setObjectValue(e.value, OperationType.None);
    }

    onBlur(e: React.FocusEvent<HTMLInputElement>) {
        // optimalizacia - testujeme len ak inputChanged === true
        if (this.state.inputChanged) {
            if (e.target.value === '') {
                this.setObjectValue(null, OperationType.None); // prazdny retazec znamena null hodnotu
            } else {

                // skusime ci filteredSuggestions nemaju prave jeden element
                const filteredSuggestions = this.state.filteredSuggestions;
                if (filteredSuggestions && filteredSuggestions.length === 1) {
                    this.setObjectValue(filteredSuggestions[0], OperationType.None);
                }
                else {
                    // tu by sme mohli skusit vyratat vysledok pre filteredSuggestions este raz, mozno este vypocet filteredSuggestions nedobehol
                    // mohli by sme: zobrazit vsetky povolene hodnoty (v dialogu/v dropdown liste), zobrazit nejaky alert

                    //alert("invalid value");

                    // radi by sme stopli dalsie event-y (napr. stlacenie buttonu, ktore vyvolalo stratu focus-u), ale nezafungovalo nam to
                    //e.preventDefault();
                    //e.stopPropagation();

                    // nefunguje ani toto
                    //console.log('stop propagation');
                    //console.log(e);
                    //e.nativeEvent.stopImmediatePropagation();
                    //e.preventDefault();

                    // zobrazime dropdown list aby sme usera upovedomili ze ma vybrat nejaku hodnotu
                    // toto neni moc prakticke ak mame vela poloziek v dropdown-e - lepsi by bol asi confirm, ci pridat novu polozku do DB
                    // zrusil som, lebo pri vybere z dropdownu kliknutim sa vola tento onBlur (este pred onSelect), zobrazi sa iny dropdown ako vidi uzivatel a vyberie sa z neho ina polozka ako je ta na ktoru klikol user
                    //this.autoCompleteRef.current.onDropdownClick();

                    // vratime focus do inputu
                    // obycajne setnutie focusu nefunguje, treba v setnut focus v samostatnom evente
                    // TODO - aj nejaky stop event skusit
                    //console.log('onBlur - setujem timeout');
                    //setTimeout(() => {this.onBlurInvalidInput();}, 100);

                    // najnovsi sposob
                    // TODO - problem - ak zapisem nejake znaky a vyselektujem nejaky zaznam tak vznikne cerveny preblik (az nasledny onSelect zrusi state.notValid = true)
                    // zial neviem odlisit event sposobeny selektnutim zaznamu a event sposobeny kliknutim niekam vedla
                    //console.log(e);
                    this.setState({notValid: true}); // ocervenime input
                    this.props.onErrorChange(this.createErrorMessage()); // ohlasime nevalidnost parentovi
                }
            }
        }
        // odchadzame z inputu, zresetujeme priznak - ak zacne user pracovat s autocomplete-om, nacitaju sa suggestions z DB (ak mame lazy)
        this.wasSearchStartCalled = false;
    }

    createErrorMessage(): string {
        return `Value "${this.state.inputValueState}" was not found among valid values.`;
    }

/*
    onBlurInvalidInput() {
        // ak uzivatel vyvolal onBlur kliknutim na polozku dropdown list-u, tak sa v priebehu 100 ms (oneskorenie volania onBlurInvalidInput()) zavolal onSelect,
        // zmenil sa inputChanged a netreba nic riesit
        if (this.state.inputChanged) {
            console.log('onBlurInvalidInput - idem otvorit confirm');
            if (window.confirm(`Value "${this.state.inputValueState}" was not found among valid values, create new valid value?`)) {
                // otvorime dialog na insert
                this.formDialogObjectId = undefined;
                // TODO - pridat ako novu prop metodu ktora bude vracat bude mat parameter this.state.inputValueState a vrati object
                // ak bude tato metoda undefined, tak zostane tato povodna funkcionalita
                this.formDialogInitValuesForInsert = {};
                this.formDialogInitValuesForInsert[this.props.field] = this.state.inputValueState;
                this.setState({formDialogOpened: true});
            }
            else {
                // vratime focus do inputu, je tam nevalidna hodnota
                console.log('onBlurInvalidInput - idem vratit focus');
                this.setFocusToInput();
            }
        }
    }
*/

    setFocusToInput() {
        this.autoCompleteRef.current.focus();
    }

    setObjectValue(object: any, objectChange: OperationType) {
        this.setState({inputChanged: false, notValid: false});
        this.props.onChange(object, objectChange);
        this.props.onErrorChange(undefined); // uz nie sme v nevalidnom stave
    }

    formDialogOnSaveOrCancel(object: any | null, objectChange: OperationType) {
        if (object !== null) {
            // ak bol save, treba tento novy object pouzit
            this.setObjectValue(object, objectChange);
            // treba upravit this.state.filteredSuggestions? setli sme novy objekt, panel so suggestions by mal byt zavrety - TODO - overit
        }
        else {
            // bol cancel, vratime focus do inputu ak treba
            if (this.state.inputChanged) {
                this.setFocusToInput();
            }
        }
        this.setState({formDialogOpened: false});
    }

    formDialogOnHide() {
        this.setState({formDialogOpened: false});
        // ak mame v inpute neplatnu hodnotu, vratime kurzor na input
        if (this.state.inputChanged) {
            this.setFocusToInput();
        }
    }

    searchDialogOnChoose(chosenRow: any) {
        this.setState({searchDialogOpened: false});
        // zapiseme vybraty row do objektu
        this.setObjectValue(chosenRow, OperationType.None);
    }

    searchDialogOnHide() {
        this.setState({searchDialogOpened: false});
        // ak mame v inpute neplatnu hodnotu, vratime kurzor na input
        if (this.state.inputChanged) {
            this.setFocusToInput();
        }
    }

    createInsertUpdateItems(splitButtonItems: MenuItem[]) {

        splitButtonItems.push(
            {
                icon: 'pi pi-plus',
                command: (e: any) => {
                    // otvorime dialog na insert
                    this.formDialogObjectId = undefined;
                    this.formDialogInitValuesForInsert = {};
                    // ak mame nevalidnu hodnotu, tak ju predplnime (snaha o user friendly)
                    if (this.state.inputChanged) {
                        this.formDialogInitValuesForInsert[this.props.field] = this.state.inputValueState;
                    }
                    this.setState({formDialogOpened: true});
                }
            });

        splitButtonItems.push(
            {
                icon: 'pi pi-pencil',
                command: (e: any) => {
                    if (this.state.inputChanged) {
                        alert(`Value "${this.state.inputValueState}" was not found among valid values, please enter some valid value.`);
                        this.setFocusToInput();
                    } else {
                        if (this.props.value === null) {
                            alert('Please select some row.');
                        } else {
                            // otvorime dialog na update
                            if (this.props.idField === undefined) {
                                throw "XAutoCompleteBase: property valueForm is defined but property idField is also needed for form editation.";
                            }
                            this.formDialogObjectId = this.props.value[this.props.idField];
                            this.formDialogInitValuesForInsert = undefined;
                            this.setState({formDialogOpened: true});
                        }
                    }
                }
            });
        // remove nebudeme podporovat, je technicky problematicky - nemozme vymazat zaznam z DB koli FK constraintu
        // {
        //     icon: 'pi pi-times',
        //     command: (e: any) => {
        //         console.log('remove');
        //     }
        // },
    }

    createSearchItem(splitButtonItems: MenuItem[]) {

        splitButtonItems.push(
            {
                icon: 'pi pi-search',
                command: (e: any) => {
                        this.setState({searchDialogOpened: true});
                }
            });
    }

    createDropdownItem(splitButtonItems: MenuItem[]) {

        splitButtonItems.push(
            {
                icon: 'pi pi-chevron-down',
                command: (e: any) => {
                    // zobrazi cely suggestions list, zide sa ak chceme vidiet vsetky moznosti
                    // neprakticke ak mame vela poloziek v suggestions list

                    // krasne zobrazi cely objekt!
                    // this.autoCompleteRef.current je element <AutoComplete .../>, ktory vytvarame v render metode
                    //console.log(this.autoCompleteRef.current);

                    // otvori dropdown (search je metoda popisana v API, volanie sme skopcili zo zdrojakov primereact)
                    // if (this.props.onSearchStart) {
                    //     this.props.onSearchStart(() => this.finishSearchStart(e));
                    // }
                    // this.autoCompleteRef.current.search(e, '', 'dropdown');
                    this.onOpenDropdown(e);
                }
            });
    }

    onOpenDropdown(e: any) {
        if (this.props.onSearchStart) {
            this.props.onSearchStart(() => this.openDropdown(e));
        }
        else {
            // otvori dropdown (search je metoda popisana v API, volanie sme skopcili zo zdrojakov primereact)
            //this.autoCompleteRef.current.search(e, '', 'dropdown');
            this.openDropdown(e);
        }
    }

    openDropdown(e: any) {
        // otvori dropdown (search je metoda popisana v API, volanie sme skopcili zo zdrojakov primereact)
        this.autoCompleteRef.current.search(e, '', 'dropdown');
    }

    // vracia objekt (ak inputChanged === false) alebo string (ak inputChanged === true)
    computeInputValue(): any {
        let inputValue;
        if (!this.state.inputChanged) {
            // poznamka: ak object === null tak treba do inputu zapisovat prazdny retazec, ak by sme pouzili null, neprejavila by sa zmena v modeli na null
            const object = this.props.value;
            inputValue = (object !== null) ? object : ""; // TODO - je "" ok?
        }
        else {
            inputValue = this.state.inputValueState;
        }
        return inputValue;
    }

    // takto cez metodku, mozno sa metodka vola len ked sa otvori dialog a usetrime nieco...
    createSearchBrowseParams(): XSearchBrowseParams {
        return {
            onChoose: this.searchDialogOnChoose,
            displayFieldFilter: (this.state.inputChanged ? {field: this.props.field, constraint: {value: this.state.inputValueState, matchMode: "startsWith"}} : undefined),
            customFilterFunction: this.props.customFilterFunction
        };
    }

    render() {

        const readOnly: boolean = this.props.readOnly ?? false;

        let dropdownButton: JSX.Element;
        if ((this.props.searchBrowse && !readOnly) || this.props.valueForm) {
            // mame searchBrowse alebo CRUD operacie, potrebujeme SplitButton
            const splitButtonItems: MenuItem[] = [];

            if (this.props.valueForm) {
                this.createInsertUpdateItems(splitButtonItems);
            }

            if (this.props.searchBrowse && !readOnly) {
                this.createSearchItem(splitButtonItems);
            }

            this.createDropdownItem(splitButtonItems);

            dropdownButton = <SplitButton model={splitButtonItems} className={'x-splitbutton-only-dropdown' + XUtils.mobileCssSuffix()} menuClassName={'x-splitbutton-only-dropdown-menu' + XUtils.mobileCssSuffix()} disabled={readOnly}/>;
        }
        else {
            // mame len 1 operaciu - dame jednoduchy button
            dropdownButton = <Button icon="pi pi-chevron-down" onClick={(e: any) => this.onOpenDropdown(e)} className={'x-dropdownbutton' + XUtils.mobileCssSuffix()} disabled={readOnly}/>;
        }

        // vypocitame inputValue
        const inputValue = this.computeInputValue();

        let error: string | undefined;
        if (this.state.notValid) {
            // ak je v nevalidnom stave, tak ma tato chybova hlaska prednost pred ostatnymi (ak nahodou su)
            error = this.createErrorMessage();
        }
        else {
            error = this.props.error;
        }

        // Dialog pre konkretny form:
        // <DobrovolnikForm id={this.formDialogObjectId} object={this.formDialogInitValuesForInsert} onSaveOrCancel={this.formDialogOnSaveOrCancel}/>

        // formgroup-inline lepi SplitButton na autocomplete a zarovna jeho vysku
        return (
            <div className="x-auto-complete-base">
                <AutoComplete value={inputValue} suggestions={this.state.filteredSuggestions} completeMethod={this.completeMethod} field={this.props.field}
                              onChange={this.onChange} onSelect={this.onSelect} onBlur={this.onBlur} maxLength={this.props.maxLength}
                              ref={this.autoCompleteRef} readOnly={readOnly} disabled={readOnly} {...XUtils.createErrorProps(error)}/>
                {dropdownButton}
                {this.props.valueForm != undefined && !readOnly ?
                    <Dialog visible={this.state.formDialogOpened} onHide={this.formDialogOnHide} header={this.formDialogObjectId ? 'Modification' : 'New row'}>
                        {/* klonovanim elementu pridame atributy id, initValues, onSaveOrCancel */}
                        {React.cloneElement(this.props.valueForm, {
                            id: this.formDialogObjectId, initValues: this.formDialogInitValuesForInsert, onSaveOrCancel: this.formDialogOnSaveOrCancel
                        } satisfies XFormProps/*, this.props.valueForm.children*/)}
                    </Dialog>
                    : undefined}
                {this.props.searchBrowse != undefined && !readOnly ?
                    <Dialog visible={this.state.searchDialogOpened} onHide={this.searchDialogOnHide}>
                        {/* klonovanim elementu pridame atribut searchBrowseParams */}
                        {React.cloneElement(this.props.searchBrowse, {searchBrowseParams: this.createSearchBrowseParams()}/*, props.searchBrowse.children*/)}
                    </Dialog>
                    : undefined}
            </div>
        );
    }
}
