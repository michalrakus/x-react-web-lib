import React, {useEffect, useState} from "react";
import {XUtils} from "./XUtils";
import {Dropdown} from "primereact/dropdown";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";

// pouzivany vo filtri v XLazyDataTable aj v XFormDataTable2
export const XDropdownDTFilter = (props: {entity: string; path: string; value: any; onValueChange: (field: string, displayValue: any) => void;}) => {

    const [options, setOptions] = useState<any[]>([]);

    // TODO - upravit tak aby zvladol aj path dlzky 3 a viac
    const fieldList: string[] = XUtilsCommon.getFieldListForPath(props.path);
    if (fieldList.length < 2) {
        throw `XDropdownDTFilter: prop path (${props.path}) must have at least 2 fields`;
    }
    const assocField = fieldList[0];
    const displayField = fieldList[fieldList.length - 1];

    // parameter [] zabezpeci ze sa metoda zavola len po prvom renderingu (a nie po kazdej zmene stavu (zavolani setNieco()))
    useEffect(() => {
        findOptions(props.entity, assocField, displayField);
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const onValueChange = (e: any) => {
        props.onValueChange(props.path, e.target.value);
    }

    const findOptions = async (entity: string, assocField: string, displayField: string) => {
        // TODO - mozno je lepsie uz na klientovi zistit entitu za asociaciou - zatial takto (findRowsForAssoc)
        const options: any[] = await XUtils.fetchMany('findRowsForAssoc', {entity: entity, assocField: assocField});
        const emptyOption: {[field: string]: any;} = {};
        emptyOption[displayField] = XUtils.dropdownEmptyOptionValue;
        options.splice(0, 0, emptyOption); // null polozka (nepridavat pre not null atributy)
        setOptions(options);
    }

    // dropdown pouziva ako optionValue displayField (nie cely objekt) - je to koli problemom s prazdnym riadkom (nepodarilo sa to spravit inac)

    // appendTo={document.body} appenduje overlay panel na element body - panel je vdaka tomu viditelny aj ked ma jeho parent (TH/TD element tabulky)
    // nastavny overflow: hidden, resp. koli scrollovaniu by overlay panel "nevysiel" von z tabulky, v pripade ze je tabulka mala (napr. ma 1 riadok)
    return (
        <Dropdown appendTo={document.body} style={{width: '100%'}} className="ui-column-filter"
                  optionLabel={displayField} optionValue={displayField} value={props.value} options={options} onChange={onValueChange}/>
    );
}