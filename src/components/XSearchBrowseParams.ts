// parametre ktore odovzdavame z XSearchButton do search table a dalej do XLazyDataTable/XDataTable
import {DataTableFilterMetaData} from "primereact/datatable";
import {XFilterOrFunction} from "./XUtils";

export interface XFieldFilter {
    field: string;
    constraint: DataTableFilterMetaData;
}

export interface XSearchBrowseParams {
    onChoose: (chosenRow: any) => void;
    displayFieldFilter?: XFieldFilter; // undefined sposobi ze sa neaplikuje filter - search table zobrazi vsetky mozne hodnoty
    customFilter?: XFilterOrFunction; // zapiseme sem funkciu, ktora vracia XCustomFilter, aby sa ta funkcia volala co najneskor
                                        // - v case otvorenia SearchBrowse, dovod je ten ze funkcia moze citat objekt formulara a ten sa moze v case menit
}
