import React, {useEffect, useState} from "react";
import {XUtils} from "./XUtils";
import {Dropdown} from "primereact/dropdown";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {XAssoc, XField} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";
import {XFilterProp} from "./XFormComponent";
import {XCustomFilter} from "../serverApi/FindParam";

// pouzivany vo filtri v XLazyDataTable aj v XFormDataTable2
export const XDropdownDTFilter = (props: {entity: string; path: string; value: any; onValueChange: (field: string, displayValue: any) => void; filter?: XCustomFilter; sortField?: string;}) => {

    const [options, setOptions] = useState<any[]>([]);

    const fieldList: string[] = XUtilsCommon.getFieldListForPath(props.path);
    if (fieldList.length < 2) {
        throw `XDropdownDTFilter: prop path (${props.path}) must have at least 2 items`;
    }
    const displayField = fieldList[fieldList.length - 1];

    // parameter [] zabezpeci ze sa metoda zavola len po prvom renderingu (a nie po kazdej zmene stavu (zavolani setNieco()))
    useEffect(() => {
        findOptions(props.entity, props.path, displayField);
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const onValueChange = (e: any) => {
        props.onValueChange(props.path, e.target.value);
    }

    const findOptions = async (entity: string, path: string, displayField: string) => {
        const xAssoc: XAssoc = XUtilsMetadataCommon.getLastXAssocByPath(XUtilsMetadataCommon.getXEntity(entity), path);
        const options: any[] = await XUtils.fetchRows(xAssoc.entityName, props.filter, props.sortField ?? displayField);
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