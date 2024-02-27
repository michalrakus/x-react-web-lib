import React, {Component} from "react";
import {AutoComplete, AutoCompleteChangeEvent} from "primereact/autocomplete";
import {SplitButton} from "primereact/splitbutton";
import {Dialog} from "primereact/dialog";
import {OperationType, XUtils} from "./XUtils";
import {Button} from "primereact/button";
import {MenuItem} from "primereact/menuitem";
import {XSearchBrowseParams} from "./XSearchBrowseParams";
import {XCustomFilter, XLazyAutoCompleteSuggestionsRequest} from "../serverApi/FindParam";
import {DataTableSortMeta} from "primereact/datatable";
import { XFormProps } from "./XFormBase"; /* DO NOT REMOVE - IS USED EVEN IF IT IS MARKED AS NOT USED */
import {FindResult} from "../serverApi/FindResult";

// type of suggestions load from DB:
// suggestions - custom suggestions from parent component - no DB load used
// eager - in this.componentDidMount(), before user starts searching
// onSerachStart (default) - suggestions are being loaded when user starts typing or when user clicks on dropdown button (only one request is invoked)
// lazy - suggestions are being loaded always when user types some character but only if the count of suggestions is less or equal then threshold (prop lazyLoadMaxRows, default is 10)
//      -> this options must be used in the case if large amount of suggestions can be loaded
export type XSuggestionsLoadProp = "eager" | "onSearchStart" | "lazy";
export type XSuggestionsLoadType = "suggestions" | XSuggestionsLoadProp;

// XQuery zatial docasne sem - ale je to globalny objekt - parametre pre XUtils.fetchRows, taky jednoduchsi FindParam (este sem mozme pridat fullTextSearch ak bude treba)

export type XFilterOrFunction = XCustomFilter | (() => XCustomFilter | undefined);

export interface XQuery {
    entity: string;
    filter?: XFilterOrFunction;
    sortField?: string | DataTableSortMeta[];
    fields?: string[];
}

export interface XAutoCompleteBaseProps {
    value: any;
    onChange: (object: any, objectChange: OperationType) => void; // odovzda vybraty objekt, ak bol vybraty objekt zmeneny cez dialog (aj v DB), tak vrati objectChange !== OperationType.None
    suggestions?: any[]; // ak su priamo zadane suggestions, nepouziva sa suggestionsLoad a suggestionsQuery (vynimka je ak mame aj searchBrowse, vtedy do searchBrowse posleme filter (aj sortField?))
    suggestionsLoad?: XSuggestionsLoadProp; // ak nemame suggestions, pouzijeme suggestionsLoad (resp. jeho default) a suggestionsQuery (ten musi byt zadany)
    suggestionsQuery?: XQuery; // musi byt zadany ak nie su zadane suggestions (poznamka: filter (a sortField?) sa posielaju do searchBrowse)
    lazyLoadMaxRows: number; // max pocet zaznamov ktore nacitavame pri suggestionsLoad = lazy
    field: string; // field ktory zobrazujeme v input-e (niektory z fieldov objektu z value/suggestions)
    splitQueryValue: boolean; // ak true, tak splituje natypovanu hodnotu podla space a vsetky parcialne hodnoty sa musia vyskytovat v danom suggestion (default je true)
    searchBrowse?: JSX.Element; // ak je zadany, moze uzivatel vyhladavat objekt podobne ako pri XSearchButton (obchadza tym suggestions)
    valueForm?: JSX.Element; // formular na editaciu aktualne vybrateho objektu; ak je undefined, neda sa editovat
    idField?: string; // id field (nazov atributu) objektu z value/suggestions - je potrebny pri otvoreni formularu na editaciu, formular potrebuje id-cko na nacitanie/update zaznamu z DB
    maxLength?: number;
    width?: string;
    readOnly?: boolean;
    error?: string; // chybova hlaska, ak chceme field oznacit za nevalidny (pozor! netreba sem davat error z onErrorCahnge, ten si riesi XAutoCompleteBase sam)
    onErrorChange: (error: string | undefined) => void; // "vystup" pre validacnu chybu ktoru "ohlasi" AutoComplete; chyba by mala byt ohlasena vzdy ked this.state.inputChanged = true (a nemame focus na inpute)
    setFocusOnCreate?: boolean; // ak je true, nastavi focus do inputu po vytvoreni komponentu
}

export class XAutoCompleteBase extends Component<XAutoCompleteBaseProps> {

    public static defaultProps = {
        lazyLoadMaxRows: 10,
        splitQueryValue: true
    };

    autoCompleteRef: any;

    state: {
        inputChanged: boolean; // priznak, ci uzivatel typovanim zmenil hodnotu v inpute
        inputValueState: string | undefined; // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute
        notValid: boolean; // true, ak je autocomplete v nekonzistentom stave - user napisal do inputu nieco, na zaklade coho nevieme vybrat existujucu hodnotu
                            // (natypovanej hodnote zodpovedaju 2 a viac poloziek alebo ziadna polozka) a uzivatel odisiel z inputu
                            // ak je true, input je cerveny
                            // zmena je hlasena cez onErrorChange parentovi, parent by mal zabezpecit, ze ak mame nejaky nevalidny autocomplete, formular sa neda sejvnut na stacenie Save
        suggestions: any[] | undefined; // pouzivane ak suggestionsLoad = eager alebo onSearchStart, nepouzivane ak mame this.props.suggestions alebo suggestionsLoad = lazy
        filteredSuggestions: any[] | undefined;
        formDialogOpened: boolean;
        searchDialogOpened: boolean;
    };

    suggestionsLoadedForOSS: boolean; // pomocny priznak - zapisujeme si sem, ci sme uz zavolali loadSuggestions ak pouzivame suggestionsLoad = onSearchStart
    wasOnChangeCalled: boolean; // pomocny priznak - oprava bug-u, ked sa onChange zavolal 2-krat
                                // - raz z onBlur - ak uzivatel typovanim "vybral" prave jeden zaznam do suggestions dropdown-u
                                // a druhy raz z onSelect ked uzivatel klikol na tento jeden "vybraty" zaznam

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
            suggestions: undefined,
            filteredSuggestions: undefined,
            formDialogOpened: false,
            searchDialogOpened: false
        };

        this.suggestionsLoadedForOSS = false;
        this.wasOnChangeCalled = false;

        this.completeMethod = this.completeMethod.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.formDialogOnSaveOrCancel = this.formDialogOnSaveOrCancel.bind(this);
        this.formDialogOnHide = this.formDialogOnHide.bind(this);
        this.searchDialogOnChoose = this.searchDialogOnChoose.bind(this);
        this.searchDialogOnHide = this.searchDialogOnHide.bind(this);
    }

    getXSuggestionsLoadType(): XSuggestionsLoadType {
        let suggestionsLoadType: XSuggestionsLoadType;
        if (this.props.suggestions) {
            suggestionsLoadType = "suggestions";
        }
        else if (!this.props.suggestionsLoad) {
            suggestionsLoadType = "onSearchStart"; // default
        }
        else {
            suggestionsLoadType = this.props.suggestionsLoad;
        }
        return suggestionsLoadType;
    }

    componentDidMount() {
        if (this.getXSuggestionsLoadType() === "eager") {
            this.loadSuggestions();
        }
        if (this.props.setFocusOnCreate) {
            this.setFocusToInput();
        }
    }

    async loadSuggestions() {
        const suggestions: any[] = await this.fetchSuggestions();
        this.setState({suggestions: suggestions});
    }

    async fetchSuggestions(): Promise<any[]> {
        if (!this.props.suggestionsQuery) {
            throw `XAutoCompleteBase.loadSuggestions: unexpected error - prop suggestionsQuery is undefined`;
        }
        return XUtils.fetchRows(
            this.props.suggestionsQuery.entity,
            XUtils.evalFilter(this.props.suggestionsQuery.filter),
            this.props.suggestionsQuery.sortField,
            this.props.suggestionsQuery.fields
        );
    }

    async completeMethod(event: {query: string;}) {
        let filteredSuggestions: any[];
        const xSuggestionsLoadType: XSuggestionsLoadType = this.getXSuggestionsLoadType();
        if (xSuggestionsLoadType !== "lazy") {
            let suggestions: any[];
            if (xSuggestionsLoadType === "suggestions") {
                suggestions = this.props.suggestions!;
            }
            else if (xSuggestionsLoadType === "eager") {
                suggestions = this.state.suggestions!;
            }
            else if (xSuggestionsLoadType === "onSearchStart") {
                if (!this.suggestionsLoadedForOSS) {
                    suggestions = await this.fetchSuggestions();
                    // ulozime si
                    this.setState({suggestions: suggestions});
                    this.suggestionsLoadedForOSS = true; // ak user dalej typuje, nechceme znova nacitavat suggestions
                }
                else {
                    // uz mame nacitane
                    suggestions = this.state.suggestions!;
                }
            }
            else {
                throw 'Unexpected error - unknown xSuggestionsLoadType';
            }
            if (!event.query.trim().length) {
                // input je prazdny - volanie sem nastane ak user otvori dropdown cez dropdown button
                filteredSuggestions = [...suggestions];
            }
            else {
                const queryNormalized = XUtils.normalizeString(event.query);
                // ak mame viac hodnot oddelenych space-om, tak kazda hodnota sa musi vyskytovat zvlast
                // (podobny princip ako pri lazy, resp. full text search - pozri backend lazyAutoCompleteSuggestions resp. XMainQueryData.createFtsWhereItem)
                let queryNormalizedList: string[];
                if (this.props.splitQueryValue) {
                    queryNormalizedList = queryNormalized.split(' ').filter((value: string) => value !== ''); // nechceme pripadne prazdne retazce ''
                }
                else {
                    queryNormalizedList = [queryNormalized]; // nesplitujeme
                }
                filteredSuggestions = suggestions.filter((suggestion) => {
                    const fieldValue: string = suggestion[this.props.field];
                    // specialna null polozka (prazdny objekt) - test dame az za test fieldValue na undefined - koli performance
                    if (fieldValue === undefined && Object.keys(suggestion).length === 0) {
                        return false;
                    }
                    const fieldValueNormalized: string = XUtils.normalizeString(fieldValue);
                    // all partial query values must match
                    let match: boolean = true;
                    for (const queryItemNormalized of queryNormalizedList) {
                        // look for substring
                        if (fieldValueNormalized.indexOf(queryItemNormalized) === -1) {
                            match = false;
                            break;
                        }
                    }
                    return match;
                });
            }
        }
        else {
            // lazy
            if (!this.props.suggestionsQuery) {
                throw `XAutoCompleteBase.loadSuggestions: unexpected error - prop suggestionsQuery is undefined`;
            }
            let filter: XCustomFilter | undefined = XUtils.evalFilter(this.props.suggestionsQuery.filter);
            const suggestionsRequest: XLazyAutoCompleteSuggestionsRequest = {
                maxRows: this.props.lazyLoadMaxRows,
                field: this.props.field,
                queryValue: event.query.trim(),
                splitQueryValue: this.props.splitQueryValue,
                entity: this.props.suggestionsQuery.entity,
                filterItems: XUtils.createCustomFilterItems(filter),
                multiSortMeta: XUtils.createMultiSortMeta(this.props.suggestionsQuery.sortField),
                fields: this.props.suggestionsQuery.fields
            };
            const findResult: FindResult = await XUtils.fetchOne('x-lazy-auto-complete-suggestions', suggestionsRequest);
            if (findResult.rowList) {
                filteredSuggestions = findResult.rowList;
            }
            else {
                // TODO - zobrazit userovi pocet zaznamov a dat inu chybovu hlasku ako ze hodnota sa nenasla?
                filteredSuggestions = [];
            }
        }

        this.setState({filteredSuggestions: filteredSuggestions});
    }

    onChange(e: AutoCompleteChangeEvent) {
        if (typeof e.value === 'string') {
            this.setState({inputChanged: true, inputValueState: e.value});
            this.wasOnChangeCalled = false; // reset na default hodnotu
        }
    }

    onSelect(e: any) {
        // nevolame this.setObjectValue ak uz bol zavolany z onBlur
        if (!this.wasOnChangeCalled) {
            this.setObjectValue(e.value, OperationType.None);
        }
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
                    // ak bol tento this.setObjectValue vyvolany klikom do suggestions dropdown-u,
                    // tak bude este nasledne zavolany onSelect a tam chceme zamedzit volaniu this.setObjectValue,
                    // preto nastavujeme tento priznak
                    // priznak vratime naspet na false ak uzivatel zacne cokolvek robit s autocomplete (zacne don typovat alebo klikne na dropdown)
                    this.wasOnChangeCalled = true;
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
        // odchadzame z inputu, zresetujeme priznak - ak zacne user pracovat s autocomplete-om, nacitaju sa suggestions z DB (ak mame suggestionsLoad = onSearchStart)
        // suggestions chceme nacitat, lebo user moze zmenit iny atribut ktory ovplyvnuje filter autocomplete-u -> chceme novy zoznam suggestions
        this.suggestionsLoadedForOSS = false;
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
            // ak pouzivame zoznam this.state.suggestions, tak ho rereadneme
            // poznamka: ak pouzivame this.props.suggestions z parenta, tak si musi zoznam rereadnut parent!
            if (objectChange !== OperationType.None) {
                // zmenil sa zaznam dobrovolnika v DB
                // zatial len refreshneme z DB
                // ak by bol reqest pomaly, mozme pri inserte (nove id) / update (existujuce id) upravit zoznam a usetrime tym request do DB
                this.loadSuggestions();
            }
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
                            this.onEditAssocValue();
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
        this.openDropdown(e);
        this.suggestionsLoadedForOSS = false; // user mohol vyplnit nieco co meni filter a ide znova pracovat s autocomplete, nacitame suggestions znova (suggestionsLoad = onSearchStart)
        this.wasOnChangeCalled = false; // reset na default hodnotu
    }

    openDropdown(e: any) {
        // otvori dropdown (search je metoda popisana v API, volanie sme skopcili zo zdrojakov primereact)
        this.autoCompleteRef.current.search(e, '', 'dropdown');
    }

    onEditAssocValue() {
        // otvorime dialog na update
        if (this.props.idField === undefined) {
            throw "XAutoCompleteBase: property valueForm is defined but property idField is also needed for form editation.";
        }
        this.formDialogObjectId = this.props.value[this.props.idField];
        this.formDialogInitValuesForInsert = undefined;
        this.setState({formDialogOpened: true});
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
            displayFieldFilter: (this.state.inputChanged ? {field: this.props.field, constraint: {value: this.state.inputValueState, matchMode: "contains"}} : undefined),
            customFilter: this.props.suggestionsQuery?.filter
        };
    }

    render() {

        const readOnly: boolean = this.props.readOnly ?? false;

        let dropdownButton: JSX.Element;
        if (!readOnly) {
            if (this.props.searchBrowse || this.props.valueForm) {
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
                dropdownButton = <Button icon="pi pi-chevron-down" onClick={(e: any) => this.onOpenDropdown(e)} className={'x-dropdownbutton' + XUtils.mobileCssSuffix()}/>;
            }
        }
        else {
            // readOnly
            // ak mame valueForm a mame asociovany objekt, umoznime editovat asociovany objekt
            if (this.props.valueForm && this.props.value !== null) {
                dropdownButton = <Button icon="pi pi-pencil" onClick={(e: any) => this.onEditAssocValue()} className={'x-dropdownbutton' + XUtils.mobileCssSuffix()}/>;
            }
            else {
                // dame disablovany button (z estetickych dovodov, zachovame sirku)
                dropdownButton = <Button icon="pi pi-chevron-down" className={'x-dropdownbutton' + XUtils.mobileCssSuffix()} disabled={true}/>;
            }
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
            <div className="x-auto-complete-base" style={{width: this.props.width}}>
                <AutoComplete value={inputValue} suggestions={this.state.filteredSuggestions} completeMethod={this.completeMethod} field={this.props.field}
                              onChange={this.onChange} onSelect={this.onSelect} onBlur={this.onBlur} maxLength={this.props.maxLength}
                              ref={this.autoCompleteRef} readOnly={readOnly} disabled={readOnly} {...XUtils.createErrorProps(error)}/>
                {dropdownButton}
                {this.props.valueForm != undefined ?
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
