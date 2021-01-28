import React, {useEffect, useState} from "react";
import {XUtils} from "./XUtils";
import {Dropdown} from "primereact/dropdown";
import {XFormDataTable2} from "./XFormDataTable2";

// stary nepouzivany Dropdown do filtra
export const XDropdownFormDTFilter = (props: {dataTable: XFormDataTable2; assocField: string; displayField: string;}) => {

    // TODO - pridat cez generikum typ objektu v Dropdown-e (ak sa da)
    const [value, setValue] = useState<any>(null);
    const [options, setOptions] = useState<any[]>([]);

    // parameter [] zabezpeci ze sa metoda zavola len po prvom renderingu (a nie po kazdej zmene stavu (zavolani setNieco()))
    useEffect(() => {
        findOptions(props.dataTable.getEntity(), props.assocField);
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const onValueChange = (e: any) => {
        let newValueOrNull: any;
        // specialna null polozka nema ziadne atributy
        if (Object.keys(e.target.value).length === 0) {
            newValueOrNull = null;
        }
        else {
            newValueOrNull = e.target.value;
        }
        setValue(newValueOrNull);
        const newValueFilter = newValueOrNull !== null ? newValueOrNull[props.displayField] : null;
        // tato metoda zapisuje (aj rusi) podmienku do zoznamu "filters" v DataTable (pravdepodobne vola setFilters a tym zaroven vyvola filtrovanie)
        props.dataTable.dt.filter(newValueFilter, props.assocField + '.' + props.displayField, 'equals');
    }

    const findOptions = async (entity: string, assocField: string) => {
        // TODO - mozno je lepsie uz na klientovi zistit entitu za asociaciou - zatial takto (findRowsForAssoc)
        const options: any[] = await XUtils.fetchMany('findRowsForAssoc', {entity: entity, assocField: assocField});
        options.splice(0, 0, {}); // null polozka (nepridavat pre not null atributy)
        setOptions(options);
    }

    // Dropdown setuje do atributu object.assocField asociovany objekt zo zoznamu objektov ktore ziskame podla asociacie

    return (
        <Dropdown style={{width: '100%'}} className="ui-column-filter"
                  optionLabel={props.displayField} value={value} options={options} onChange={onValueChange}/>
    );
}