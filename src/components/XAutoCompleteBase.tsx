import React, {Component} from "react";
import {AutoComplete} from "primereact/autocomplete";
import {SplitButton} from "primereact/splitbutton";
import {Dialog} from "primereact/dialog";
import {OperationType, XUtils} from "./XUtils";

export interface XAutoCompleteBaseProps {
    value: any;
    suggestions: any[];
    onChange: (object: any, objectChange: OperationType) => void; // odovzda vybraty objekt, ak bol vybraty objekt zmeneny cez dialog (aj v DB), tak vrati objectChange !== OperationType.None
    field: string; // field ktory zobrazujeme v input-e (niektory z fieldov objektu z value/suggestions)
    valueForm?: any; // formular na editaciu aktualne vybrateho objektu; ak je undefined, neda sa editovat
    idField?: string; // id field (nazov atributu) objektu z value/suggestions - je potrebny pri otvoreni formularu na editaciu, formular potrebuje id-cko na nacitanie/update zaznamu z DB
    maxlength?: number;
    error?: string; // chybova hlaska, ak chceme field oznacit za nevalidny (pozor! netreba sem davat error z onErrorCahnge, ten si riesi XAutoCompleteBase sam)
    onErrorChange: (error: string | undefined) => void; // "vystup" pre validacnu chybu ktoru "ohlasi" AutoComplete; chyba by mala byt ohlasena vzdy ked this.state.inputChanged = true (a nemame focus na inpute)
    setFocusOnCreate?: boolean; // ak je true, nastavi focus do inputu po vytvoreni komponentu
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
    };

    // parametre pre form dialog (vzdy aspon jeden musi byt undefined)
    formDialogObjectId: number | undefined;
    formDialogInitObjectForInsert: any | undefined;

    constructor(props: XAutoCompleteBaseProps) {
        super(props);

        this.autoCompleteRef = React.createRef();

        this.state = {
            inputChanged: false,
            inputValueState: undefined,
            notValid: false,
            filteredSuggestions: undefined,
            formDialogOpened: false
        };

        this.completeMethod = this.completeMethod.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.formDialogOnSaveOrCancel = this.formDialogOnSaveOrCancel.bind(this);
        this.formDialogOnHide = this.formDialogOnHide.bind(this);
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
                // bolo:
                //return XUtils.normalizeString(fieldValue).startsWith(queryNormalized);
                return XUtils.normalizeString(fieldValue).indexOf(queryNormalized) !== -1;
            });
        }

        this.setState({filteredSuggestions: filteredSuggestions});
    }

    onChange(e: any) {
        if (typeof e.value === 'string') {
            this.setState({inputChanged: true, inputValueState: e.value});
        }
    }

    onSelect(e: any) {
        this.setObjectValue(e.value, OperationType.None);
    }

    onBlur(e: any) {
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
                    this.setState({notValid: true}); // ocervenime input
                    this.props.onErrorChange(this.createErrorMessage()); // ohlasime nevalidnost parentovi
                }
            }
        }
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
                this.formDialogInitObjectForInsert = {};
                this.formDialogInitObjectForInsert[this.props.field] = this.state.inputValueState;
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
        if (this.autoCompleteRef.current.inputRef !== undefined) {
            // funguje ak je XAutoCompleteBase priamo v projekte, tiez funguje ak sa pouziva lib-ka z npmjs.com
            // nefunguje ak mame lib-ku priamo nalinkovanu na projekt (zmeny lib-ky pocas vyvoja)(minimalne next projekt kvm-next-web-app nefungoval)
            this.autoCompleteRef.current.inputRef.current.focus();
        }
        else {
            // pozor! nefunguje ak sa lib-ka pouziva z npmjs.com,
            // je tu koli tomu ked je lib-ka priamo nalinkovana na projekt
            // je to hack ale neviem to lepsie vyriesit
            console.log('Warning! this.autoCompleteRef.current.inputRef is undefined - we try to use this.autoCompleteRef.current.inputEl instead');
            this.autoCompleteRef.current.inputEl.focus();
        }
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

    // vracia objekt (ak inputChanged === false) alebo string (ak inputChanged === true)
    computeInputValue(): any {
        let inputValue = null;
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

    render() {

        // menu na pripadne CRUD operacie
        const splitButtonItems = [];

        if (this.props.valueForm) {
            splitButtonItems.push(
                {
                    icon: 'pi pi-plus',
                    command: (e: any) => {
                        // otvorime dialog na insert
                        this.formDialogObjectId = undefined;
                        this.formDialogInitObjectForInsert = {};
                        // ak mame nevalidnu hodnotu, tak ju predplnime (snaha o user friendly)
                        if (this.state.inputChanged) {
                            this.formDialogInitObjectForInsert[this.props.field] = this.state.inputValueState;
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
                                this.formDialogInitObjectForInsert = undefined;
                                this.setState({formDialogOpened: true});
                            }
                        }
                    }
                });
        }
            // remove nebudeme podporovat, je technicky problematicky - nemozme vymazat zaznam z DB koli FK constraintu
            // {
            //     icon: 'pi pi-times',
            //     command: (e: any) => {
            //         console.log('remove');
            //     }
            // },

        splitButtonItems.push(
            {
                icon: 'pi pi-chevron-down',
                command: (e: any) => {
                    // zobrazi cely suggestions list, zide sa ak chceme vidiet vsetky moznosti
                    // neprakticke ak mame vela poloziek v suggestions list
                    this.autoCompleteRef.current.onDropdownClick();
                }
            });

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
        // <DobrovolnikForm id={this.formDialogObjectId} object={this.formDialogInitObjectForInsert} onSaveOrCancel={this.formDialogOnSaveOrCancel}/>

        // formgroup-inline lepi SplitButton na autocomplete a zarovna jeho vysku
        return (
            <div className="x-auto-complete-base">
                <AutoComplete value={inputValue} suggestions={this.state.filteredSuggestions} completeMethod={this.completeMethod} field={this.props.field}
                              onChange={this.onChange} onSelect={this.onSelect} onBlur={this.onBlur} maxlength={this.props.maxlength}
                              ref={this.autoCompleteRef} {...XUtils.createErrorProps(error)}/>
                <SplitButton model={splitButtonItems} className={'x-splitbutton-only-dropdown' + XUtils.mobileCssSuffix()} menuClassName={'x-splitbutton-only-dropdown-menu' + XUtils.mobileCssSuffix()}/>
                {this.props.valueForm != undefined ?
                    <Dialog visible={this.state.formDialogOpened} onHide={this.formDialogOnHide} header={this.formDialogObjectId ? 'Modification' : 'New record'}>
                        {/* klonovanim elementu pridame atributy id, object, onSaveOrCancel */}
                        {React.cloneElement(this.props.valueForm, {
                            id: this.formDialogObjectId, object: this.formDialogInitObjectForInsert, onSaveOrCancel: this.formDialogOnSaveOrCancel
                        }, this.props.valueForm.children)}
                    </Dialog>
                    : undefined}
            </div>
        );
    }
}
