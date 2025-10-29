import React, {Component, ReactElement, RefObject} from "react";
import {XFormBase} from "./XFormBase";

// helper
interface XFormElement {
    elem: ReactElement;
    xElemRef: RefObject<unknown>;
}

export interface XFormNavigator3Props {
    rootFormElement?: ReactElement;
}

/**
 * @deprecated use opening form in dialogs instead
 */
export class XFormNavigator3 extends Component<XFormNavigator3Props> {

    // formElements after rootFormElement
    state: {formElements: XFormElement[];};

    // not nice but but I want to avoid deep refactoring...
    xRootElemRef: RefObject<unknown>;

    constructor(props: XFormNavigator3Props) {
        super(props);
        this.state = {
            formElements: []
        };

        this.xRootElemRef = React.createRef();

        this.openForm = this.openForm.bind(this);
    }

    openForm(newFormElement: ReactElement | null): void {
        //console.log("zavolany XFormNavigator3.openForm");
        //console.log(newFormElement);

        // vzdy treba vytvorit novy objekt a ten set-nut do stavu, ak len pridame prvok do pola, tak react nevyvola render!
        // shallow copy klonovanie (vytvara sa kopia referencii)
        const formElementsCloned: XFormElement[] = this.state.formElements.slice();

        if (newFormElement !== null) {
            formElementsCloned.push({elem: newFormElement, xElemRef: React.createRef()});
        }
        else {
            // user stlacil cancel/back - vratime sa na predchadzajuci formular
            // vyhodime posledny element
            if (formElementsCloned.length > 0) {
                formElementsCloned.pop();
            }
            else {
                console.log("neocakavana chyba - pole formElements je prazdne");
            }
        }

        this.setState({formElements: formElementsCloned}, () => {
            // ked sa na mobile preklikavame medzi formularmi, tak browser drzi nascrollovanu poziciu ale my sa chceme vratit na zaciatok stranky
            // (tento callback sa zavola po refreshnuti stranky)

            // taketo nieco nezafungovalo, neviem preco...
            // setTimeout(function() {
            //     window.scrollTo(0,0);
            // }, 100);

            // tak scrollujeme k menu, ktore je v hornej casti
            const menuElem = document.getElementById("menuId")
            if (menuElem !== null) {
                menuElem.scrollIntoView();
            }
        });
    }

    // API function - returns false if cancel was stopped (not confirmed) by user
    cancelFormEdit(): boolean {
        const formElements: XFormElement[] = this.getAllFormElements();
        // slice makes a copy
        for (const formElement of formElements.slice().reverse()) {
            if (this.isXFormBase(formElement.elem)) {
                if (!((formElement.xElemRef as RefObject<XFormBase>).current!.cancelEdit())) {
                    return false;
                }
            }
        }
        return true;
    }

    isXFormBase(elem: ReactElement): boolean {
        const type = elem.type;

        // only class components have prototype.isReactComponent
        return (
            typeof type === "function" &&
            type.prototype &&
            type.prototype.isReactComponent &&
            type.prototype instanceof XFormBase);
    }

    // helper returning all elems including root elem
    getAllFormElements(): XFormElement[] {
        // rootFormElement can be undefined at the start of app (no form displayed)
        return this.props.rootFormElement ? [{elem: this.props.rootFormElement, xElemRef: this.xRootElemRef}, ...this.state.formElements] : this.state.formElements;
    }

    render() {
        const formElements: XFormElement[] = this.getAllFormElements();
        const forms = formElements.map((formElement, index) => {
                const displayed: boolean = (index === formElements.length - 1);
                // klonovanim elementu pridame atribut openForm={this.openForm} (nemusime tento atribut pridavat pri vytvarani elementu)
                const formElementCloned = React.cloneElement(formElement.elem, {ref: formElement.xElemRef, openForm: this.openForm, displayed: displayed}/*, (formElement as any).children*/);
                // prvych n - 1 komponentov skryjeme cez display: "none" a az posledny vyrenderujeme naozaj (cez display: "block")
                // TODO - do buducnosti - ak nechceme drzat stav componentu cez display: "none", staci vratit null (komponent vobec nevyrenderujeme)
                const display: string = (displayed ? "block" : "none");
                // TODO - neviem ci naisto treba key={index}
                // max-width: 100% - koli chybe ked sa na mobile nezobrazovala lava cast tabulky/formularu (nedalo sa k nej doscrollovat)
                // poznamka2: tento problem sa vyskytoval v suvislosti s flex-direction: column na .App-form - ten sme zrusili a preto maxWidth (zatial) odstranujeme
                return <div key={index} style={{display: display /*, maxWidth: "100%"*/}}>{formElementCloned}</div>;
            }
        );
        return (
            <div className="App-form">
                {forms}
            </div>
        );
    }
}
