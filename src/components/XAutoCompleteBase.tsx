import React, {Component} from "react";
import {AutoComplete, AutoCompleteChangeEvent} from "primereact/autocomplete";
import {SplitButton} from "primereact/splitbutton";
import {Dialog} from "primereact/dialog";
import {OperationType, XQuery, XUtils} from "./XUtils";
import {Button} from "primereact/button";
import {MenuItem, MenuItemCommandEvent} from "primereact/menuitem";
import {XSearchBrowseParams} from "./XSearchBrowseParams";
import {XCustomFilter, XLazyAutoCompleteSuggestionsRequest} from "../serverApi/FindParam";
import {DataTableSortMeta} from "primereact/datatable";
import { XFormProps } from "./XFormBase"; /* DO NOT REMOVE - IS USED EVEN IF IT IS MARKED AS NOT USED */
import {FindResult} from "../serverApi/FindResult";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {XEntity} from "../serverApi/XEntityMetadata";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

// helper
interface XButtonItem {
    icon: any | undefined;
    tooltip?: string;
    command(event: MenuItemCommandEvent): void;
}

// type of suggestions load from DB:
// suggestions - custom suggestions from parent component - no DB load used
// eager - in this.componentDidMount(), before user starts searching (this type can save some requests to DB during user typing (usually several ms))
// onSerachStart (default) - suggestions are being loaded (always) when user starts typing or when user clicks on dropdown button (only one request is invoked in compare to lazy load)
// lazy - suggestions are being loaded always when user types some character (at least "minLength" characters must be typed), only first "lazyLoadMaxRows" rows are loaded, if there is more rows then special row ... is added, (default for "lazyLoadMaxRows" is 10)
//      -> this options must be used in the case if large amount of suggestions can be loaded
export type XSuggestionsLoadProp = "eager" | "onSearchStart" | "lazy";
export type XSuggestionsLoadType = "suggestions" | XSuggestionsLoadProp;

export interface XAutoCompleteBaseProps {
    value: any;
    onChange: (object: any, objectChange: OperationType) => void; // odovzda vybraty objekt, ak bol vybraty objekt zmeneny cez dialog (aj v DB), tak vrati objectChange !== OperationType.None
    suggestions?: any[]; // ak su priamo zadane suggestions, nepouziva sa suggestionsLoad a suggestionsQuery (vynimka je ak mame aj searchBrowse, vtedy do searchBrowse posleme filter (aj sortField?))
    suggestionsEntity?: string; // ak su priamo zadane suggestions, nepouziva sa suggestionsLoad a suggestionsQuery a entity mozme zadat tu - entity je potrebna na vyhladanie XField-ov (tie su potrebne na konverziu hodnoty atributu "field" do string-u); ak entitu nezadame, tak sa napr. zle skonvertuju datumy (iba cez toString)
    suggestionsLoad?: XSuggestionsLoadProp; // ak nemame suggestions, pouzijeme suggestionsLoad (resp. jeho default) a suggestionsQuery (ten musi byt zadany)
    suggestionsQuery?: XQuery; // musi byt zadany ak nie su zadane suggestions (poznamka: filter (a sortField?) sa posielaju do searchBrowse)
    lazyLoadMaxRows: number; // max pocet zaznamov ktore nacitavame pri suggestionsLoad = lazy
    field: string | string[]; // field ktory zobrazujeme v input-e (niektory z fieldov objektu z value/suggestions)
    itemTemplate?: (suggestion: any, index: number, createStringValue: boolean, defaultValue: (suggestion: any) => string) => React.ReactNode; // pouzivane ak potrebujeme nejaky custom format item-om (funkcia defaultValue rata default format)
    splitQueryValue: boolean; // ak true, tak splituje natypovanu hodnotu podla space a vsetky parcialne hodnoty sa musia vyskytovat v danom suggestion (default je true)
    searchBrowse?: JSX.Element; // ak je zadany, moze uzivatel vyhladavat objekt podobne ako pri XSearchButton (obchadza tym suggestions)
    valueForm?: JSX.Element; // formular na editaciu aktualne vybrateho objektu; ak je undefined, neda sa editovat
    idField?: string; // id field (nazov atributu) objektu z value/suggestions - je potrebny pri otvoreni formularu na editaciu, formular potrebuje id-cko na nacitanie/update zaznamu z DB
    addRowEnabled: boolean; // ak dame false, tak nezobrazi insert button ani ked mame k dispozicii "valueForm" (default je true)
    onAddRow?: (inputValue: string) => void; // override handlera zaveseneho na "plus" buttone (otazka je ci nejakym sposobom nestrkat vytvoreny/ziskany row do tohto autocomplete - zatial nie)
    insertButtonTooltip?: string;
    updateButtonTooltip?: string;
    searchButtonTooltip?: string;
    minLength?: number; // Minimum number of characters to initiate a search (default 1)
    buttonsLayout: "splitButton" | "buttons";
    width?: string;
    maxWidth?: string;
    scrollHeight?: string; // Maximum height of the suggestions panel.
    inputClassName?: string;
    readOnly?: boolean;
    error?: string; // chybova hlaska, ak chceme field oznacit za nevalidny (pozor! netreba sem davat error z onErrorCahnge, ten si riesi XAutoCompleteBase sam)
    onErrorChange: (error: string | undefined) => void; // "vystup" pre validacnu chybu ktoru "ohlasi" AutoComplete; chyba by mala byt ohlasena vzdy ked this.state.inputChanged = true (a nemame focus na inpute)
    setFocusOnCreate?: boolean; // ak je true, nastavi focus do inputu po vytvoreni komponentu
}

export class XAutoCompleteBase extends Component<XAutoCompleteBaseProps> {

    private static valueMoreSuggestions: string = "...";

    public static defaultProps = {
        lazyLoadMaxRows: 10,
        splitQueryValue: true,
        addRowEnabled: true,
        minLength: 1,
        buttonsLayout: "buttons",
        scrollHeight: '15rem'   // primereact has 200px
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

    xEntity: XEntity | undefined;

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

        let entity: string | undefined;
        if (this.getXSuggestionsLoadType() === "suggestions") {
            // if (this.props.suggestionsEntity === undefined) {
            //     throw "If prop suggestions is used, then also prop suggestionsEntity must be defined.";
            // }
            entity = this.props.suggestionsEntity;
        }
        else {
            if (this.props.suggestionsQuery === undefined) {
                throw "prop suggestionsQuery must be defined. (prop suggestions is not used)";
            }
            entity = this.props.suggestionsQuery.entity;
        }
        this.xEntity = entity ? XUtilsMetadataCommon.getXEntity(entity) : undefined;

        this.completeMethod = this.completeMethod.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.itemTemplate = this.itemTemplate.bind(this);
        this.itemTemplateString = this.itemTemplateString.bind(this);
        this.computeDefaultDisplayValue = this.computeDefaultDisplayValue.bind(this);
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

    // helper
    getFields(): string[] {
        return Array.isArray(this.props.field) ? this.props.field : [this.props.field];
    }

    getFirstField(): string {
        return this.getFields()[0];
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
            this.getSortField(),
            this.props.suggestionsQuery.fields
        );
    }

    getSortField(): string | DataTableSortMeta[] | undefined {
        let sortField: string | DataTableSortMeta[] | undefined = this.props.suggestionsQuery!.sortField;
        if (!sortField) {
            // len pri ne-lazy pouzivame ako default sort prvy displayField
            // pri lazy to spomaluje selecty v pripade ze klauzula LIMIT vyrazne obmedzi vysledny zoznam suggestions
            // pri lazy zosortujeme na frontende v XAutoCompleteBase
            if (this.getXSuggestionsLoadType() !== "lazy") {
                sortField = this.getFirstField();
            }
        }
        return sortField;
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
                    const fieldValue: string = this.itemTemplateString(suggestion);
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
            // ************* lazy ***************

            // na backendev  SELECT-e pouzijeme klauzulu LIMIT <maxRows + 1>
            // ak najdeme menej ako <maxRows + 1> zaznamov tak vieme ze sme nasli vsetky
            // ak najdeme presne <maxRows + 1> zaznamov, tak na konci zobrazime uzivatelovi specialnu polozku "..."
            // ktora ho upozorni ze existuju aj dalsie zaznamy splnujuce podmienku
            // pikoska - ak je query je velmi siroke (select by bez LIMIT <maxRows + 1> vratil mnoho zaznamov),
            // tak je takyto select velmi lacny (niekolko ms) - staci totiz najst prvych napr. 20 zaznamov splnujucich podmienku, t.j. netreba robit full-table scan
            // to ale plati len v pripade ze nepouzijeme ORDER BY - pri pouziti ORDER BY urobi full-table scan (vyfiltruje) a nasledne zosortuje
            // toto sa da obist specialnym selectom:
            // select t.* from (select t0.* from table t0 order by t0.<attr1>) t where <full-text-condition> limit 20
            // (najprv zosortuje a az potom filtruje prvych 20 zaznamov - predpoklad je ze nad t0.<attr1> mame index aby rychlo sortoval)
            // tento specialny select mozme v buducnosti dorobit (na backende) ak chceme podporovat (rychle) sortovanie v DB pre autocomplete

            if (!this.props.suggestionsQuery) {
                throw `XAutoCompleteBase.loadSuggestions: unexpected error - prop suggestionsQuery is undefined`;
            }
            let filter: XCustomFilter | undefined = XUtils.evalFilter(this.props.suggestionsQuery.filter);
            const suggestionsRequest: XLazyAutoCompleteSuggestionsRequest = {
                maxRows: this.props.lazyLoadMaxRows + 1,
                fullTextSearch: {fields: this.getFields(), value: event.query.trim(), splitValue: this.props.splitQueryValue, matchMode: "contains"},
                entity: this.props.suggestionsQuery.entity,
                filterItems: XUtils.createCustomFilterItems(filter),
                multiSortMeta: XUtils.createMultiSortMeta(this.getSortField()),
                fields: this.props.suggestionsQuery.fields
            };
            const findResult: FindResult = await XUtils.fetchOne('x-lazy-auto-complete-suggestions', suggestionsRequest);
            filteredSuggestions = findResult.rowList!;
            // ak sme nesortovali v DB (co je draha operacia) tak zosortujeme teraz
            // (itemTemplateString sa vola duplicitne ale pre tych cca 20 zaznamov je to ok)
            if (this.props.suggestionsQuery.sortField === undefined) {
                filteredSuggestions = XUtils.arraySort(filteredSuggestions, this.itemTemplateString);
            }
            // ak mame o 1 zaznam viac ako je lazyLoadMaxRows, zmenime posledny zaznam na ...
            // TODO - lepsie by bolo posledny zaznam vyhodit a popisok ... zobrazit do footer-a (odpadnu problemy z pripadnou selekciou pseudozaznamu ...)
            if (filteredSuggestions.length > this.props.lazyLoadMaxRows) {
                filteredSuggestions[filteredSuggestions.length - 1] = XAutoCompleteBase.valueMoreSuggestions; // zatial priamo string
            }
        }

        this.setState({filteredSuggestions: filteredSuggestions});
    }

    onChange(e: AutoCompleteChangeEvent) {
        if (typeof e.value === 'string' && !XAutoCompleteBase.isMoreSuggestions(e.value)) {
            this.setState({inputChanged: true, inputValueState: e.value});
            this.wasOnChangeCalled = false; // reset na default hodnotu
        }
    }

    onSelect(e: any) {
        // nevolame this.setObjectValue ak uz bol zavolany z onBlur
        if (!this.wasOnChangeCalled) {
            // nedovolime vybrat specialny zaznam ...
            if (!XAutoCompleteBase.isMoreSuggestions(e.value)) {
                this.setObjectValue(e.value, OperationType.None);
            }
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

    createInsertItem(buttonItems: XButtonItem[]) {

        buttonItems.push(
            {
                icon: 'pi pi-plus',
                tooltip: this.props.insertButtonTooltip,
                command: (e: any) => {
                    if (this.props.onAddRow) {
                        // mame custom handler pre "plus" button
                        // ak mame nevalidnu hodnotu, tak ju odovzdame (snaha o user friendly) - TODO - ak nie sme v nevalidnom stave
                        let inputValue: string = "";
                        if (this.state.inputChanged) {
                            inputValue = this.state.inputValueState!;
                        }
                        this.props.onAddRow(inputValue);
                    }
                    else {
                        // otvorime dialog na insert
                        this.formDialogObjectId = undefined;
                        this.formDialogInitValuesForInsert = {};
                        // ak mame nevalidnu hodnotu, tak ju predplnime (snaha o user friendly)
                        if (this.state.inputChanged) {
                            this.formDialogInitValuesForInsert[this.getFirstField()] = this.state.inputValueState;
                        }
                        this.setState({formDialogOpened: true});
                    }
                }
            });
    }

    createUpdateItem(buttonItems: XButtonItem[]) {
        buttonItems.push(
            {
                icon: 'pi pi-pencil',
                tooltip: this.props.updateButtonTooltip,
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

    createSearchItem(buttonItems: XButtonItem[]) {

        buttonItems.push(
            {
                icon: 'pi pi-search',
                tooltip: this.props.searchButtonTooltip,
                command: (e: any) => {
                        this.setState({searchDialogOpened: true});
                }
            });
    }

    createDropdownItem(buttonItems: XButtonItem[]) {

        buttonItems.push(
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
            inputValue = (object !== null) ? this.computeItemTemplate(object, -1, true) : ""; // TODO - je "" ok?
        }
        else {
            inputValue = this.state.inputValueState;
        }
        return inputValue;
    }

    itemTemplate(suggestion: any, index: number): React.ReactNode {
        return this.computeItemTemplate(suggestion, index, false);
    }

    // pouziva sa na vytvorenie hodnoty do inputu (vyselectovany zaznam) a tiez na pripadne sortovanie a filtrovanie na frontende (ak nepouzivame lazy nacitavanie)
    itemTemplateString(suggestion: any): string {
        const itemValue: React.ReactNode = this.computeItemTemplate(suggestion, -1, true);
        if (typeof itemValue !== "string") {
            throw `XAutoCompleteBase: function of the property itemTemplate created non-string value for suggestion. Please create string value if parameter createStringValue = true.`;
        }
        return itemValue;
    }

    computeItemTemplate(suggestion: any, index: number, createStringValue: boolean): React.ReactNode {
        let itemTemplate: React.ReactNode;
        // osetrenie specialnej polozky ... dame sem, nech sa to nemusi inde riesit
        if (XAutoCompleteBase.isMoreSuggestions(suggestion)) {
            itemTemplate = suggestion;
        }
        else {
            if (this.props.itemTemplate) {
                itemTemplate = this.props.itemTemplate(suggestion, index, createStringValue, this.computeDefaultDisplayValue);
            } else {
                itemTemplate = this.computeDefaultDisplayValue(suggestion);
            }
        }
        return itemTemplate;
    }

    computeDefaultDisplayValue(suggestion: any): string {
        let displayValue: string;
        if (XAutoCompleteBase.isMoreSuggestions(suggestion)) {
            displayValue = suggestion;
        }
        else {
            displayValue = XUtilsCommon.createDisplayValue(suggestion, this.xEntity, this.getFields());
        }
        return displayValue;
    }

    // vrati true ak sa jedna o specialny typ XAutoCompleteBase.valueMoreSuggestions
    static isMoreSuggestions(suggestion: any): boolean {
        return typeof suggestion === "string" && suggestion === XAutoCompleteBase.valueMoreSuggestions;
    }

    // takto cez metodku, mozno sa metodka vola len ked sa otvori dialog a usetrime nieco...
    createSearchBrowseParams(): XSearchBrowseParams {
        return {
            onChoose: this.searchDialogOnChoose,
            displayFieldFilter: (this.state.inputChanged ? {field: this.getFirstField(), constraint: {value: this.state.inputValueState, matchMode: "contains"}} : undefined),
            customFilter: this.props.suggestionsQuery?.filter
        };
    }

    render() {

        const readOnly: boolean = this.props.readOnly ?? false;

        let buttons: JSX.Element[];
        if (!readOnly) {
            const createInsertItem: boolean = (this.props.addRowEnabled && (this.props.valueForm !== undefined || this.props.onAddRow !== undefined));
            if (createInsertItem || this.props.valueForm || this.props.searchBrowse) {
                // mame searchBrowse alebo CRUD operacie, potrebujeme viac buttonov alebo SplitButton
                const buttonItems: XButtonItem[] = [];

                if (createInsertItem) {
                    this.createInsertItem(buttonItems);
                }

                if (this.props.valueForm) {
                    this.createUpdateItem(buttonItems);
                }

                if (this.props.searchBrowse) {
                    this.createSearchItem(buttonItems);
                }

                this.createDropdownItem(buttonItems);

                if (this.props.buttonsLayout === "buttons") {
                    buttons = buttonItems.map((value: XButtonItem, index: number) => <Button key={`button${index}`} icon={value.icon} tooltip={value.tooltip} tooltipOptions={{position: 'top'}}
                                                                              onClick={(e: any) => value.command!(e)} className={'x-dropdownbutton' + XUtils.mobileCssSuffix()}/>);
                }
                else {
                    // buttonsLayout === "splitButton"
                    // tooltip-y by trebalo pridat...
                    const splitButtonItems: MenuItem[] = buttonItems.map<MenuItem>((value: XButtonItem) => {return {icon: value.icon, command: value.command}});
                    buttons = [<SplitButton model={splitButtonItems} className={'x-splitbutton-only-dropdown' + XUtils.mobileCssSuffix()} menuClassName={'x-splitbutton-only-dropdown-menu' + XUtils.mobileCssSuffix()} disabled={readOnly}/>];
                }
            }
            else {
                // mame len 1 operaciu - dame jednoduchy button
                buttons = [<Button icon="pi pi-chevron-down" onClick={(e: any) => this.onOpenDropdown(e)} className={'x-dropdownbutton' + XUtils.mobileCssSuffix()}/>];
            }
        }
        else {
            // readOnly
            // ak mame valueForm a mame asociovany objekt, umoznime editovat asociovany objekt
            if (this.props.valueForm && this.props.value !== null) {
                buttons = [<Button icon="pi pi-pencil" tooltip={this.props.updateButtonTooltip} tooltipOptions={{position: 'top'}}
                                   onClick={(e: any) => this.onEditAssocValue()} className={'x-dropdownbutton' + XUtils.mobileCssSuffix()}/>];
            }
            else {
                // dame disablovany button (z estetickych dovodov, zachovame sirku)
                buttons = [<Button icon="pi pi-chevron-down" className={'x-dropdownbutton' + XUtils.mobileCssSuffix()} disabled={true}/>];
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
            <div className="x-auto-complete-base" style={{width: this.props.width, maxWidth: this.props.maxWidth}}>
                <AutoComplete value={inputValue} suggestions={this.state.filteredSuggestions} completeMethod={this.completeMethod} itemTemplate={this.itemTemplate}
                              onChange={this.onChange} onSelect={this.onSelect} onBlur={this.onBlur} minLength={this.props.minLength} scrollHeight={this.props.scrollHeight}
                              ref={this.autoCompleteRef} readOnly={readOnly} disabled={readOnly} {...XUtils.createTooltipOrErrorProps(error)} inputClassName={this.props.inputClassName}
                              showEmptyMessage={true}/>
                {...buttons}{/* ked tu bolo len {buttons} bez ..., tak vypisoval hlasku Warning: Each child in a list should have a unique "key" prop. */}
                {this.props.valueForm != undefined ?
                    <Dialog key="dialog-form" className="x-dialog-without-header" visible={this.state.formDialogOpened} onHide={this.formDialogOnHide}>
                        {/* klonovanim elementu pridame atributy id, initValues, onSaveOrCancel */}
                        {React.cloneElement(this.props.valueForm, {
                            id: this.formDialogObjectId, initValues: this.formDialogInitValuesForInsert, onSaveOrCancel: this.formDialogOnSaveOrCancel
                        } satisfies XFormProps/*, this.props.valueForm.children*/)}
                    </Dialog>
                    : undefined}
                {this.props.searchBrowse != undefined && !readOnly ?
                    <Dialog key="dialog-browse" className="x-dialog-without-header" visible={this.state.searchDialogOpened} onHide={this.searchDialogOnHide}>
                        {/* klonovanim elementu pridame atribut searchBrowseParams */}
                        {React.cloneElement(this.props.searchBrowse, {searchBrowseParams: this.createSearchBrowseParams()}/*, props.searchBrowse.children*/)}
                    </Dialog>
                    : undefined}
            </div>
        );
    }
}
