import React, {useState, useEffect, useRef, ReactChild} from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import {XButton} from "./XButton";
import {XUtils} from "./XUtils";
import {SearchTableParams} from "./SearchTableParams";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XDropdownDTFilter} from "./XDropdownDTFilter";
import {XEntity, XField} from "../serverApi/XEntityMetadata";
import {dateAsUI, datetimeAsUI, numberAsUI} from "./XUtilsConversions";
import {FindResult} from "../serverApi/FindResult";
import {Filters, FilterValue, FindParam, SortMeta} from "../serverApi/FindParam";

export const XLazyDataTable = (props: {entity: string; dataKey?: string; rows?: number; onAddRow?: () => void; onEdit?: (selectedRow: any) => void; removeRow?: boolean; searchTableParams?: SearchTableParams; displayed?: boolean; children: ReactChild[];}) => {

    const dataTableEl = useRef<any>(null);
    const [value, setValue] = useState<FindResult>({rowList: [], totalRecords: 0});
    const [loading, setLoading] = useState(false);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(props.rows !== undefined ? props.rows : 10);
    let filtersInit: Filters = {};
    if (props.searchTableParams !== undefined && props.searchTableParams.filter !== undefined) {
        filtersInit[props.searchTableParams.displayField] = {value: props.searchTableParams.filter, matchMode: "startsWith"};
    }
    const [filters, setFilters] = useState<Filters>(filtersInit); // filtrovanie na "controlled manner" (moze sa sem nainicializovat nejaka hodnota)
    const [multiSortMeta, setMultiSortMeta] = useState<SortMeta[]>([]);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [dataLoaded, setDataLoaded] = useState<boolean>(false); // priznak kde si zapiseme, ci uz sme nacitali data

    // parameter [] zabezpeci ze sa metoda zavola len po prvom renderingu (a nie po kazdej zmene stavu (zavolani setNieco()))
    useEffect(() => {
        // jednoduchy sposob - nepouzivame parameter props.displayed a priznak dataLoaded
        if (props.displayed === undefined) {
            loadData();
            console.log("XLazyDataTable - data loaded (simple)");
        }
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // sposob pozivany pri XFormNavigator (potrebujeme refreshnut data pri navrate z formulara)
        if (props.displayed !== undefined) {
            if (props.displayed) {
                if (!dataLoaded) {
                    loadData();
                    console.log("XLazyDataTable - data loaded (used displayed)");
                    setDataLoaded(true);
                }
            }
            else {
                // dataTable je skryta - ked sa na nu vratime, chceme mat priznak dataLoaded nastaveny na false, aby sme videli cerstve data
                if (dataLoaded) {
                    setDataLoaded(false);
                }
            }
        }
    }); // eslint-disable-line react-hooks/exhaustive-deps

    const dataKey = props.dataKey !== undefined ? props.dataKey : XUtilsMetadata.getXEntity(props.entity).idField;

    const onPage = async (event: any) => {

        console.log("zavolany onPage");

        setFirst(event.first);
        loadDataBase({first: event.first, rows: rows, filters: filters, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields()});
    }

    const onFilter = (event: any) => {

        console.log("zavolany onFilter - this.state.filters = " + JSON.stringify(filters));
        console.log("zavolany onFilter - event.filters = " + JSON.stringify(event.filters));

        // tymto zavolanim sa zapise znak zapisany klavesnicou do inputu filtra (ak prikaz zakomentujeme, input filtra zostane prazdny)
        setFilters(event.filters);
    }

    const onSort = (event: any) => {

        console.log("zavolany onSort - this.state.multiSortMeta = " + JSON.stringify(multiSortMeta));
        console.log("zavolany onSort - event.multiSortMeta = " + JSON.stringify(event.multiSortMeta));

        setMultiSortMeta(event.multiSortMeta);
        loadDataBase({first: first, rows: rows, filters: filters, multiSortMeta: event.multiSortMeta, entity: props.entity, fields: getFields()});
    }

    const onClickFilter = () => {

        console.log("zavolany onClickFilter");

        loadData();
    };

    const loadData = () => {
        loadDataBase({first: first, rows: rows, filters: filters, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields()});
    }

    const loadDataBase = async (findParam: FindParam) => {
        console.log("zavolany loadDataBase - startIndex = " + findParam.first + ", endIndex = " + (findParam.first + findParam.rows) + ", filters = " + JSON.stringify(findParam.filters) + ", multiSortMeta = " + JSON.stringify(findParam.multiSortMeta) + ", fields = " + JSON.stringify(findParam.fields));
        setLoading(true);
        const findResult = await findByFilter(findParam);
        setValue(findResult);
        setLoading(false);
    }

    const findByFilter = async (findParam: FindParam) : Promise<FindResult> => {

        // vysledok je typu FindResult
        const {rowList, totalRecords} : {rowList: any[], totalRecords: string} = await XUtils.fetchOne('lazyDataTableFindRows', findParam);
        return {rowList: rowList, totalRecords: parseInt(totalRecords)};
    }

    const getFields = () => {

        // krasne zobrazi cely objekt!
        //console.log(dataTableEl.current);

        let fields = [];
        let columns = dataTableEl.current.props.children;
        for (let column of columns) {
            fields.push(column.props.field);
        }
        return fields;
    }

    const onSelectionChange = (event: any) => {
        console.log("zavolany onSelectionChange");
        console.log(event.value);

        setSelectedRow(event.value);
    }

    const onRowDoubleClick = (event: any) => {
        console.log("zavolany onRowDoubleClick");
        console.log(event.data);

        if (props.onEdit !== undefined) {
            props.onEdit(event.data);
        }
        else if (props.searchTableParams !== undefined) {
            props.searchTableParams.onChoose(event.data);
        }
    }

    const onClickAddRow = () => {
        console.log("zavolany onClickAddRow");

        if (props.onAddRow !== undefined) {
            props.onAddRow();
        }
    }

    const onClickEdit = () => {
        console.log("zavolany onClickEdit");

        if (selectedRow !== null) {
            if (props.onEdit !== undefined) {
                props.onEdit(selectedRow);
            }
        }
        else {
            alert("Please select the row.");
        }
    }

    const onClickRemoveRow = async () => {
        console.log("zavolany onClickRemoveRow");

        if (selectedRow !== null) {
            // zatial nemame moznost override-nut
            //if (props.onRemoveRow !== undefined) {
            //    props.onRemoveRow(selectedRow);
            //}
            if (window.confirm('Are you sure to remove the selected row?')) {
                // poznamka: vdaka await bude loadData() bezat az po dobehnuti requestu removeRow
                await XUtils.removeRow(props.entity, selectedRow);
                loadData();
            }
        }
        else {
            alert("Please select the row.");
        }
    }

    const onClickChoose = () => {
        console.log("zavolany onClickChoose");

        if (selectedRow !== null) {
            if (props.searchTableParams !== undefined) {
                props.searchTableParams.onChoose(selectedRow);
            }
        }
        else {
            console.log("Nie je vyselectovany ziaden zaznam.");
        }
    }

    const onDropdownFilterChange = (field: string, displayValue: any) => {
        // TODO - treba vyklonovat?
        const filtersCloned: Filters = {...filters};
        if (displayValue !== XUtils.dropdownEmptyOptionValue) {
            filtersCloned[field] = {value: displayValue, matchMode: "equals"};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny riadok), zrusime polozku z filtra
            delete filtersCloned[field];
        }
        setFilters(filtersCloned);
    }

    const getDropdownFilterValue = (field: string) : any => {
        let dropdownValue: any = XUtils.dropdownEmptyOptionValue;
        const filterValue: FilterValue = filters[field];
        if (filterValue !== undefined && filterValue !== null) {
            dropdownValue = filterValue.value;
        }
        return dropdownValue;
    }

    const bodyTemplate = (columnProps: XLazyColumnProps, rowData: any, xField: XField): any => {
        const rowDataValue = XUtils.getValueByPath(rowData, columnProps.field);
        let bodyValue: string = '';
        if (xField.type === "decimal") {
            // tuto zatial hack, mal by vzdy prist number
            let numberValue: number | null = null;
            if (typeof rowDataValue === 'string') {
                numberValue = parseFloat(rowDataValue);
            }
            else if (typeof rowDataValue === 'number') {
                numberValue = rowDataValue;
            }
            bodyValue = numberAsUI(numberValue, xField.scale);
        }
        else if (xField.type === "date") {
            // tuto zatial hack, mal by prist Date
            let dateValue: Date | null = null;
            if (typeof rowDataValue === 'string') {
                dateValue = new Date(rowDataValue);
            }
            else if (typeof rowDataValue === 'object' && rowDataValue instanceof Date) {
                dateValue = rowDataValue;
            }
            bodyValue = dateAsUI(dateValue);
        }
        else if (xField.type === "datetime") {
            // tuto zatial hack, mal by prist Date
            let dateValue: Date | null = null;
            if (typeof rowDataValue === 'string') {
                dateValue = new Date(rowDataValue);
            }
            else if (typeof rowDataValue === 'object' && rowDataValue instanceof Date) {
                dateValue = rowDataValue;
            }
            bodyValue = datetimeAsUI(dateValue);
        }
        return bodyValue;
    }

    const xEntity: XEntity = XUtilsMetadata.getXEntity(props.entity);

    return (
        <div>
            <XButton label="Filter" onClick={onClickFilter} />
            <DataTable value={value.rowList} dataKey={dataKey} paginator={true} rows={rows} totalRecords={value.totalRecords}
                       lazy={true} first={first} onPage={onPage} loading={loading}
                       filters={filters} onFilter={onFilter}
                       sortMode="multiple" removableSort={true} multiSortMeta={multiSortMeta} onSort={onSort}
                       selectionMode="single" selection={selectedRow} onSelectionChange={onSelectionChange}
                       onRowDoubleClick={onRowDoubleClick}
                       ref={dataTableEl}>
                {React.Children.map(
                    props.children,
                    function(child) {
                        // ak chceme zmenit child element, tak treba bud vytvorit novy alebo vyklonovat
                        // priklad je na https://soshace.com/building-react-components-using-children-props-and-context-api/
                        // (vzdy musime robit manipulacie so stlpcom, lebo potrebujeme pridat filter={true} sortable={true}
                        const childColumn = child as any as {props: XLazyColumnProps}; // nevedel som to krajsie...
                        const xField: XField = XUtilsMetadata.getXFieldByPath(xEntity, childColumn.props.field);

                        // *********** header ***********
                        const header = childColumn.props.header !== undefined ? childColumn.props.header : childColumn.props.field;

                        // *********** filterElement ***********
                        let filterElement;
                        if (childColumn.props.dropdownInFilter) {
                            const dropdownValue = getDropdownFilterValue(childColumn.props.field);
                            filterElement = <XDropdownDTFilter entity={props.entity} path={childColumn.props.field} value={dropdownValue} onValueChange={onDropdownFilterChange}/>
                        }

                        // *********** body ***********
                        // TODO - mozno by bolo dobre vytvarat body pre kazdy field, nech je to vsetko konzistentne
                        let body;
                        if (xField.type === "decimal" || xField.type === "date" || xField.type === "datetime") {
                            body = (rowData: any) => {return bodyTemplate(childColumn.props, rowData, xField);};
                        }

                        // *********** align ***********
                        let align = "left"; // default
                        if (childColumn.props.align !== undefined) {
                            align = childColumn.props.align;
                        }
                        else {
                            // decimal defaultne zarovnavame doprava
                            if (xField.type === "decimal") {
                                align = "right";
                            }
                        }

                        // *********** style ***********
                        let style;
                        // TODO - pouzit className a nie style
                        if (align === "center" || align === "right") {
                            style = {'text-align': align};
                        }

                        return <Column field={childColumn.props.field} header={header} filter={true} sortable={true}
                                       filterElement={filterElement} body={body} style={style}/>;
                    }
                )}
            </DataTable>
            {props.onAddRow !== undefined ? <XButton label="Add row" onClick={onClickAddRow}/> : null}
            {props.onEdit !== undefined ? <XButton label="Edit" onClick={onClickEdit}/> : null}
            {props.removeRow === true ? <XButton label="Remove row" onClick={onClickRemoveRow}/> : null}
            {props.searchTableParams !== undefined ? <XButton label="Choose" onClick={onClickChoose}/> : null}
        </div>
    );
}

export interface XLazyColumnProps {
    field: string;
    header?: any;
    align?: "left" | "center" | "right";
    dropdownInFilter?: boolean;
}

// TODO - XLazyColumn neni idealny nazov, lepsi je XColumn (ale zatial nechame XLazyColumn)
export const XLazyColumn = (props: XLazyColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}
