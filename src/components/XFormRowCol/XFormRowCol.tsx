import React from "react";
import {XFormBase} from "../XFormBase";
import {XUtils} from "../XUtils";

// the purpose of XFormRow/Col:
// 1a. ak sa jedna o "row", uklada elementy pod seba do riadku (pouziva flex a jeho defaultny flex-direction: row)
// 1b. ak sa jedna o "col", uklada elementy pod seba do stlpca (default spravanie HTML elementov)
// 2. pridava properties-y do svojich child elementov (nemusime rozpisovat property do vsetkych child elementov)
// ak je property definovany na XFormCol aj na child-e, tak vyssiu prio ma property na child-e
export interface XFormRowColProps {
    className: "x-form-row" | "x-form-inline-row" | "x-form-col";
    form?: XFormBase; // toto sa zatial neda pouzit, lebo form je povinny atribut na komponentoch a pouziva sa uz v konstruktore, ktovie ci by to vobec zafungovalo
    width?: string | "full"; // nastavi css property {width: <props.width>} na div (full nastavuje 100%)
    labelStyle?: React.CSSProperties;
    style?: React.CSSProperties; // prenesie sa na div
    children: JSX.Element | JSX.Element[];
}

export const XFormRowCol = (props: XFormRowColProps) => {

    let childElemList: JSX.Element | JSX.Element[];
    if (props.form || props.labelStyle) {
        // ak chceme zmenit child element, tak treba bud vytvorit novy alebo vyklonovat
        // priklad je na https://soshace.com/building-react-components-using-children-props-and-context-api/
        childElemList = React.Children.map(
            props.children,
            child => {
                // chceli by sme klonovat len nase X* komponenty (napr. XInputText)
                // ak vyklonujeme cudziu komponentu (napr. div), funguje, ale prida do nej property labelstyle=[object Object]
                // child.type.name vracia nazov komponenty (napr. XInputText) ale ked sa vytvori optimalizovany build, uz to nefunguje (uz je tam napr. "t")
                // takze zatial klonujeme vzdy

                //if (child.type.name && child.type.name.startsWith("X")) {
                    return React.cloneElement(child, {form: child.props.form ?? props.form, labelStyle: child.props.labelStyle ?? props.labelStyle});
                //}
                //else {
                //    return child;
                //}
            }
        );
    }
    else {
        childElemList = props.children; // netreba klonovat - viac menej koli performance
    }

    let style: React.CSSProperties | undefined = props.style;
    if (props.width) {
        style = style ?? {};
        const width: string = (props.width === 'full' ? '100%' : props.width);
        XUtils.addCssPropIfNotExists(style, {width: width}); // props.style ma vyssiu prioritu ako props.width
    }

    return <div className={props.className} style={style}>{childElemList}</div>;
}

