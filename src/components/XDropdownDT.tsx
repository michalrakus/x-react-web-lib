import {XFormBase} from "./XFormBase";
import React, {useEffect} from "react";
import {XUtils} from "./XUtils";
import {Dropdown} from "primereact/dropdown";
import {XDropdownOptionsMap, XTableFieldReadOnlyProp} from "./XFormDataTable2";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {XCustomFilter} from "../serverApi/FindParam";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export const XDropdownDT = (props: {
        form: XFormBase;
        entity: string;
        assocField: string;
        displayField: string;
        sortField?: string;
        filter?: XCustomFilter;
        dropdownOptionsMap: XDropdownOptionsMap;
        onDropdownOptionsMapChange: (dropdownOptionsMap: XDropdownOptionsMap) => void;
        rowData: any;
        readOnly?: XTableFieldReadOnlyProp;
    }) => {

    // poznamka: nacitanie/ulozenie options je vytiahnute do parent komponentu XFormDataTable koli tomu aby sme nenacitavali options pre kazdy riadok tabulky

    // "members"
    const xAssoc: XAssoc = XUtilsMetadataCommon.getXAssocToOne(XUtilsMetadataCommon.getXEntity(props.entity), props.assocField);
    const idField: string = XUtilsMetadataCommon.getXEntity(xAssoc.entityName).idField;

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

            const xAssoc: XAssoc = XUtilsMetadataCommon.getXAssocToOne(XUtilsMetadataCommon.getXEntity(props.entity), props.assocField);

            //options = await XUtils.fetchMany('findRowsForAssoc', {entity: props.entity, assocField: props.assocField});
            options = await XUtils.fetchRows(xAssoc.entityName, props.filter, props.sortField ?? props.displayField);

            options.splice(0, 0, {[idField]: null, [props.displayField]: ""}); // null polozka (nepridavat pre not null atributy)
            props.dropdownOptionsMap[props.assocField] = options;
            //console.log("XDropdownDT - findOptions - citali sme options pre field = " + props.assocField);
            //console.log(props.dropdownOptionsMap);
            props.onDropdownOptionsMapChange(props.dropdownOptionsMap); // vyrenderujeme nacitane hodnoty
        }
    }

    const onValueChange = (assocField: string, rowData: any, newValue: any) => {

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        let newValueOrNull: any;
        // specialna null polozka ma id === null
        if (newValue[idField] === null) {
            newValueOrNull = null;
        }
        else {
            newValueOrNull = newValue;
        }
        rowData[assocField] = newValueOrNull;
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        props.form.onObjectDataChange();
    }

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

    const readOnly: boolean = XUtils.isReadOnlyTableField(undefined, props.readOnly, props.form.state.object, props.rowData);

    // appendTo={document.body} appenduje overlay panel na element body - eliminuje problem s overflow (pozri poznamku v XDropdownDTFilter)
    return (
        <Dropdown appendTo={document.body} id={props.assocField} optionLabel={props.displayField} value={assocObject} options={options} dataKey={idField}
                  onChange={(e: any) => onValueChange(props.assocField, props.rowData, e.target.value)} readOnly={readOnly} disabled={readOnly}/>
    );
}