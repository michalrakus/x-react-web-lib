// parametre ktore odovzdavame z XSearchButton do search table a dalej do XLazyDataTable/XDataTable
export interface SearchTableParams {
    onChoose: (chosenRow: any) => void;
    displayField: string;
    filter: string | undefined; // undefined sposobi ze sa neaplikuje filter - search table zobrazi vsetky mozne hodnoty
}
