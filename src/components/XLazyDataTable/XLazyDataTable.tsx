import React, {ReactChild, useEffect, useRef, useState} from 'react';
import {
    DataTable,
    DataTableFilterMeta,
    DataTableFilterMetaData,
    DataTableOperatorFilterMetaData,
    DataTableSortMeta
} from 'primereact/datatable';
import {Column, ColumnBodyOptions, ColumnFilterElementTemplateOptions} from 'primereact/column';
import {XButton} from "../XButton";
import {OperationType, XUtils, XViewStatus, XViewStatusOrBoolean} from "../XUtils";
import {XFieldFilter, XSearchBrowseParams} from "../XSearchBrowseParams";
import {XUtilsMetadata} from "../XUtilsMetadata";
import {XDropdownDTFilter} from "../XDropdownDTFilter";
import {XEntity, XField} from "../../serverApi/XEntityMetadata";
import {AsUIType, convertValue, numberAsUI, numberFromModel} from "../../serverApi/XUtilsConversions";
import {FindResult} from "../../serverApi/FindResult";
import {
    FindParam,
    ResultType,
    XAggregateItem,
    XAggregateType,
    XCustomFilter,
    XCustomFilterItem,
    XFullTextSearch
} from "../../serverApi/FindParam";
import {XButtonIconSmall} from "../XButtonIconSmall";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {XUtilsCommon} from "../../serverApi/XUtilsCommon";
import {LazyDataTableQueryParam} from "../../serverApi/ExportImportParam";
import {XExportParams, XExportRowsDialog} from "./XExportRowsDialog";
import {FilterMatchMode, FilterOperator} from "primereact/api";
import {XOnSaveOrCancelProp} from "../XFormBase";
import {XCalendar} from "../XCalendar";
import {XInputDecimalBase} from "../XInputDecimalBase";
import {xLocaleOption} from "../XLocale";
import {XFtsInput, XFtsInputValue} from "../XFtsInput";
import {XUtilsMetadataCommon} from "../../serverApi/XUtilsMetadataCommon";
import {IconType} from "primereact/utils";
import {ButtonProps} from "primereact/button";
import {Editor} from "primereact/editor";
import {XMultilineSwitch} from "./XMultilineSwitch";
import {XMultilineRenderer} from "./XMultilineRenderer";
import {XHtmlRenderer} from "./XHtmlRenderer";
import {Dropdown} from "primereact/dropdown";
import {XOcfDropdown} from "./XOcfDropdown";

export type XBetweenFilterProp = "row" | "column" | undefined;
export type XMultilineRenderType = "singleLine" | "fewLines" | "allLines";

export interface XAppButtonForRow {
    key?: string;
    icon?: IconType<ButtonProps>;
    label: string;
    onClick: (selectedRow: any) => void;
}

export interface XOptionalCustomFilter {
    label: string;
    filter: XCustomFilter;
}

export interface XEditModeHandlers {
    onStart: () => void;
    onSave: () => void;
    onCancel: () => void;
    onAddColumn: (field: string) => void;
    onEditColumn: (field: string) => void;
    onRemoveColumn: (field: string) => void;
    onMoveColumnLeft: (field: string) => void;
    onMoveColumnRight: (field: string) => void;
}

// specialne propertiesy ktore su k dispozicii v komponentach <entity>Browse
// displayed a openForm pridava XFormNavigator3
// searchBrowseParams pridava XSearchButton
// propertiesy displayed a searchBrowseParams sa (manualne) prenasaju do XLazyDataTable (cisto technicke zalezitosti)
// property openForm sa pouziva na otvorenie dalsieho "podformulara", velmi casto <entity>Form (odtial sa potom zavolanim openForm(null) vraciame naspet do <entity>Browse)
// ak chceme pouzit ten isty <entity>Browse ako klasicky Browse aj ako SearchBrowse, treba pouzit typ (props: XBrowseProps & XSearchBrowseProps) - zjednotenie propertiesov

export interface XBrowseProps {
    displayed?: boolean;
    openForm?: (newFormElement: JSX.Element | null) => void;
}

export interface XSearchBrowseProps {
    searchBrowseParams?: XSearchBrowseParams;
}

export interface XLazyDataTableProps {
    entity: string;
    dataKey?: string;
    paginator: boolean;
    rows: number;
    filterDisplay: "menu" | "row";
    betweenFilter?: XBetweenFilterProp, // umiestnenie inputov od do: "row" - vedla seba, "column" - pod sebou; plati pre vsetky stlpce typu date/datetime/decimal/number ak nemaju definovany svoj betweenFilter
    scrollable: boolean; // default true, ak je false, tak je scrollovanie vypnute (scrollWidth/scrollHeight/formFooterHeight su ignorovane)
    scrollWidth: string; // hodnota "none" vypne horizontalne scrollovanie
    scrollHeight: string; // hodnota "none" vypne vertikalne scrollovanie
    formFooterHeight?: string; // pouziva sa (zatial) len pri deme - zadava sa sem vyska linkov na zdrojaky (SourceCodeLinkForm, SourceCodeLinkEntity) aby ich bolo vidno pri automatickom vypocte vysky tabulky
    shrinkWidth: boolean; // default true - ak je true, nerozsiruje stlpce na viac ako je ich explicitna sirka (nevznikaju "siroke" tabulky na celu dlzku parent elementu)
    onAddRow?: () => void;
    onEdit?: (selectedRow: any) => void;
    removeRow?: ((selectedRow: any) => Promise<boolean>) | boolean;
    onRemoveRow?: XOnSaveOrCancelProp;
    appButtonsForRow?: XAppButtonForRow[]; // do funkcii tychto buttonov sa posiela vyselectovany row
    appButtons?: any; // vseobecne buttons (netreba im poslat vyselectovany row) - mozno by sa mali volat appButtonsGeneral
    filters?: DataTableFilterMeta; // pouzivatelsky filter
    customFilter?: XCustomFilter; // (programatorsky) filter ktory sa aplikuje na zobrazovane data (uzivatel ho nedokaze zmenit)
    optionalCustomFilters?: XOptionalCustomFilter[]; // programatorom predpripravene filtre, user si moze vybrat predpripraveny filter v dropdown-e vedla Filter/Clear buttonov
    sortField?: string | DataTableSortMeta[];
    fullTextSearch: boolean | string[]; // false - nemame full-text search, true - mame full-text search na default stlpcoch, string[] - full-text search na danych stlpcoch
    fields?: string[]; // ak chceme nacitat aj asociovane objekty mimo tych ktore sa nacitavaju koli niektoremu zo stlpcov
    multilineSwitch: boolean; // default false, ak true tak zobrazi switch, ktorym sa da vypnut zobrazenie viacriadkovych textov v sirokom riadku
    multilineSwitchInitValue: XMultilineRenderType; // default "allLines"
    multilineSwitchFewLinesCount: number; // max count of rendered lines for render type "fewLines" (default 2)
    searchBrowseParams?: XSearchBrowseParams;
    width?: string; // neviem ako funguje (najme pri pouziti scrollWidth/scrollHeight), ani sa zatial nikde nepouziva
    rowClassName?: (data: any) => object | string | undefined;
    // ak chceme zavolat reload zaznamov, treba vytiahnut "const [dataLoaded, setDataLoaded] = useState<boolean>(false);" do browse komponentu a zavolat setDataLoaded(false);
    dataLoadedState?: [boolean, React.Dispatch<React.SetStateAction<boolean>>]; // TODO - specialny typ vytvor, napr. XuseState<boolean>
    exportFieldsToDuplicateValues?: string[]; // zoznam fieldov (stlpcov), hodnoty v tychto stlpcoch sa budu duplikovat v pripade ak je row viacriadkovy koli toMany asociaciam
                                            // krajsie by bolo priamo tieto stlpce oznacit nejakou {true} properties ale nechce sa mi do toho tolko investovat
                                            // je to koli nejakym kontingencnym tabulkam v exceli ktore to potrebuju
    editMode?: boolean;
    editModeHandlers?: XEditModeHandlers;
    displayed?: boolean;
    children: ReactChild[];
}

export const XLazyDataTable = (props: XLazyDataTableProps) => {

    // must be here, is used in createInitFilters()
    const xEntity: XEntity = XUtilsMetadataCommon.getXEntity(props.entity);

    const createAggregateItems = (): XAggregateItem[] => {

        let aggregateItems: XAggregateItem[] = [];

        let columns = props.children;
        for (let column of columns) {
            const xLazyColumn = column as {props: XLazyColumnProps}; // nevedel som to krajsie...
            if (xLazyColumn.props.aggregateType) {
                aggregateItems.push({field: xLazyColumn.props.field, aggregateType: xLazyColumn.props.aggregateType});
            }
        }

        return aggregateItems;
    }

    const createInitFilters = () : DataTableFilterMeta => {

        const initFilters: DataTableFilterMeta = {};

        //let columns = dataTableEl.current.props.children; - does not work
        let columns = props.children;
        for (let column of columns) {
            const xLazyColumn = column as {props: XLazyColumnProps}; // nevedel som to krajsie...
            const field: string = xLazyColumn.props.field;
            const xField: XField = XUtilsMetadataCommon.getXFieldByPath(xEntity, field);
            // TODO column.props.dropdownInFilter - pre "menu" by bolo fajn mat zoznam "enumov"
            const filterMatchMode: FilterMatchMode = getFilterMatchMode(xField);
            initFilters[field] = createFilterItem(props.filterDisplay, {value: null, matchMode: filterMatchMode});
        }

        return initFilters;
    }

    const getFilterMatchMode = (xField: XField) : FilterMatchMode => {
        let filterMatchMode: FilterMatchMode;
        if (xField.type === "string") {
            filterMatchMode = FilterMatchMode.CONTAINS;
        }
        // zatial vsetky ostatne EQUALS
        else if (xField.type === "decimal" || xField.type === "number" || xField.type === "date" || xField.type === "datetime" || xField.type === "boolean") {
            filterMatchMode = FilterMatchMode.EQUALS;
        }
        else {
            throw `XField ${xField.name}: unknown xField.type = ${xField.type}`;
        }

        return filterMatchMode;
    }

    const createFilterItem = (filterDisplay: "menu" | "row", constraint: DataTableFilterMetaData): DataTableFilterMetaData | DataTableOperatorFilterMetaData => {
        let filterItem: DataTableFilterMetaData | DataTableOperatorFilterMetaData;
        if (filterDisplay === "menu") {
            // DataTableOperatorFilterMetaData: operator + filter values
            filterItem = {
                operator: FilterOperator.OR, // default
                constraints: [constraint]
            };
        }
        else {
            // props.filterDisplay === "row"
            // DataTableFilterMetaData: filter value
            filterItem = constraint;
        }
        return filterItem;
    }

    const createInitFtsInputValue = (): XFtsInputValue => {
        return {value: null, matchMode: "contains"};
    }

    // premenne platne pre cely component (obdoba member premennych v class-e)
    const dataTableEl = useRef<any>(null);
    let customFilterItems: XCustomFilterItem[] | undefined = XUtils.createCustomFilterItems(props.customFilter);
    let aggregateItems: XAggregateItem[] = createAggregateItems();

    const [value, setValue] = useState<FindResult>({rowList: [], totalRecords: 0, aggregateValues: []});
    const [loading, setLoading] = useState(false);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(props.paginator ? props.rows : undefined);
    let filtersInit: DataTableFilterMeta = createInitFilters();
    if (props.filters) {
        filtersInit = {...filtersInit, ...props.filters}; // items from props.filters will replace existing items in filtersInit
    }
    if (props.searchBrowseParams !== undefined) {
        const displayFieldFilter: XFieldFilter | undefined = props.searchBrowseParams.displayFieldFilter;
        if (displayFieldFilter !== undefined) {
            filtersInit[displayFieldFilter.field] = createFilterItem(props.filterDisplay, displayFieldFilter.constraint);
        }
        // ak mame props.searchBrowseParams.customFilterFunction, pridame filter
        if (props.searchBrowseParams.customFilter) {
            customFilterItems = XUtils.filterAnd(customFilterItems, XUtils.evalFilter(props.searchBrowseParams.customFilter));
        }
    }
    const [filters, setFilters] = useState<DataTableFilterMeta>(filtersInit); // filtrovanie na "controlled manner" (moze sa sem nainicializovat nejaka hodnota)
    const initFtsInputValue: XFtsInputValue | undefined = props.fullTextSearch ? createInitFtsInputValue() : undefined;
    const [ftsInputValue, setFtsInputValue] = useState<XFtsInputValue | undefined>(initFtsInputValue);
    const [optionalCustomFilter, setOptionalCustomFilter] = useState<XOptionalCustomFilter | undefined>(undefined);
    const [multilineSwitchValue, setMultilineSwitchValue] = useState<XMultilineRenderType>(props.multilineSwitchInitValue);
    const [multiSortMeta, setMultiSortMeta] = useState<DataTableSortMeta[] | undefined>(XUtils.createMultiSortMeta(props.sortField));
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [dataLoaded, setDataLoaded] = props.dataLoadedState ?? useState<boolean>(false); // priznak kde si zapiseme, ci uz sme nacitali data
    const [exportRowsDialogOpened, setExportRowsDialogOpened] = useState<boolean>(false);
    const [exportRowsDialogRowCount, setExportRowsDialogRowCount] = useState<number>(); // param pre dialog
    const [filtersAfterFiltering, setFiltersAfterFiltering] = useState<DataTableFilterMeta>(filtersInit); // sem si odkladame stav filtra po kliknuti na button Filter (chceme exportovat presne to co vidno vyfiltrovane)
    const [ftsInputValueAfterFiltering, setFtsInputValueAfterFiltering] = useState<XFtsInputValue | undefined>(initFtsInputValue); // tak isto ako filtersAfterFiltering
    const [optionalCustomFilterAfterFiltering, setOptionalCustomFilterAfterFiltering] = useState<XOptionalCustomFilter | undefined>(undefined); // tak isto ako filtersAfterFiltering

    // parameter [] zabezpeci ze sa metoda zavola len po prvom renderingu (a nie po kazdej zmene stavu (zavolani setNieco()))
    useEffect(() => {
        // jednoduchy sposob - nepouzivame parameter props.displayed a priznak dataLoaded
        if (props.displayed === undefined) {
            loadData();
            //console.log("XLazyDataTable - data loaded (simple)");
        }
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // sposob pozivany pri XFormNavigator (potrebujeme refreshnut data pri navrate z formulara)
        if (props.displayed !== undefined) {
            if (props.displayed) {
                if (!dataLoaded) {
                    loadData();
                    //console.log("XLazyDataTable - data loaded (used displayed)");
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

    // TODO - preco je to tu? presunut dole ak sa da...
    const dataKey = props.dataKey !== undefined ? props.dataKey : XUtilsMetadataCommon.getXEntity(props.entity).idField;

    const onPage = async (event: any) => {

        //console.log("zavolany onPage");

        setFirst(event.first);
        const findParam: FindParam = createFindParam();
        findParam.first = event.first; // prepiseme first, lebo je tam stara hodnota (volanie setFirst nezmeni first hned)
        loadDataBase(findParam);
    }

    const onFilter = (event: any) => {

        //console.log("zavolany onFilter - this.state.filters = " + JSON.stringify(filters));
        //console.log("zavolany onFilter - event.filters = " + JSON.stringify(event.filters));

        // tymto zavolanim sa zapise znak zapisany klavesnicou do inputu filtra (ak prikaz zakomentujeme, input filtra zostane prazdny)
        setFilters(event.filters);
    }

    const onSort = (event: any) => {

        //console.log("zavolany onSort - this.state.multiSortMeta = " + JSON.stringify(multiSortMeta));
        //console.log("zavolany onSort - event.multiSortMeta = " + JSON.stringify(event.multiSortMeta));

        setMultiSortMeta(event.multiSortMeta);
        const findParam: FindParam = createFindParam();
        findParam.multiSortMeta = event.multiSortMeta; // prepiseme multiSortMeta, lebo je tam stara hodnota (volanie setMultiSortMeta nezmeni multiSortMeta hned)
        loadDataBase(findParam);
    }

    const onClickFilter = () => {

        //console.log("zavolany onClickFilter");

        loadData();
    };

    const onClickClearFilter = () => {
        // najjednoduchsi sposob - pomeni aj pripadne nastavene matchMode hodnoty
        let filtersInit: DataTableFilterMeta = createInitFilters();
        setFilters(filtersInit);

        if (ftsInputValue) {
            setFtsInputValue(createInitFtsInputValue());
        }

        if (props.optionalCustomFilters) {
            setOptionalCustomFilter(undefined);
        }
    };

    const loadData = () => {
        loadDataBase(createFindParam());
    }

    const createFindParam = (): FindParam => {
        return {
            resultType: ResultType.RowCountAndPagedRows,
            first: first,
            rows: rows,
            filters: filters,
            fullTextSearch: createXFullTextSearch(ftsInputValue),
            customFilterItems: createXCustomFilterItems(customFilterItems, optionalCustomFilter),
            multiSortMeta: multiSortMeta,
            entity: props.entity,
            fields: getFields(true),
            aggregateItems: aggregateItems
        };
    }

    const loadDataBase = async (findParam: FindParam) => {
        //console.log("zavolany loadDataBase - startIndex = " + findParam.first + ", endIndex = " + ((findParam.first ?? 0) + (findParam.rows ?? 0)) + ", filters = " + JSON.stringify(findParam.filters) + ", multiSortMeta = " + JSON.stringify(findParam.multiSortMeta) + ", fields = " + JSON.stringify(findParam.fields));
        setLoading(true);
        const findResult = await findByFilter(findParam);
        setValue(findResult);
        setLoading(false);
        // odlozime si filter hodnoty pre pripadny export - deep cloning vyzera ze netreba
        setFiltersAfterFiltering(filters);
        setFtsInputValueAfterFiltering(ftsInputValue ? {...ftsInputValue} : undefined);
        setOptionalCustomFilterAfterFiltering(optionalCustomFilter);
    }

    const findByFilter = async (findParam: FindParam) : Promise<FindResult> => {

        // vysledok je typu FindResult
        const findResult: FindResult = await XUtils.fetchOne('lazyDataTableFindRows', findParam);
        findResult.totalRecords = parseInt(findResult.totalRecords as any as string);
        return findResult;
    }

    const createXFullTextSearch = (ftsInputValue: XFtsInputValue | undefined): XFullTextSearch | undefined => {
        let xFullTextSearch: XFullTextSearch | undefined = undefined; // default
        if (ftsInputValue && ftsInputValue.value !== null) {
            xFullTextSearch = {
                fields: Array.isArray(props.fullTextSearch) ? props.fullTextSearch : undefined,
                value: ftsInputValue.value,
                splitValue: true,
                matchMode: ftsInputValue.matchMode
            }
        }
        return xFullTextSearch;
    }

    const createXCustomFilterItems = (customFilterItems: XCustomFilterItem[] | undefined, optionalCustomFilter: XOptionalCustomFilter | undefined): XCustomFilterItem[] | undefined => {
        return XUtils.filterAnd(customFilterItems, optionalCustomFilter?.filter);
    }

    const getFields = (addPropsFields: boolean): string[] => {

        // krasne zobrazi cely objekt!
        //console.log(dataTableEl.current);

        let fields = [];
        let columns = dataTableEl.current.props.children;
        for (let column of columns) {
            fields.push(column.props.field);
        }
        if (addPropsFields) {
            if (props.fields) {
                fields.push(...props.fields);
            }
        }
        return fields;
    }

    const getHeaders = (): string[] => {

        // krasne zobrazi cely objekt!
        //console.log(dataTableEl.current);

        let headers = [];
        let columns = dataTableEl.current.props.children;
        for (let column of columns) {
            // pozor! headers tahame z primereact DataTable a napr. pri editacii nemusi byt v atribute header string
            headers.push(column.props.header);
        }
        return headers;
    }

    const hasContentTypeHtml = (): boolean => {

        let columns: XLazyColumnType[] = props.children as XLazyColumnType[];
        return columns.some((column: XLazyColumnType) => column.props.contentType === "html");
    }

    const onSelectionChange = (event: any) => {
        //console.log("zavolany onSelectionChange");
        //console.log(event.value);

        setSelectedRow(event.value);
    }

    const onRowDoubleClick = (event: any) => {
        //console.log("zavolany onRowDoubleClick");
        //console.log(event.data);

        if (props.onEdit !== undefined && props.searchBrowseParams === undefined) {
            props.onEdit(event.data);
        }
        else if (props.searchBrowseParams !== undefined) {
            props.searchBrowseParams.onChoose(event.data);
        }
    }

    const onClickAddRow = () => {
        //console.log("zavolany onClickAddRow");

        if (props.onAddRow !== undefined) {
            props.onAddRow();
        }
    }

    const onClickEdit = () => {
        //console.log("zavolany onClickEdit");

        if (selectedRow !== null) {
            if (props.onEdit !== undefined) {
                props.onEdit(selectedRow);
            }
        }
        else {
            alert(xLocaleOption('pleaseSelectRow'));
        }
    }

    const onClickRemoveRow = async () => {
        //console.log("zavolany onClickRemoveRow");

        if (selectedRow !== null) {
            if (props.removeRow instanceof Function) {
                let reread = true;
                try {
                    reread = await props.removeRow(selectedRow);
                }
                catch (e) {
                    XUtils.showErrorMessage(xLocaleOption('removeRowFailed'), e);
                }
                if (reread) {
                    loadData();
                    if (props.onRemoveRow) {
                        props.onRemoveRow(selectedRow, OperationType.Remove);
                    }
                }
            }
            else {
                if (window.confirm(xLocaleOption('removeRowConfirm'))) {
                    try {
                        // poznamka: vdaka await bude loadData() bezat az po dobehnuti requestu removeRow
                        await XUtils.removeRow(props.entity, selectedRow);
                    }
                    catch (e) {
                        XUtils.showErrorMessage(xLocaleOption('removeRowFailed'), e);
                    }
                    loadData();
                    if (props.onRemoveRow) {
                        props.onRemoveRow(selectedRow, OperationType.Remove);
                    }
                }
            }
        }
        else {
            alert(xLocaleOption('pleaseSelectRow'));
        }
    }

    const onClickAppButtonForRow = (onClick: (selectedRow: any) => void) => {

        if (selectedRow !== null) {
            onClick(selectedRow);
        }
        else {
            alert(xLocaleOption('pleaseSelectRow'));
        }
    }

    const onClickExport = async () => {

        // exportujeme zaznamy zodpovedajuce filtru
        // najprv zistime pocet zaznamov
        const findParam: FindParam = {
            resultType: ResultType.OnlyRowCount,
            first: first,
            rows: rows,
            filters: filtersAfterFiltering,
            fullTextSearch: createXFullTextSearch(ftsInputValueAfterFiltering),
            customFilterItems: createXCustomFilterItems(customFilterItems, optionalCustomFilterAfterFiltering),
            multiSortMeta: multiSortMeta,
            entity: props.entity,
            fields: getFields(false),
            aggregateItems: aggregateItems
        };
        //setLoading(true); - iba co preblikuje, netreba nam
        const findResult = await findByFilter(findParam);
        //setLoading(false);

        setExportRowsDialogRowCount(findResult.totalRecords); // param pre dialog
        setExportRowsDialogOpened(true);
    }

    const createExportParams = (): XExportParams => {
        const queryParam: LazyDataTableQueryParam = {
            filters: filtersAfterFiltering,
            fullTextSearch: createXFullTextSearch(ftsInputValueAfterFiltering),
            customFilterItems: createXCustomFilterItems(customFilterItems, optionalCustomFilterAfterFiltering),
            multiSortMeta: multiSortMeta,
            entity: props.entity,
            fields: getFields(false),
            fieldsToDuplicateValues: props.exportFieldsToDuplicateValues
        };
        return {
            path: "x-lazy-data-table-export",
            queryParam: queryParam,
            headers: getHeaders(),
            fileName: `${props.entity}`
        };
    }

    const onClickChoose = () => {
        //console.log("zavolany onClickChoose");

        if (selectedRow !== null) {
            if (props.searchBrowseParams !== undefined) {
                props.searchBrowseParams.onChoose(selectedRow);
            }
        }
        else {
            console.log("Nie je vyselectovany ziaden zaznam.");
        }
    }

    // ****** dropdown vo filtri ********
    // pouziva sa len pre simple filtrovanie (filterDisplay="row")

    const onDropdownFilterChange = (field: string, displayValue: any) => {
        const filterValue: any | null = displayValue !== XUtils.dropdownEmptyOptionValue ? displayValue : null;
        setFilterValue(field, filterValue, FilterMatchMode.EQUALS);
    }

    const getDropdownFilterValue = (field: string) : any => {
        const filterValue: any | null = getFilterValue(field);
        return filterValue !== null ? filterValue : XUtils.dropdownEmptyOptionValue;
    }

    // ****** vseobecne metodky pre set/get do/z filtra ********
    // zatial funguje len pre simple filtrovanie (filterDisplay="row")

    // vseobecna specialna metodka pouzvana pri custom filtri (XLazyColumn.filterElement)
    const setFilterItem: XSetFilterItem = (field: string, filterItem: DataTableFilterMetaData | DataTableOperatorFilterMetaData) => {
        filters[field] = filterItem;
        // neskusal som, ci treba aj toto klonovat ale pravdepodobne hej
        const filtersCloned: DataTableFilterMeta = {...filters};
        setFilters(filtersCloned);
    }

    // vseobecna specialna metodka pouzvana pri custom filtri (XLazyColumn.filterElement)
    const getFilterItem = (field: string): DataTableFilterMetaData | DataTableOperatorFilterMetaData => {
        return filters[field];
    }

    // vseobecna metodka - nastavi hodnotu do filtra
    // ak je matchMode === undefined, tak zachova povodnu hodnotu matchMode
    const setFilterValue = (field: string, value: any | null, matchMode?: any) => {

        const filterValue: DataTableFilterMetaData = filters[field] as DataTableFilterMetaData; // funguje len pre filterDisplay="row"
        filterValue.value = value;
        if (matchMode !== undefined) {
            filterValue.matchMode = matchMode;
        }
        // treba klonovat, inac react nezobrazi zmenenu hodnotu
        const filtersCloned: DataTableFilterMeta = {...filters};
        setFilters(filtersCloned);
    }

    // vseobecna metodka - precita hodnotu z filtra (vrati napr. typ Date | null)
    const getFilterValue = (field: string) : any | null => {
        const filterValue: DataTableFilterMetaData = filters[field] as DataTableFilterMetaData; // funguje len pre filterDisplay="row"
        return filterValue.value;
    }

    // ****** vseobecne metodky pre set/get do/z filtra - pre betweenFilter ********
    // do DataTableFilterMetaData.value ulozime dvojprvkove pole [value1, value2]
    // na backende spracujeme toto dvojprvkove pole

    const setFilterValue1 = (field: string, value: any | null) => {
        // na zaciatku (po inicializacii lazy table) je filterValue = null
        let filterValue: any[2] | null = getFilterValue(field);
        if (filterValue !== null) {
            filterValue[0] = value;
        }
        else {
            filterValue = [value, null];
        }
        setFilterValue(field, filterValue, FilterMatchMode.BETWEEN);
    }

    const setFilterValue2 = (field: string, value: any | null) => {
        // na zaciatku (po inicializacii lazy table) je filterValue = null
        let filterValue: any[2] | null = getFilterValue(field);
        if (filterValue !== null) {
            filterValue[1] = value;
        }
        else {
            filterValue = [null, value];
        }
        setFilterValue(field, filterValue, FilterMatchMode.BETWEEN);
    }

    const getFilterValue1 = (field: string) : any | null => {
        return getFilterValue1or2(field, 0);
    }

    const getFilterValue2 = (field: string) : any | null => {
        return getFilterValue1or2(field, 1);
    }

    const getFilterValue1or2 = (field: string, index: 0 | 1) : any | null => {
        let filterValue: any[2] | null = getFilterValue(field);
        return filterValue !== null ? filterValue[index] : null;
    }

    const getBetweenFilter = (columnBetweenFilter: XBetweenFilterProp | "noBetween", tableBetweenFilter: XBetweenFilterProp): XBetweenFilterProp => {
        let betweenFilter: XBetweenFilterProp = undefined;
        // columnBetweenFilter has higher prio than tableBetweenFilter
        if (columnBetweenFilter !== undefined) {
            if (columnBetweenFilter === "row" || columnBetweenFilter === "column") {
                betweenFilter = columnBetweenFilter;
            }
            // for "noBetween" stays betweenFilter = undefined (simple filter used)
        }
        else {
            betweenFilter = tableBetweenFilter; // betweenFilter from XLazyDataTable property
        }
        return betweenFilter;
    }

    const valueAsUI = (value: any, xField: XField, contentType?: XContentType): React.ReactNode => {
        let valueResult: React.ReactNode;
        if (xField.type === "boolean") {
            // TODO - efektivnejsie by bolo renderovat len prislusne ikonky
            valueResult = <TriStateCheckbox value={value} disabled={true}/>
        }
        else {
            if (contentType === "html") {
                // value should be always string (xField.type === "string")
                valueResult = <XHtmlRenderer htmlValue={value} renderType={multilineSwitchValue} fewLinesCount={props.multilineSwitchFewLinesCount}/>;
            }
            else {
                // ine typy - convertValue vrati string
                // mame zapnutu konverziu fromModel, lebo z json-u nam prichadzaju objekty typu string (napr. pri datumoch)
                valueResult = convertValue(xField, value, true, AsUIType.Form);
                // ak mame viacriadkovy text a multilineSwitch nastaveny na viac ako 1 riadok (defaultne je nastaveny na "allLines") pouzijeme XMultilineRenderer
                if (contentType === "multiline" && multilineSwitchValue !== "singleLine") {
                    if (xField.type === "string" && typeof valueResult === "string" && valueResult) {
                        const lines: string[] = valueResult.split(XUtilsCommon.newLine);
                        valueResult = <XMultilineRenderer valueList={lines} renderType={multilineSwitchValue} fewLinesCount={props.multilineSwitchFewLinesCount} multilineContent={true}/>;
                    }
                }
            }
        }
        return valueResult;
    }

    const bodyTemplate = (columnProps: XLazyColumnProps, rowData: any, xField: XField): React.ReactNode => {
        let bodyValue: React.ReactNode;
        const rowDataValue: any | any[] = XUtilsCommon.getValueOrValueListByPath(rowData, columnProps.field);
        if (Array.isArray(rowDataValue)) {
            const elemList: React.ReactNode[] = rowDataValue.map((value: any) => valueAsUI(value, xField, columnProps.contentType));
            bodyValue = <XMultilineRenderer valueList={elemList} renderType={multilineSwitchValue} fewLinesCount={props.multilineSwitchFewLinesCount}/>;
        }
        else {
            bodyValue = valueAsUI(rowDataValue, xField, columnProps.contentType);
        }
        return bodyValue;
    }

    // ak mame scrollWidth/scrollHeight = viewport (default), vyratame scrollWidth/scrollHeight tak aby tabulka "sadla" do okna (viewport-u)

    let scrollWidth: string | undefined = undefined; // vypnute horizontalne scrollovanie
    let scrollHeight: string | undefined = undefined; // vypnute vertikalne scrollovanie

    if (props.scrollable) {
        if (props.scrollWidth !== "none") {
            scrollWidth = props.scrollWidth;
            if (scrollWidth === "viewport") {
                scrollWidth = 'calc(100vw - 2.2rem)'; // povodne bolo 1.4rem (20px okraje) ale pri vela stlpcoch vznikal horizontalny scrollbar
            }
        }

        if (props.scrollHeight !== "none") {
            scrollHeight = props.scrollHeight;
            if (scrollHeight === "viewport") {
                // vypocet je priblizny, robeny na mobil, desktop bude mat mozno iny
                //const headerHeight = XUtils.toPX0('12.7rem');
                //let footerHeight = XUtils.toPX0('3.7rem') + XUtils.toPX0('3rem'); // table footer (paging) + buttons Add row, Edit, ...
                // na desktope mi nechce odpocitat vysku taskbar-u od window.screen.availHeight, tak to poriesime takymto hack-om:
                // if (!XUtils.isMobile()) {
                //     footerHeight += XUtils.toPX0('6rem'); // priblizna vyska taskbaru (ak mam 2 rady buttonov)
                // }
                let viewHeight: string;
                let headerFooterHeight: number;
                if (props.searchBrowseParams === undefined) {
                    // sme v standardnom formulari
                    viewHeight = '100vh';
                    // experimentalne zistena vyska header/footer
                    // da sa vyratat ako vysku body (celej stranky) - vyska div-u ktory sa scrolluje (div na ktorom je style="max-height: calc(100vh - 266.42px);)
                    // (treba odratat vysku paginatora a formFooterHeight (lebo tie sa odratavaju nizsie))
                    headerFooterHeight = XUtils.toPX0('10.89rem');
                }
                else {
                    // sme v dialogu
                    if (XUtils.isMobile()) {
                        viewHeight = '98vh'; // .p-dialog pre mobil ma max-height: 98%
                        headerFooterHeight = XUtils.toPX0('12.03rem'); // rucne zratane
                    }
                    else {
                        viewHeight = '90vh'; // .p-dialog pre desktop ma max-height: 90%
                        headerFooterHeight = XUtils.toPX0('13.03rem'); // rucne zratane (desktop ma vecsi margin dole na dialogu)
                    }
                }
                // pridame vysku paging-u, ak treba
                if (props.paginator) {
                    headerFooterHeight += XUtils.toPX0('3.71rem');
                }
                // este pridame vysku linkov na zdrojaky, ak treba
                if (props.formFooterHeight !== undefined) {
                    headerFooterHeight += XUtils.toPX0(XUtils.processGridBreakpoints(props.formFooterHeight));
                }
                scrollHeight = `calc(${viewHeight} - ${headerFooterHeight}px)`;
            }
        }
    }

    let style: React.CSSProperties = {};
    if (scrollWidth !== undefined) {
        style.width = scrollWidth;
    }

    if (props.shrinkWidth) {
        style.maxWidth = 'min-content'; // ak nic nedame (nechame auto), tak (v pripade ak nebudeme mat horizontalny scrollbar) natiahne tabulku na celu sirku stranky, co nechceme
    }

    // pri prechode z Primereact 6.x na 9.x sa tableLayout zmenil z fixed na auto a nefungovalo nastavenie sirok stlpcov - docasne teda takto
    let tableStyle: React.CSSProperties = {tableLayout: 'fixed'};
    if (props.width !== undefined) {
        let width: string = props.width;
        if (!isNaN(Number(width))) { // if width is number
            width = width + 'rem';
        }
        tableStyle = {...tableStyle, width: width};
    }

    // check
    if ((props.editMode === true || props.editMode === false) && props.editModeHandlers === undefined) {
        throw "XLazyDataTable: for props.editMode = true/false, props.editModeHandlers must be defined.";
    }

    // pouzivame paginatorLeft aj paginatorRight (aj prazdny) pouzivame, aby bol default paginator v strede (bez paginatorLeft je default paginator presunuty dolava a naopak)
    // sirku div-ov este nastavujeme v css na 10rem
    let paginatorLeft = <div>{xLocaleOption('totalRecords')}: {value.totalRecords}</div>;
    let paginatorRight = <div/>;
    if (props.editMode === true) {
        paginatorRight = <div>
                            <XButtonIconSmall icon="pi pi-save" onClick={() => props.editModeHandlers?.onSave()} tooltip="Save form"/>
                            <XButtonIconSmall icon="pi pi-times" onClick={() => props.editModeHandlers?.onCancel()} tooltip="Cancel editing"/>
                         </div>;
    }
    else if (props.editMode === false) {
        paginatorRight = <div>
                            <XButtonIconSmall icon="pi pi-pencil" onClick={() => props.editModeHandlers?.onStart()} tooltip="Edit form"/>
                         </div>;
    }
    // else - editMode is undefined - browse is not editable

    // export pre search button-y zatial vypneme
    const exportRows: boolean = (props.searchBrowseParams === undefined);

    // pre lepsiu citatelnost vytvarame stlpce uz tu
    const columnElemList: JSX.Element[] = React.Children.map(
        props.children.filter((child: React.ReactChild) => XUtils.xViewStatus((child as {props: XLazyColumnProps}).props.columnViewStatus) !== XViewStatus.Hidden),
        function(child) {
            // ak chceme zmenit child element, tak treba bud vytvorit novy alebo vyklonovat
            // priklad je na https://soshace.com/building-react-components-using-children-props-and-context-api/
            // (vzdy musime robit manipulacie so stlpcom, lebo potrebujeme pridat filter={true} sortable={true}
            const childColumn = child as any as {props: XLazyColumnProps}; // nevedel som to krajsie...
            const xField: XField = XUtilsMetadataCommon.getXFieldByPath(xEntity, childColumn.props.field);

            // *********** header ***********
            const headerLabel = childColumn.props.header !== undefined ? childColumn.props.header : childColumn.props.field;
            let header;
            if (props.editMode === true) {
                header = <div>
                    <div>
                        <XButtonIconSmall icon="pi pi-plus" onClick={() => props.editModeHandlers?.onAddColumn(childColumn.props.field)} tooltip="Add column"/>
                        <XButtonIconSmall icon="pi pi-pencil" onClick={() => props.editModeHandlers?.onEditColumn(childColumn.props.field)} tooltip="Edit column"/>
                        <XButtonIconSmall icon="pi pi-trash" onClick={() => props.editModeHandlers?.onRemoveColumn(childColumn.props.field)} tooltip="Remove column"/>
                    </div>
                    <div>
                        <XButtonIconSmall icon="pi pi-chevron-left" onClick={() => props.editModeHandlers?.onMoveColumnLeft(childColumn.props.field)} tooltip="Move column left"/>
                        <XButtonIconSmall icon="pi pi-chevron-right" onClick={() => props.editModeHandlers?.onMoveColumnRight(childColumn.props.field)} tooltip="Move column right"/>
                    </div>
                    <div>{headerLabel}</div>
                </div>;
            }
            else {
                header = headerLabel;
            }

            // *********** filterElement ***********
            let betweenFilter: XBetweenFilterProp = undefined;
            let filterElement;
            if (childColumn.props.filterElement !== undefined) {
                filterElement = (options: ColumnFilterElementTemplateOptions): React.ReactNode => {
                                    // compilator sa stazoval ze childColumn.props.filterElement moze byt undefined, preto som pridal "!"
                                    return childColumn.props.filterElement!({getFilterItem: getFilterItem, setFilterItem: setFilterItem, options: options});
                                };
            }
            else {
                if (xField.type === "boolean") {
                    const checkboxValue: boolean | null = getFilterValue(childColumn.props.field);
                    filterElement = <TriStateCheckbox value={checkboxValue} onChange={(e: any) => setFilterValue(childColumn.props.field, e.value, FilterMatchMode.EQUALS)}/>;
                }
                else if (childColumn.props.dropdownInFilter) {
                    const dropdownValue = getDropdownFilterValue(childColumn.props.field);
                    filterElement = <XDropdownDTFilter entity={props.entity} path={childColumn.props.field} value={dropdownValue} onValueChange={onDropdownFilterChange} filter={childColumn.props.dropdownFilter} sortField={childColumn.props.dropdownSortField}/>
                }
                else if (xField.type === "date" || xField.type === "datetime") {
                    betweenFilter = getBetweenFilter(childColumn.props.betweenFilter, props.betweenFilter);
                    if (betweenFilter !== undefined) {
                        // display: 'flex' umiestni XCalendar elementy vedla seba
                        filterElement =
                            <div style={betweenFilter === "row" ? {display: 'flex'} : undefined}>
                                <XCalendar value={getFilterValue1(childColumn.props.field)} onChange={(value: Date | null) => setFilterValue1(childColumn.props.field, value)} datetime={xField.type === "datetime"}/>
                                <XCalendar value={getFilterValue2(childColumn.props.field)} onChange={(value: Date | null) => setFilterValue2(childColumn.props.field, value)} datetime={xField.type === "datetime"}/>
                            </div>;
                    }
                    else {
                        const dateValue: Date | null = getFilterValue(childColumn.props.field);
                        filterElement = <XCalendar value={dateValue} onChange={(value: Date | null) => setFilterValue(childColumn.props.field, value)} datetime={xField.type === "datetime"}/>
                    }
                }
                else if (xField.type === "decimal" || xField.type === "number") {
                    const params = XUtilsMetadata.getParamsForInputNumber(xField);
                    betweenFilter = getBetweenFilter(childColumn.props.betweenFilter, props.betweenFilter);
                    if (betweenFilter !== undefined) {
                        // display: 'flex' umiestni input elementy pod seba (betweenFilter = "column") resp. vedla seba (betweenFilter = "row")
                        filterElement =
                            <div style={{display: 'flex', flexDirection: betweenFilter}}>
                                <XInputDecimalBase value={getFilterValue1(childColumn.props.field)} onChange={(value: number | null) => setFilterValue1(childColumn.props.field, value)} {...params}/>
                                <XInputDecimalBase value={getFilterValue2(childColumn.props.field)} onChange={(value: number | null) => setFilterValue2(childColumn.props.field, value)} {...params}/>
                            </div>;
                    }
                    else {
                        const numberValue: number | null = getFilterValue(childColumn.props.field);
                        filterElement = <XInputDecimalBase value={numberValue} onChange={(value: number | null) => setFilterValue(childColumn.props.field, value)} {...params}/>
                    }
                }
            }

            // ************** dataType **************
            // depending on the dataType of the column, suitable match modes are displayed in filter
            let dataType: "text" | "numeric" | "date" | undefined = undefined;
            if (xField.type === "decimal" || xField.type === "number") {
                dataType = "numeric";
            }
            else if (xField.type === "date" || xField.type === "datetime") {
                dataType = "date";
            }

            // *********** showFilterMenu ***********
            let showFilterMenu: boolean;
            if (childColumn.props.showFilterMenu !== undefined) {
                showFilterMenu = childColumn.props.showFilterMenu;
            }
            else {
                showFilterMenu = true; // default
                if (props.filterDisplay === "row") {
                    if (xField.type === "boolean" || childColumn.props.dropdownInFilter || betweenFilter !== undefined) {
                        showFilterMenu = false;
                    }
                }
            }

            // *********** showClearButton ***********
            // pre filterDisplay = "row" nechceme clear button, chceme setrit miesto
            let showClearButton: boolean = props.filterDisplay === "menu";

            // *********** body ***********
            let body;
            if (childColumn.props.body !== undefined) {
                body = childColumn.props.body;
            }
            else {
                body = (rowData: any) => {return bodyTemplate(childColumn.props, rowData, xField);};
            }

            // *********** width/headerStyle ***********
            let width: string | undefined = XUtils.processPropWidth(childColumn.props.width);
            if (width === undefined || width === "default") {
                // TODO - if filter not used at all, then buttons flags should be false
                const filterMenuInFilterRow: boolean = props.filterDisplay === "row" && showFilterMenu;
                const filterButtonInHeader: boolean = props.filterDisplay === "menu";
                width = XUtilsMetadata.computeColumnWidth(xField, betweenFilter, filterMenuInFilterRow, undefined, headerLabel, true, filterButtonInHeader);
            }
            let headerStyle: React.CSSProperties = {};
            if (width !== undefined) {
                headerStyle = {width: width};
            }

            // *********** align ***********
            let align: "left" | "center" | "right" | undefined = undefined; // default undefined (left)
            if (childColumn.props.align !== undefined && childColumn.props.align !== null) {
                align = childColumn.props.align;
            }
            else {
                // decimal defaultne zarovnavame doprava
                if (xField.type === "decimal") {
                    align = "right";
                }
                else if (xField.type === "boolean") {
                    align = "center";
                }
            }

            // *********** footer ***********
            let footer: any = undefined;
            if (childColumn.props.aggregateType && value.aggregateValues) {
                let aggregateValue: any = value.aggregateValues[childColumn.props.field];
                if (aggregateValue !== undefined && aggregateValue !== null) {
                    if (xField.type === "decimal" || xField.type === "number") {
                        // v json subore su stringy (cislo v ""), konvertujeme aby sme zmenili 123.45 na 123,45
                        aggregateValue = numberAsUI(numberFromModel(aggregateValue), xField.scale);
                    }
                }
                else {
                    aggregateValue = ""; // nemame este nacitane data
                }
                footer = aggregateValue;
            }

            return <Column field={childColumn.props.field} header={header} footer={footer} filter={true} sortable={true}
                           filterElement={filterElement} dataType={dataType} showFilterMenu={showFilterMenu} showClearButton={showClearButton}
                           body={body} headerStyle={headerStyle} align={align}/>;
        }
    );

    // align-items-center centruje vertikalne (posuva smerom dolu do stredu)
    return (
        <div>
            <div className="flex justify-content-center align-items-center">
                {ftsInputValue ? <XFtsInput value={ftsInputValue} onChange={(value: XFtsInputValue) => setFtsInputValue(value)}/> : null}
                <XButton key="filter" label={xLocaleOption('filter')} onClick={onClickFilter} />
                <XButton key="clearFilter" label={xLocaleOption('clearFilter')} onClick={onClickClearFilter} />
                {props.optionalCustomFilters ? <XOcfDropdown optionalCustomFilters={props.optionalCustomFilters} value={optionalCustomFilter} onChange={(value: XOptionalCustomFilter | undefined) => setOptionalCustomFilter(value)} className="m-1"/> : null}
                {props.multilineSwitch ? <XMultilineSwitch value={multilineSwitchValue} onChange={(value: XMultilineRenderType) => setMultilineSwitchValue(value)} className="m-1"/> : null}
            </div>
            <div className="flex justify-content-center">
                <DataTable value={value.rowList} dataKey={dataKey} paginator={props.paginator}
                           rows={rows} totalRecords={value.totalRecords}
                           lazy={true} first={first} onPage={onPage} loading={loading}
                           filterDisplay={props.filterDisplay} filters={filters} onFilter={onFilter}
                           sortMode="multiple" removableSort={true} multiSortMeta={multiSortMeta} onSort={onSort}
                           selectionMode="single" selection={selectedRow} onSelectionChange={onSelectionChange}
                           onRowDoubleClick={onRowDoubleClick} rowClassName={props.rowClassName}
                           ref={dataTableEl} className="p-datatable-sm x-lazy-datatable" resizableColumns columnResizeMode="expand" tableStyle={tableStyle}
                           paginatorLeft={paginatorLeft} paginatorRight={paginatorRight}
                           scrollable={props.scrollable} scrollHeight={scrollHeight} style={style}>
                    {columnElemList}
                </DataTable>
            </div>
            <div className="flex justify-content-center">
                {props.onAddRow !== undefined && props.searchBrowseParams === undefined ? <XButton key="addRow" icon="pi pi-plus" label={xLocaleOption('addRow')} onClick={onClickAddRow}/> : null}
                {props.onEdit !== undefined && props.searchBrowseParams === undefined ? <XButton key="editRow" icon="pi pi-pencil" label={xLocaleOption('editRow')} onClick={onClickEdit}/> : null}
                {props.removeRow !== undefined && props.removeRow !== false && props.searchBrowseParams === undefined ? <XButton key="removeRow" icon="pi pi-times" label={xLocaleOption('removeRow')} onClick={onClickRemoveRow}/> : null}
                {exportRows ? <XButton key="exportRows" icon="pi pi-file-export" label={xLocaleOption('exportRows')} onClick={onClickExport} /> : null}
                {props.appButtonsForRow ? props.appButtonsForRow.map((xAppButton: XAppButtonForRow) => <XButton key={xAppButton.key} icon={xAppButton.icon} label={xAppButton.label} onClick={() => onClickAppButtonForRow(xAppButton.onClick)}/>) : null}
                {props.appButtons}
                {props.searchBrowseParams !== undefined ? <XButton key="choose" label={xLocaleOption('chooseRow')} onClick={onClickChoose}/> : null}
                {exportRows ? <XExportRowsDialog key="exportRowsDialog" dialogOpened={exportRowsDialogOpened} hideDialog={() => setExportRowsDialogOpened(false)}
                                                 rowCount={exportRowsDialogRowCount} exportParams={createExportParams}/> : null}
            </div>
            {hasContentTypeHtml() ? <Editor style={{display: 'none'}} showHeader={false}/> : null /* we want to import css if needed (<style type="text/css" data-primereact-style-id="editor">) */}
        </div>
    );
}

XLazyDataTable.defaultProps = {
    paginator: true,
    rows: 10,
    filterDisplay: "row",
    fullTextSearch: true,
    multilineSwitch: false,
    multilineSwitchInitValue: "allLines",
    multilineSwitchFewLinesCount: 2,
    scrollable: true,
    scrollWidth: 'viewport', // nastavi sirku tabulky na (100vw - nieco) (ak bude obsah sirsi, zapne horizontalny scrollbar)
    scrollHeight: 'viewport', // nastavi vysku tabulky na (100vh - nieco) (ak bude obsah vecsi, zapne vertikalny scrollbar)
    shrinkWidth: true
};

// property filterElement is of type function, this functions returns custom filter input (e.g. AutoComplete, type React.ReactNode),
// setFilterItem is function that the custom filter input calls upon onChange - the function setFilterItem sets the selected filter value into "filters"
// and from "filters" goes the value to lazy service
// remark: this complicated way is used only to get filter value from custom filter input to "filters" in XLazyDataTable
// remark2: filter value transfer "custom filter input" -> "filters" is (temporary?) only one way, if some third party changes filter value in "filters",
// the change will be not visible in custom filter input!
export type XGetFilterItem = (field: string) => DataTableFilterMetaData | DataTableOperatorFilterMetaData;
export type XSetFilterItem = (field: string, filterItem: DataTableFilterMetaData | DataTableOperatorFilterMetaData) => void;
export type XFilterElementParams = {getFilterItem: XGetFilterItem; setFilterItem: XSetFilterItem; options: ColumnFilterElementTemplateOptions;};
export type XFilterElementProp = (params: XFilterElementParams) => React.ReactNode;
export type XContentType = "multiline" | "html" | undefined;

export interface XLazyColumnProps {
    field: string;
    header?: any;
    align?: "left" | "center" | "right";
    dropdownInFilter?: boolean;
    dropdownFilter?: XCustomFilter;
    dropdownSortField?: string;
    showFilterMenu?: boolean;
    betweenFilter?: XBetweenFilterProp | "noBetween"; // creates 2 inputs from to, only for type date/datetime/decimal/number implemented, "row"/"column" - position of inputs from to
    width?: string; // for example 150px or 10rem or 10% (value 10 means 10rem)
    contentType?: XContentType; // multiLine (output from InputTextarea) - wraps the content; html (output from Editor) - for rendering raw html
    aggregateType?: XAggregateType;
    columnViewStatus: XViewStatusOrBoolean; // aby sme mohli mat Hidden stlpec (nedarilo sa mi priamo v kode "o-if-ovat" stlpec), zatial netreba funkciu, vola sa columnViewStatus lebo napr. v Edit tabulke moze byt viewStatus na row urovni
    filterElement?: XFilterElementProp;
    body?: React.ReactNode | ((data: any, options: ColumnBodyOptions) => React.ReactNode); // the same type as type of property Column.body
}

export type XLazyColumnType = {props: XLazyColumnProps};

// TODO - XLazyColumn neni idealny nazov, lepsi je XColumn (ale zatial nechame XLazyColumn)
export const XLazyColumn = (props: XLazyColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XLazyColumn.defaultProps = {
    columnViewStatus: true  // XViewStatus.ReadWrite
};
