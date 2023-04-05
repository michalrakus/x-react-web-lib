// parametre ktore odovzdavame z XSearchButton do search table a dalej do XLazyDataTable/XDataTable
import {DataTableFilterMetaData} from "primereact/datatable";
import {XCustomFilter} from "../serverApi/FindParam";

export interface XFieldFilter {
    field: string;
    constraint: DataTableFilterMetaData;
}

export interface SearchTableParams {
    onChoose: (chosenRow: any) => void;
    displayFieldFilter?: XFieldFilter; // undefined sposobi ze sa neaplikuje filter - search table zobrazi vsetky mozne hodnoty
    customFilter?: XCustomFilter;
}
