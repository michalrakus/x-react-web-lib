import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import React, {useEffect} from "react";
import {XUtils} from "./XUtils";
import {Dropdown} from "primereact/dropdown";
import {XDropdownOptionsMap} from "./XFormDataTable2";

export const XDropdownDT = (props: {form: XFormBase<XObject>; entity: string; assocField: string; displayField: string; dropdownOptionsMap: XDropdownOptionsMap; onDropdownOptionsMapChange: (dropdownOptionsMap: XDropdownOptionsMap) => void; rowData: any; readOnly?: boolean}) => {

    // poznamka: nacitanie/ulozenie options je vytiahnute do parent komponentu XFormDataTable koli tomu aby sme nenacitavali options pre kazdy riadok tabulky

    // parameter [] zabezpeci ze sa metoda zavola len po prvom renderingu (a nie po kazdej zmene stavu (zavolani setNieco()))
    useEffect(() => {
        //console.log("XDropdownDT - zavolany useEffect *******************")
        findOptions();
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const findOptions = async () => {

        // nacitame options ak sme ich este nenacitali
        let options: any[] = props.dropdownOptionsMap[props.assocField];

        if (options === undefined) {
            // nacitavanie som dal sem, lebo sa bojim ze ak by som ho dal mimo useEffect (napr. priamo do funkcie bodyTemplate), tak by som koli Promise odsunul vytvaranie komponentov na iny cas a asi by to nebolo dobre

            // Toto je trosku hack - zapisanim prazdneho pola si oznacime, ze ideme nacitat options z DB (stane sa to pri prvom riadku tabulky).
            // Ked potom tento kod zbieha pre dalsie riadky tabulky, tak najdu v props.dropdownOptionsMap[props.assocField] prazdne pole (nie undefined) a uz nevyvolavaju nacitavanie z DB.
            // Nacitanie z DB sa koli asynchronnosti vykona az po zavolani tejto metody pre vsetky riadky tabulky, co je pre nas neskoro.
            // ak by tu tento riadok nebol, tak by sa options nacitavali tolkokrat, kolko je riadkov v tabulke
            props.dropdownOptionsMap[props.assocField] = [];

            options = await XUtils.fetchMany('findRowsForAssoc', {entity: props.entity, assocField: props.assocField});
            options.splice(0, 0, {}); // null polozka (nepridavat pre not null atributy)
            props.dropdownOptionsMap[props.assocField] = options;
            //console.log("XDropdownDT - findOptions - citali sme options pre field = " + props.assocField);
            //console.log(props.dropdownOptionsMap);
            props.onDropdownOptionsMapChange(props.dropdownOptionsMap); // vyrenderujeme nacitane hodnoty
        }
    }

    const readOnly = props.readOnly !== undefined ? props.readOnly : false;

    const onValueChange = (assocField: string, rowData: any, newValue: any) => {

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        let newValueOrNull: any;
        // specialna null polozka nema ziadne atributy
        if (Object.keys(newValue).length === 0) {
            newValueOrNull = null;
        }
        else {
            newValueOrNull = newValue;
        }
        rowData[assocField] = newValueOrNull;
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        props.form.onObjectDataChange();
    }

    // TODO - readOnly implementovat
    // Dropdown setuje do atributu object.assocField asociovany objekt zo zoznamu objektov ktore ziskame podla asociacie

    let assocObject = null;
    if (props.rowData !== null) {
        assocObject = props.rowData[props.assocField];
        //  pri inserte noveho riadku su (zatial) vsetky fieldy undefined, dame na null, null je standard
        if (assocObject === undefined) {
            assocObject = null;
        }
    }
    const options = props.dropdownOptionsMap[props.assocField] !== undefined ? props.dropdownOptionsMap[props.assocField] : []; // mozno mozme do options prasknut rovno undefined...
    return (
        <Dropdown id={props.assocField} optionLabel={props.displayField} value={assocObject} options={options} onChange={(e: any) => onValueChange(props.assocField, props.rowData, e.target.value)}/>
    );
}