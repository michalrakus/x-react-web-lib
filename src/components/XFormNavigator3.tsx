import React, {Component} from "react";

export interface XFormNavigator3Props {
    initFormElement?: any;
}

export class XFormNavigator3 extends Component<XFormNavigator3Props> {

    state: {formElements: any[];};

    constructor(props: XFormNavigator3Props) {
        super(props);
        this.state = {
            formElements: (props.initFormElement !== undefined ? [props.initFormElement] : [])
        };
        this.onOpenForm = this.onOpenForm.bind(this);
    }

    openRootForm(newFormElement: any): void {
        // otvori uplne novy form (napr. CarBrowse kliknuty v menu)
        const formElements = (newFormElement !== null ? [newFormElement] : []);
        this.setState({formElements: formElements});
    }

    onOpenForm(newFormElement: any): void {
        console.log("zavolany XFormNavigator3.onOpenForm");
        //console.log(newFormElement);

        // vzdy treba vytvorit novy objekt a ten set-nut do stavu, ak len pridame prvok do pola, tak react nevyvola render!
        // shallow copy klonovanie (vytvara sa kopia referencii)
        const formElementsCloned: any[] = this.state.formElements.slice();

        if (newFormElement !== null) {
            formElementsCloned.push(newFormElement);
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

        this.setState({formElements: formElementsCloned});
    }

    render() {
        const formElements = this.state.formElements;
        const forms = formElements.map((formElement, index) => {
                const displayed: boolean = (index === formElements.length - 1);
                // klonovanim elementu pridame atribut onExitForm={onOpenForm} (nemusime tento atribut pridavat pri vytvarani elementu)
                const formElementCloned = React.cloneElement(formElement, {onExitForm: this.onOpenForm, displayed: displayed}, formElement.children)
                // prvych n - 1 komponentov skryjeme cez display: "none" a az posledny vyrenderujeme naozaj (cez display: "block")
                // TODO - do buducnosti - ak nechceme drzat stav componentu cez display: "none", staci vratit null (komponent vobec nevyrenderujeme)
                const display: string = (displayed ? "block" : "none");
                // TODO - neviem ci naisto treba key={index}
                return <div key={index} style={{display: display}}>{formElementCloned}</div>;
            }
        );
        return (
            <div>
                {forms}
            </div>
        );
    }
}
