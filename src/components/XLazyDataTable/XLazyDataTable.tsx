import React, {ReactChild, useEffect, useRef, useState} from 'react';
import {
    DataTable, DataTableExpandedRows,
    DataTableFilterMeta,
    DataTableFilterMetaData,
    DataTableOperatorFilterMetaData, DataTableRowExpansionTemplate,
    DataTableSortMeta, DataTableValueArray
} from 'primereact/datatable';
import {
    Column,
    ColumnBodyOptions,
    ColumnFilterElementTemplateOptions,
    ColumnFilterMatchModeOptions
} from 'primereact/column';
import {XButton} from "../XButton";
import {OperationType, XUtils, XViewStatus, XViewStatusOrBoolean} from "../XUtils";
import {XFieldFilter, XSearchBrowseParams} from "../XSearchBrowseParams";
import {XUtilsMetadata} from "../XUtilsMetadata";
import {XDropdownDTFilter} from "../XDropdownDTFilter";
import {XAssoc, XEntity, XField} from "../../serverApi/XEntityMetadata";
import {AsUIType, convertValue, numberAsUI, numberFromModel} from "../../serverApi/XUtilsConversions";
import {FindResult} from "../../serverApi/FindResult";
import {
    FindParam,
    ResultType,
    XSimpleAggregateItem,
    XAggregateFunction,
    XCustomFilter,
    XCustomFilterItem,
    XFullTextSearch, XDataTableFilterMetaData, XFilterMatchMode, XDataTableFilterMeta
} from "../../serverApi/FindParam";
import {XButtonIconSmall} from "../XButtonIconSmall";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {XUtilsCommon} from "../../serverApi/XUtilsCommon";
import {LazyDataTableQueryParam} from "../../serverApi/ExportImportParam";
import {XExportParams, XExportRowsDialog, XExportRowsDialogState} from "./XExportRowsDialog";
import PrimeReact, {APIOptions, FilterMatchMode, FilterOperator, PrimeReactContext} from "primereact/api";
import {XOnSaveOrCancelProp} from "../XFormBase";
import {XCalendar} from "../XCalendar";
import {XInputDecimalBase} from "../XInputDecimalBase";
import {prLocaleOption, xLocaleOption} from "../XLocale";
import {XFtsInput, XFtsInputValue} from "../XFtsInput";
import {XUtilsMetadataCommon} from "../../serverApi/XUtilsMetadataCommon";
import {IconType} from "primereact/utils";
import {ButtonProps} from "primereact/button";
import {Editor} from "primereact/editor";
import {XMultilineSwitch} from "./XMultilineSwitch";
import {XMultilineRenderer} from "./XMultilineRenderer";
import {XHtmlRenderer} from "./XHtmlRenderer";
import {XOcfDropdown} from "./XOcfDropdown";
import {XFieldSetBase, XFieldSetMeta, XFieldXFieldMetaMap} from "../XFieldSet/XFieldSetBase";
import {XAutoCompleteBase} from "../XAutoCompleteBase";
import {XInputTextBase} from "../XInputTextBase";
import {useXStateSession} from "../useXStateSession";
import {useXStateSessionBase} from "../useXStateSessionBase";
import * as _ from "lodash";

// typ pouzivany len v XLazyDataTable
interface XFieldSetMaps {
    [field: string]: XFieldXFieldMetaMap;
}

export type XBetweenFilterProp = "row" | "column" | undefined;
export type XMultilineRenderType = "singleLine" | "fewLines" | "allLines";

export interface XAppButtonForRow {
    key?: string;
    icon?: IconType<ButtonProps>;
    label: string;
    onClick: (selectedRow: any) => void;
    style?: React.CSSProperties;
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

export enum XStateKeySuffix {
    filters = 'filters',
    ftsInputValue = 'fts-input-value',
    optionalCustomFilter = 'optional-custom-filter',
    multiSortMeta = 'multi-sort-meta',
    pagingFirst = 'paging-first',
    selectedRow = 'selected-row',
    multilineSwitchValue = 'multiline-switch-value'
}

export interface XLazyDataTableProps {
    entity: string;
    stateKey?: string; // key used to save the state into session (or local), default is entity, but sometimes we have more then 1 browse/XLazyDataTable for 1 entity
    label?: string;
    dataKey?: string;
    rowExpansionTemplate?: (row: any, options: DataTableRowExpansionTemplate) => React.ReactNode;
    showExpandedRow?: (row: any, multilineSwitchValue: XMultilineRenderType) => boolean;
    paginator: boolean;
    rows: number;
    filterDisplay: "menu" | "row";
    betweenFilter?: XBetweenFilterProp; // umiestnenie inputov od do: "row" - vedla seba, "column" - pod sebou; plati pre vsetky stlpce typu date/datetime/decimal/number ak nemaju definovany svoj betweenFilter
    autoFilter: boolean; // if true, filtering starts immediately after setting filter value (button Filter is not used/rendered) (default false)
    showFilterButtons: boolean; // if true, Filter/Clear filter buttons are rendered (default true)
    showExportRows?: boolean; // true - export button rendered, false - export button not rendered, undefined (default) - Export button rendered only on desktop (not on mobile)
    scrollable: boolean; // default true, ak je false, tak je scrollovanie vypnute (scrollWidth/scrollHeight/formFooterHeight su ignorovane)
    scrollWidth: string; // hodnota "none" vypne horizontalne scrollovanie
    scrollHeight: string; // hodnota "none" vypne vertikalne scrollovanie
    formFooterHeight?: string; // pouziva sa (zatial) len pri deme - zadava sa sem vyska linkov na zdrojaky (SourceCodeLinkForm, SourceCodeLinkEntity) aby ich bolo vidno pri automatickom vypocte vysky tabulky
    shrinkWidth: boolean; // default true - ak je true, nerozsiruje stlpce na viac ako je ich explicitna sirka (nevznikaju "siroke" tabulky na celu dlzku parent elementu)
    onResetTable?: () => void; // zavola sa pri kliknuti na button resetTable (Reset filter)
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
    // ak chceme mat pristup k stavu multilineSwitchu, treba vytiahnut "const [multilineSwitchValue, setMultilineSwitchValue] = useState<XMultilineRenderType>(...);" do browse komponentu
    multilineSwitchValue?: [XMultilineRenderType, React.Dispatch<React.SetStateAction<XMultilineRenderType>>]; // TODO - specialny typ vytvor, napr. XuseState<boolean>
    headerElementRight?: React.ReactNode; // prida sa hned za multilineSwitch, moze sa tu pridat napr. custom switch
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

    // must be here, is used in createFiltersInit()
    const xEntity: XEntity = XUtilsMetadataCommon.getXEntity(props.entity);

    const createAggregateItems = (): XSimpleAggregateItem[] => {

        let aggregateItems: XSimpleAggregateItem[] = [];

        let columns = props.children;
        for (let column of columns) {
            const xLazyColumn = column as {props: XLazyColumnProps}; // nevedel som to krajsie...
            if (xLazyColumn.props.aggregateType) {
                aggregateItems.push({field: xLazyColumn.props.field, aggregateFunction: xLazyColumn.props.aggregateType});
            }
        }

        return aggregateItems;
    }

    const overrideFilters = (filters: DataTableFilterMeta, filtersHigherPrio: DataTableFilterMeta | undefined) : DataTableFilterMeta => {
        if (filtersHigherPrio) {
            // deep clone is needed, otherwise filter elements write into "filters" and override the values in filtersHigherPrio ("props.filters") (simple cloning "..." is not enough to create 2 instances of filter values)
            filters = {...filters, ..._.cloneDeep(filtersHigherPrio)}; // items from filtersHigherPrio will replace existing items in filters
        }
        return filters;
    }

    const createFiltersInit = () : DataTableFilterMeta => {

        let filtersInit: DataTableFilterMeta = {};

        //let columns = dataTableEl.current.props.children; - does not work
        let columns = props.children;
        for (let column of columns) {
            const xLazyColumn = column as {props: XLazyColumnProps}; // nevedel som to krajsie...
            const field: string = xLazyColumn.props.field;
            const xField: XField = XUtilsMetadataCommon.getXFieldByPath(xEntity, field);
            // TODO column.props.dropdownInFilter - pre "menu" by bolo fajn mat zoznam "enumov"
            const filterMatchMode: FilterMatchMode = getInitFilterMatchMode(xLazyColumn.props, xField);
            filtersInit[field] = createFilterItem(props.filterDisplay, {value: null, matchMode: filterMatchMode});
        }

        filtersInit = overrideFilters(filtersInit, props.filters);

        if (props.searchBrowseParams !== undefined) {
            const displayFieldFilter: XFieldFilter | undefined = props.searchBrowseParams.displayFieldFilter;
            if (displayFieldFilter !== undefined) {
                filtersInit[displayFieldFilter.field] = createFilterItem(props.filterDisplay, displayFieldFilter.constraint);
            }
        }

        return filtersInit;
    }

    const getInitFilterMatchMode = (xLazyColumnProps: XLazyColumnProps, xField: XField) : FilterMatchMode => {
        let filterMatchMode: FilterMatchMode;
        if (isAutoCompleteInFilterEnabled(xLazyColumnProps)) {
            filterMatchMode = XFilterMatchMode.X_AUTO_COMPLETE as unknown as FilterMatchMode; // little hack
        }
        else if (xField.type === "string" || xField.type === "jsonb") {
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

    const isAutoCompleteInFilterEnabled = (xLazyColumnProps: XLazyColumnProps): boolean => {
        return xLazyColumnProps.autoComplete !== undefined;
    }

/*  old version - created for automatical use of autocomplete on every *toOne assoc with string attribute
                - extra property was used: autoCompleteEnabled: true | false | "forStringOnly"
    const isAutoCompleteInFilterEnabled = (xLazyColumnProps: XLazyColumnProps, xField: XField): boolean => {
        let autoCompleteEnabled: boolean = false; // default
        // condition1: field has to have the length >= 2
        if (!XUtilsCommon.isSingleField(xLazyColumnProps.field)) {
            // condition2: used assoc must be *toOne
            let assocField: string;
            if (xLazyColumnProps.autoComplete?.assocField) {
                assocField = xLazyColumnProps.autoComplete?.assocField;
            }
            else {
                const [assocFieldTemp, displayFieldTemp] = XUtilsCommon.getPathToAssocAndField(xLazyColumnProps.field);
                assocField = assocFieldTemp!;
            }
            const xAssoc: XAssoc = XUtilsMetadataCommon.getXAssocToOneByPath(xEntity, assocField);
            if (xAssoc.relationType === "many-to-one" || xAssoc.relationType === "one-to-one") {
                if (xLazyColumnProps.autoCompleteEnabled === true) {
                    autoCompleteEnabled = true; // explicit enabled - works for all types (usually has not big sense)
                }
                else if (xLazyColumnProps.autoCompleteEnabled === "forStringOnly") {
                    // default usecase - the last attribute must be of type string
                    if (xField.type === "string") {
                        autoCompleteEnabled = true;
                    }
                }
            }
        }
        return autoCompleteEnabled;
    }
*/
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

/*
    // TODO turn off/on storage
    const saveValueIntoStorage = (stateKeySuffix: XStateKeySuffix, value: any) => {
        XUtils.saveValueIntoStorage(`${getTableStateKey()}-${stateKeySuffix}`, value);
    }

    // TODO turn off/on storage
    const getValueFromStorage = (stateKeySuffix: XStateKeySuffix, initValue: any): any => {
        return XUtils.getValueFromStorage(`${getTableStateKey()}-${stateKeySuffix}`, initValue);
    }
*/
    const getStateKey = (stateKeySuffix: XStateKeySuffix): string => {
        return `x-ldt-state-${props.stateKey ?? props.entity}-${stateKeySuffix}`;
    }

    const removePagingFromStorage = () => {
        XUtils.removeValueFromStorage(getStateKey(XStateKeySuffix.pagingFirst));
    }

    // premenne platne pre cely component (obdoba member premennych v class-e)
    const primeReactContext: APIOptions = React.useContext(PrimeReactContext); // probably does not work and deprecated PrimeReact.filterMatchModeOptions is used
    const dataTableEl = useRef<any>(null);
    let customFilterItems: XCustomFilterItem[] | undefined = XUtilsCommon.createCustomFilterItems(props.customFilter);
    if (props.searchBrowseParams !== undefined) {
        // ak mame props.searchBrowseParams.customFilterFunction, pridame filter
        if (props.searchBrowseParams.customFilter) {
            customFilterItems = XUtilsCommon.filterAnd(customFilterItems, XUtils.evalFilter(props.searchBrowseParams.customFilter));
        }
    }
    let aggregateItems: XSimpleAggregateItem[] = createAggregateItems();

    // poznamka k useXStateSession - v buducnosti nahradit useXStateStorage, ktory bude mat parameter session/local/none a parameter bude riadit aky storage sa pouzije
    // zatial vzdy ukladame do session

    // ak mame fieldSet stlpce (stlpce ktore maju zadany fieldSetId a zobrazuju hodnoty podla fieldSet-u),
    // tak sem nacitame mapy umoznujuce ziskanie labelov zakliknutych field-ov
    // poznamka: uz by sa zislo mat vytvorene objekty (instancie) pre stlpce a do nich zapisovat pripadny XFieldSetMap, filter (teraz je vo "filters")
    const [xFieldSetMaps, setXFieldSetMaps] = useState<XFieldSetMaps>({});

    const [value, setValue] = useState<FindResult>({rowList: [], totalRecords: 0, aggregateValues: []});
    const [expandedRows, setExpandedRows] = useState<DataTableExpandedRows | DataTableValueArray | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [first, setFirst] = useXStateSession(getStateKey(XStateKeySuffix.pagingFirst), 0);
    const [rows, setRows] = useState(props.paginator ? props.rows : undefined);
    // "filters" have special initialState function different from that used in useXStateSession
    const filtersInitialStateFunction = (): DataTableFilterMeta => {
        let filtersInit: DataTableFilterMeta | null = XUtils.getValueFromStorage(getStateKey(XStateKeySuffix.filters), null);
        if (filtersInit != null) {
            // we have filters from session - if we have props.filters, we always override the values from session (values from props.filters have higher priority)
            filtersInit = overrideFilters(filtersInit, props.filters);
        }
        else {
            // no filters in session
            filtersInit = createFiltersInit();
        }
        return filtersInit;
    }
    const [filters, setFilters] = useXStateSessionBase<DataTableFilterMeta>(getStateKey(XStateKeySuffix.filters), filtersInitialStateFunction); // filtrovanie na "controlled manner" (moze sa sem nainicializovat nejaka hodnota)
    const initFtsInputValue: XFtsInputValue | undefined = props.fullTextSearch ? createInitFtsInputValue() : undefined;
    const [ftsInputValue, setFtsInputValue] = useXStateSession<XFtsInputValue | undefined>(getStateKey(XStateKeySuffix.ftsInputValue), initFtsInputValue);
    const [optionalCustomFilter, setOptionalCustomFilter] = useXStateSession<XOptionalCustomFilter | undefined>(getStateKey(XStateKeySuffix.optionalCustomFilter), undefined);
    const [multilineSwitchValue, setMultilineSwitchValue] = props.multilineSwitchValue ?? useXStateSession<XMultilineRenderType>(getStateKey(XStateKeySuffix.multilineSwitchValue), props.multilineSwitchInitValue);
    const [multiSortMeta, setMultiSortMeta] = useXStateSession<DataTableSortMeta[] | undefined>(getStateKey(XStateKeySuffix.multiSortMeta), XUtilsCommon.createMultiSortMeta(props.sortField));
    const [selectedRow, setSelectedRow] = useXStateSession<any>(getStateKey(XStateKeySuffix.selectedRow), null);
    const [dataLoaded, setDataLoaded] = props.dataLoadedState ?? useState<boolean>(false); // priznak kde si zapiseme, ci uz sme nacitali data
    const [exportRowsDialogState, setExportRowsDialogState] = useState<XExportRowsDialogState>({dialogOpened: false});
    //const [exportRowsDialogRowCount, setExportRowsDialogRowCount] = useState<number>(); // param pre dialog
    const [filtersAfterFiltering, setFiltersAfterFiltering] = useState<DataTableFilterMeta>(filters); // sem si odkladame stav filtra po kliknuti na button Filter (chceme exportovat presne to co vidno vyfiltrovane)
    const [ftsInputValueAfterFiltering, setFtsInputValueAfterFiltering] = useState<XFtsInputValue | undefined>(ftsInputValue); // tak isto ako filtersAfterFiltering
    const [optionalCustomFilterAfterFiltering, setOptionalCustomFilterAfterFiltering] = useState<XOptionalCustomFilter | undefined>(optionalCustomFilter); // tak isto ako filtersAfterFiltering

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

        // pozor! tato metoda sa nevola, odkedy vzdy pouzivame filterElement na elemente Column (mame vo filtri vlastne komponenty ktore priamo volaju setFilters(...))

        //console.log("zavolany onFilter - this.state.filters = " + JSON.stringify(filters));
        //console.log("zavolany onFilter - event.filters = " + JSON.stringify(event.filters));

        // tymto zavolanim sa zapise znak zapisany klavesnicou do inputu filtra (ak prikaz zakomentujeme, input filtra zostane prazdny)
        setFilters(event.filters);
        removePagingFromStorage();
        loadDataBaseIfAutoFilter(event.filters, false);
    }

    const onSort = (event: any) => {

        //console.log("zavolany onSort - this.state.multiSortMeta = " + JSON.stringify(multiSortMeta));
        //console.log("zavolany onSort - event.multiSortMeta = " + JSON.stringify(event.multiSortMeta));

        setMultiSortMeta(event.multiSortMeta);
        const findParam: FindParam = createFindParam();
        findParam.multiSortMeta = event.multiSortMeta; // prepiseme multiSortMeta, lebo je tam stara hodnota (volanie setMultiSortMeta nezmeni multiSortMeta hned)
        loadDataBase(findParam);
    }

    const loadDataBaseIfAutoFilter = (filters: XDataTableFilterMeta, fieldAutoFilter: boolean) => {
        if (props.autoFilter || fieldAutoFilter) {
            const findParam: FindParam = createFindParam();
            findParam.filters = filters; // prepiseme filters, lebo je tam stara hodnota
            loadDataBase(findParam);
        }
    }

    const onClickFilter = () => {

        //console.log("zavolany onClickFilter");

        loadData();
    };

/*  povodna metoda, ktora iba vycistila filter
    const onClickClearFilter = () => {
        // najjednoduchsi sposob - pomeni aj pripadne nastavene matchMode hodnoty
        let filtersInit: DataTableFilterMeta = createFiltersInit();
        setFilters(filtersInit);

        if (ftsInputValue) {
            setFtsInputValue(createInitFtsInputValue());
        }

        if (props.optionalCustomFilters) {
            setOptionalCustomFilter(undefined);
        }
    };
*/

    const onClickResetTable = () => {
        // every session state variable set to init value from "props" or default value
        // (this code corresponds to init values in useXStateSession hooks)

        const firstLocal: number = 0;
        setFirst(firstLocal);

        const filtersLocal: DataTableFilterMeta = createFiltersInit();
        setFilters(filtersLocal);

        const ftsInputValueLocal: XFtsInputValue = createInitFtsInputValue();
        setFtsInputValue(ftsInputValueLocal);

        const optionalCustomFilterLocal: XOptionalCustomFilter | undefined = undefined;
        setOptionalCustomFilter(optionalCustomFilterLocal);

        setMultilineSwitchValue(props.multilineSwitchInitValue);

        const multiSortMetaLocal: DataTableSortMeta[] | undefined = XUtilsCommon.createMultiSortMeta(props.sortField);
        setMultiSortMeta(multiSortMetaLocal);

        setSelectedRow(null);

        // custom operations
        if (props.onResetTable) {
            props.onResetTable();
        }

        // at least because of sort change (icon shows sorting column) we have to read data from db right now
        const findParam: FindParam = createFindParam();
        // overwrite first, filters, ... with (potentially) new values
        findParam.first = firstLocal;
        findParam.filters = filtersLocal;
        findParam.fullTextSearch = createXFullTextSearch(ftsInputValueLocal);
        findParam.customFilterItems = createXCustomFilterItems(customFilterItems, optionalCustomFilterLocal);
        findParam.multiSortMeta = multiSortMetaLocal;
        loadDataBase(findParam);
    };

    const loadData = async () => {
        // pre poriadok zaserializujeme obidve operacie (aj ked teoreticky by to malo fungovat aj bez serializovania)
        await loadXFieldSetMaps();
        await loadDataBase(createFindParam());
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

    const loadXFieldSetMaps = async () => {
        const fieldSetIds: string[] = getFieldSetIds();
        if (fieldSetIds.length > 0) {
            // in the future - take from some cache, not from DB
            const xFieldSetMetaList: XFieldSetMeta[] = await XUtils.fetchRows('XFieldSetMeta', {where: "[fieldSetId] IN (:...fieldSetIdList)", params: {fieldSetIdList: fieldSetIds}});
            // check
            if (xFieldSetMetaList.length !== fieldSetIds.length) {
                throw `One or more of fieldSetIds "${fieldSetIds.join(", ")}" was not found in DB in the table for Entity XFieldSetMeta`;
            }
            const xFieldSetMapsLocal: XFieldSetMaps = {};
            for (const xFieldSetMeta of xFieldSetMetaList) {
                xFieldSetMapsLocal[xFieldSetMeta.fieldSetId] = XFieldSetBase.createXFieldXFieldMetaMap(xFieldSetMeta);
            }
            // save created structures
            setXFieldSetMaps(xFieldSetMapsLocal);
        }
    }

    const loadDataBase = async (findParam: FindParam) => {
        //console.log("zavolany loadDataBase - startIndex = " + findParam.first + ", endIndex = " + ((findParam.first ?? 0) + (findParam.rows ?? 0)) + ", filters = " + JSON.stringify(findParam.filters) + ", multiSortMeta = " + JSON.stringify(findParam.multiSortMeta) + ", fields = " + JSON.stringify(findParam.fields));
        setLoading(true);
        const findResult = await findByFilter(findParam);
        setValue(findResult);
        setupExpandedRows(findResult, multilineSwitchValue);
        setLoading(false);
        // save table state into session/local
        //saveTableState(findParam); <- old solution, state is saved immediatelly after change of some filter field, sorting, etc.
        // odlozime si filter hodnoty pre pripadny export - deep cloning vyzera ze netreba
        setFiltersAfterFiltering(filters);
        setFtsInputValueAfterFiltering(ftsInputValue ? {...ftsInputValue} : undefined);
        setOptionalCustomFilterAfterFiltering(optionalCustomFilter);
        // async check for new version - the purpose is to get new version of app to the browser (if available) in short time (10 minutes)
        // (if there is no new version, the check will run async (as the last operation) and nothing will happen)
        XUtils.reloadIfNewVersion();
    }

    const setupExpandedRows = (findResult: FindResult, multilineSwitchValue: XMultilineRenderType) => {
        if (props.rowExpansionTemplate) {
            const expandedRowsLocal: DataTableExpandedRows = {};
            if (findResult.rowList) {
                for (const row of findResult.rowList) {
                    let showExpandedRow: boolean = true; // default
                    if (props.showExpandedRow) {
                        showExpandedRow = props.showExpandedRow(row, multilineSwitchValue);
                    }
                    if (showExpandedRow) {
                        expandedRowsLocal[`${row[dataKey]}`] = true;
                    }
                }
            }
            setExpandedRows(expandedRowsLocal);
        }
    }

    const findByFilter = async (findParam: FindParam) : Promise<FindResult> => {

        // vysledok je typu FindResult
        const findResult: FindResult = await XUtils.fetchOne('lazyDataTableFindRows', findParam);
        findResult.totalRecords = parseInt(findResult.totalRecords as any as string);
        return findResult;
    }

/*
    const saveTableState = (findParam: FindParam) => {
        saveValueIntoStorage(XStateKeySuffix.filters, findParam.filters);
        saveValueIntoStorage(XStateKeySuffix.ftsInputValue, ftsInputValue);
        saveValueIntoStorage(XStateKeySuffix.optionalCustomFilter, optionalCustomFilter);
    }
*/

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
        return XUtilsCommon.filterAnd(customFilterItems, optionalCustomFilter?.filter);
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

    const getWidths = (): string[] => {
        // vrati sirky stlpcov napr. ['7.75rem', '20rem', '8.5rem', '8.5rem', '6rem']
        // nevracia aktualne sirky stlpcov (po manualnom rozsireni) ale tie ktore boli nastavene/vypocitane v kode
        let widths = [];
        let columns = dataTableEl.current.props.children;
        for (let column of columns) {
            widths.push(column.props.headerStyle?.width);
        }
        return widths;
    }

    const getFieldSetIds = (): string[] => {
        const fieldSetIds = [];
        // warning note: props.children are used to get props of XLazyColumn whereas dataTableEl.current.props.children are used to get props of Primereact DataTable
        const columns: XLazyColumnType[] = props.children as XLazyColumnType[];
        for (let column of columns) {
            if (column.props.fieldSetId) {
                fieldSetIds.push(column.props.fieldSetId);
            }
        }
        return fieldSetIds;
    }

    const hasContentTypeHtml = (): boolean => {

        const columns: XLazyColumnType[] = props.children as XLazyColumnType[];
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

        onRowDoubleClickBase(event.data);
    }

    const onRowDoubleClickBase = (row: any) => {
        if (props.onEdit !== undefined && props.searchBrowseParams === undefined) {
            props.onEdit(row);
        }
        else if (props.searchBrowseParams !== undefined) {
            props.searchBrowseParams.onChoose(row);
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
        const fields: string[] = getFields(false);
        const findParam: FindParam = {
            resultType: ResultType.OnlyRowCount,
            first: first,
            rows: rows,
            filters: filtersAfterFiltering,
            fullTextSearch: createXFullTextSearch(ftsInputValueAfterFiltering),
            customFilterItems: createXCustomFilterItems(customFilterItems, optionalCustomFilterAfterFiltering),
            multiSortMeta: multiSortMeta,
            entity: props.entity,
            fields: fields,
            aggregateItems: aggregateItems
        };
        //setLoading(true); - iba co preblikuje, netreba nam
        const findResult = await findByFilter(findParam);
        //setLoading(false);

        const exportParams: XExportParams = createExportParams(fields, findResult.totalRecords!);
        setExportRowsDialogState({dialogOpened: true, exportParams: exportParams});
    }

    const createExportParams = (fields: string[], rowCount: number): XExportParams => {
        const queryParam: LazyDataTableQueryParam = {
            filters: filtersAfterFiltering,
            fullTextSearch: createXFullTextSearch(ftsInputValueAfterFiltering),
            customFilterItems: createXCustomFilterItems(customFilterItems, optionalCustomFilterAfterFiltering),
            multiSortMeta: multiSortMeta,
            entity: props.entity,
            fields: fields
        };
        return {
            rowCount: rowCount,
            existsToManyAssoc: existsToManyAssoc(fields),
            queryParam: queryParam,
            headers: getHeaders(),
            widths: getWidths(),
            fieldsToDuplicateValues: props.exportFieldsToDuplicateValues,
            fileName: `${props.entity}`
        };
    }

    const existsToManyAssoc = (fields: string[]): boolean => {
        const xEntity: XEntity = XUtilsMetadataCommon.getXEntity(props.entity);
        return fields.some((value: string) => XUtilsMetadataCommon.hasPathToManyAssoc(xEntity, value));
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

    const onDropdownFilterChange = (field: string, displayValue: any, fieldAutoFilter: boolean) => {
        const filterValue: any | null = displayValue !== XUtils.dropdownEmptyOptionValue ? displayValue : null;
        setFilterValue(field, filterValue, FilterMatchMode.EQUALS, undefined, fieldAutoFilter);
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
        removePagingFromStorage();
        loadDataBaseIfAutoFilter(filtersCloned, false);
    }

    // vseobecna specialna metodka pouzvana pri custom filtri (XLazyColumn.filterElement)
    const getFilterItem = (field: string): DataTableFilterMetaData | DataTableOperatorFilterMetaData => {
        return filters[field];
    }

    // vseobecna metodka - nastavi hodnotu do filtra
    // ak je matchMode === undefined, tak zachova povodnu hodnotu matchMode
    const setFilterValue = (field: string, value: any | null, matchMode: any | undefined, customFilterItems: XCustomFilterItem[] | undefined, fieldAutoFilter: boolean) => {

        const filterValue: XDataTableFilterMetaData = filters[field] as XDataTableFilterMetaData; // funguje len pre filterDisplay="row"
        filterValue.value = value;
        if (matchMode !== undefined) {
            filterValue.matchMode = matchMode;
        }
        filterValue.customFilterItems = customFilterItems;
        // treba klonovat, inac react nezobrazi zmenenu hodnotu
        const filtersCloned: DataTableFilterMeta = {...filters};
        setFilters(filtersCloned);
        // we had problem when page was set to e.g. 3 (more than 1), after setting some filter value that caused that only 1 page should be returned
        // - after returning back to browse no rows were displayed (because requested page was 3) (this is quick fix)
        removePagingFromStorage();
        loadDataBaseIfAutoFilter(filtersCloned, fieldAutoFilter);
    }

    // vseobecna metodka - precita hodnotu z filtra (vrati napr. typ Date | null)
    const getFilterValue = (field: string) : any | null => {
        const filterValue: DataTableFilterMetaData = filters[field] as DataTableFilterMetaData; // funguje len pre filterDisplay="row"
        return filterValue.value;
    }

    // vseobecna metodka - vrati nastaveny match mode
    const getFilterMatchMode = (field: string) : any => {
        const filterValue: DataTableFilterMetaData = filters[field] as DataTableFilterMetaData; // funguje len pre filterDisplay="row"
        return filterValue.matchMode;
    }

    // ****** vseobecne metodky pre set/get do/z filtra - pre betweenFilter ********
    // do DataTableFilterMetaData.value ulozime dvojprvkove pole [value1, value2]
    // na backende spracujeme toto dvojprvkove pole

    const setFilterValue1 = (field: string, value: any | null, fieldAutoFilter: boolean) => {
        // na zaciatku (po inicializacii lazy table) je filterValue = null
        let filterValue: any[2] | null = getFilterValue(field);
        if (filterValue !== null) {
            filterValue[0] = value;
        }
        else {
            filterValue = [value, null];
        }
        setFilterValue(field, filterValue, FilterMatchMode.BETWEEN, undefined, fieldAutoFilter);
    }

    const setFilterValue2 = (field: string, value: any | null, fieldAutoFilter: boolean) => {
        // na zaciatku (po inicializacii lazy table) je filterValue = null
        let filterValue: any[2] | null = getFilterValue(field);
        if (filterValue !== null) {
            filterValue[1] = value;
        }
        else {
            filterValue = [null, value];
        }
        setFilterValue(field, filterValue, FilterMatchMode.BETWEEN, undefined, fieldAutoFilter);
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

    // after change from match mode xAutoComplete input displays [object Object] - trying resolving this hug does not work - I have no idea why
/*
    const onFilterMatchModeChange = (e: ColumnFilterMatchModeChangeEvent): void => {
        console.log(e.matchMode);
        console.log(e.field);
        console.log(getFilterValue(e.field));
        console.log(typeof (getFilterValue(e.field)));
        if (e.matchMode !== XFilterMatchMode.X_AUTO_COMPLETE) {
            const filterValue: any | null = getFilterValue(e.field);
            if (filterValue !== null && typeof filterValue === 'object') {
                console.log("idem volat setFilterValue");
                setFilterValue(e.field, null);
                console.log(getFilterValue(e.field));
            }
        }
    }
*/

    const valueAsUI = (value: any, xField: XField, contentType: XContentType | undefined, fieldSetId: string | undefined): React.ReactNode => {
        let valueResult: React.ReactNode;
        if (xField.type === "boolean") {
            // TODO - efektivnejsie by bolo renderovat len prislusne ikonky
            valueResult = <TriStateCheckbox value={value} disabled={true}/>
        }
        else if (xField.type === "jsonb" && fieldSetId) {
            // zatial sem dame; este by sme mohli dat hlbsie do convertValue/convertValueBase (aby fungovalo aj pre excel) ale tam je problem ze nemame k dispozicii "xFieldSetMaps"
            // poznamka: krajsie by bolo brat fieldSetId z xField ale to by sme museli vytvorit decorator na backend-e...
            valueResult = <div className={multilineSwitchValue === "fewLines" || multilineSwitchValue === "allLines" ? "x-multiline-content" : undefined}>{XFieldSetBase.xFieldSetValuesAsUI(value, xFieldSetMaps[fieldSetId])}</div>;
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
            const elemList: React.ReactNode[] = rowDataValue.map((value: any) => valueAsUI(value, xField, columnProps.contentType, columnProps.fieldSetId));
            bodyValue = <XMultilineRenderer valueList={elemList} renderType={multilineSwitchValue} fewLinesCount={props.multilineSwitchFewLinesCount}/>;
        }
        else {
            bodyValue = valueAsUI(rowDataValue, xField, columnProps.contentType, columnProps.fieldSetId);
        }
        return bodyValue;
    }

    // in order that row expansion works like standard row, we wrap row expansion into div
    const rowExpansionTemplate = (row: any, options: DataTableRowExpansionTemplate): React.ReactNode => {
        return (
            <div onClick={() => setSelectedRow(row)} onDoubleClick={() => onRowDoubleClickBase(row)}>
                {props.rowExpansionTemplate!(row, options)}
            </div>
        );
    };

    // ak mame scrollWidth/scrollHeight = viewport (default), vyratame scrollWidth/scrollHeight tak aby tabulka "sadla" do okna (viewport-u)

    const isMobile: boolean = XUtils.isMobile();

    let scrollWidth: string | undefined = undefined; // vypnute horizontalne scrollovanie
    let scrollHeight: string | undefined = undefined; // vypnute vertikalne scrollovanie

    if (props.scrollable) {
        if (props.scrollWidth !== "none") {
            scrollWidth = props.scrollWidth;
            if (scrollWidth === "viewport") {
                scrollWidth = `calc(100vw - ${isMobile ? 1 : 2.2}rem)`; // desktop - povodne bolo 1.4rem (20px okraje) namiesto 2.2 ale pri vela stlpcoch vznikal horizontalny scrollbar
                                                                        // mobil - padding 0.5rem body element
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
                    if (isMobile) {
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
    let paginatorLeft: JSX.Element;
    let paginatorRight: JSX.Element | undefined;
    let pageLinkSize: number;
    if (!isMobile) {
        paginatorLeft = <div>{xLocaleOption('totalRecords')}: {value.totalRecords}</div>;
        paginatorRight = <div/>;
        pageLinkSize = 5; // default
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
    }
    else {
        // na mobile setrime miesto
        paginatorLeft = <div style={{minWidth: '3rem'}}>{value.totalRecords}</div>;
        paginatorRight = <div style={{minWidth: '3rem'}}/>;
        pageLinkSize = 3;
    }

    let exportRows: boolean;
    if (props.searchBrowseParams !== undefined) {
        // export pre search button-y zatial vypneme
        exportRows = false;
    }
    else if (props.showExportRows !== undefined) {
        // mame explicitne definovane ci ano alebo nie
        exportRows = props.showExportRows;
    }
    else {
        // len na desktope zobrazime
        exportRows = !isMobile;
    }

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
            else if (getFilterMatchMode(childColumn.props.field) === XFilterMatchMode.X_AUTO_COMPLETE) {
                let assocField: string | undefined = undefined; // path to manyToOne assoc
                let displayField: string | string[] | undefined = undefined; // field/fields displayed in autocomplete (can be path)
                // if childColumn.props.autoComplete = true, then autoComplete = undefined and default autocomlete is created
                const autoComplete: XAutoCompleteInFilterProps | undefined = (typeof childColumn.props.autoComplete === 'object' ? childColumn.props.autoComplete : undefined);
                if (autoComplete) {
                    if (autoComplete.field) {
                        displayField = autoComplete.field;
                    }

                    if (autoComplete.assocField) {
                        // check - autoComplete.assocField must be prefix (part) of childColumn.props.field
                        if (!childColumn.props.field.startsWith(autoComplete.assocField + ".")) {
                            throw `XLazyColumn with field "${childColumn.props.field}": autoComplete.assocField "${autoComplete.assocField}" is not prefix of the field`;
                        }
                        assocField = autoComplete.assocField;
                        if (displayField === undefined) {
                            // take displayField from childColumn.props.field (rest of the path)
                            displayField = childColumn.props.field.substring(autoComplete.assocField.length + 1);
                        }
                    }
                }
                if (assocField === undefined) {
                    // default - take assocField/displayField from childColumn.props.field
                    const [assocFieldTemp, displayFieldTemp] = XUtilsCommon.getPathToAssocAndField(childColumn.props.field);
                    if (assocFieldTemp === null) {
                        throw `XLazyColumn with field "${childColumn.props.field}": unexpected error - path of length >= 2 expected`;
                    }
                    assocField = assocFieldTemp;
                    if (displayField === undefined) {
                        displayField = displayFieldTemp;
                    }
                }
                const xAssoc: XAssoc = XUtilsMetadataCommon.getXAssocToOneByPath(xEntity, assocField);
                const object: any | null = getFilterValue(childColumn.props.field);
                filterElement = <XAutoCompleteBase value={object} onChange={(object: any, objectChange: OperationType) => setFilterValue(childColumn.props.field, object, undefined, object !== null ? [{where: `[${assocField}] = ${object['id']}`, params: {}}] : undefined, childColumn.props.autoFilter)}
                                                   error={undefined} onErrorChange={(error: string | undefined) => {}} idField="id"
                                                   field={displayField!}
                                                   suggestionsQuery={{entity: xAssoc.entityName, filter: autoComplete?.filter, sortField: autoComplete?.sortField}}
                                                   searchBrowse={autoComplete?.searchBrowse} valueForm={autoComplete?.valueForm} addRowEnabled={false}
                                                   width="100%" scrollHeight={autoComplete?.scrollHeight}
                                                   suggestionsLoad="lazy" lazyLoadMaxRows={autoComplete?.lazyLoadMaxRows} minLength={autoComplete?.minLength}/>
            }
            else {
                if (xField.type === "boolean") {
                    const checkboxValue: boolean | null = getFilterValue(childColumn.props.field);
                    filterElement = <TriStateCheckbox value={checkboxValue} onChange={(e: any) => setFilterValue(childColumn.props.field, e.value, FilterMatchMode.EQUALS, undefined, childColumn.props.autoFilter)}/>;
                }
                else if (childColumn.props.dropdownInFilter) {
                    const dropdownValue = getDropdownFilterValue(childColumn.props.field);
                    filterElement = <XDropdownDTFilter entity={props.entity} path={childColumn.props.field}
                                                       value={dropdownValue} onValueChange={(field: string, displayValue: any) => onDropdownFilterChange(field, displayValue, childColumn.props.autoFilter)}
                                                       filter={childColumn.props.dropdownFilter} sortField={childColumn.props.dropdownSortField}/>
                }
                else if (xField.type === "string") {
                    const stringValue: string | null = getFilterValue(childColumn.props.field);
                    filterElement = <XInputTextBase value={stringValue} onChange={(value: string | null) => setFilterValue(childColumn.props.field, value, undefined, undefined, childColumn.props.autoFilter)}/>
                }
                else if (xField.type === "date" || xField.type === "datetime") {
                    betweenFilter = getBetweenFilter(childColumn.props.betweenFilter, props.betweenFilter);
                    if (betweenFilter !== undefined) {
                        // display: 'flex' umiestni XCalendar elementy vedla seba
                        filterElement =
                            <div style={betweenFilter === "row" ? {display: 'flex'} : undefined}>
                                <XCalendar value={getFilterValue1(childColumn.props.field)} onChange={(value: Date | null) => setFilterValue1(childColumn.props.field, value, childColumn.props.autoFilter)} scale={xField.scale} datetime={xField.type === "datetime"}/>
                                <XCalendar value={getFilterValue2(childColumn.props.field)} onChange={(value: Date | null) => setFilterValue2(childColumn.props.field, value, childColumn.props.autoFilter)} scale={xField.scale} datetime={xField.type === "datetime"}/>
                            </div>;
                    }
                    else {
                        const dateValue: Date | null = getFilterValue(childColumn.props.field);
                        filterElement = <XCalendar value={dateValue} onChange={(value: Date | null) => setFilterValue(childColumn.props.field, value, undefined, undefined, childColumn.props.autoFilter)} scale={xField.scale} datetime={xField.type === "datetime"}/>
                    }
                }
                else if (xField.type === "decimal" || xField.type === "number") {
                    const params = XUtilsMetadata.getParamsForInputNumber(xField);
                    betweenFilter = getBetweenFilter(childColumn.props.betweenFilter, props.betweenFilter);
                    if (betweenFilter !== undefined) {
                        // display: 'flex' umiestni input elementy pod seba (betweenFilter = "column") resp. vedla seba (betweenFilter = "row")
                        filterElement =
                            <div style={{display: 'flex', flexDirection: betweenFilter}}>
                                <XInputDecimalBase value={getFilterValue1(childColumn.props.field)} onChange={(value: number | null) => setFilterValue1(childColumn.props.field, value, childColumn.props.autoFilter)} {...params}/>
                                <XInputDecimalBase value={getFilterValue2(childColumn.props.field)} onChange={(value: number | null) => setFilterValue2(childColumn.props.field, value, childColumn.props.autoFilter)} {...params}/>
                            </div>;
                    }
                    else {
                        const numberValue: number | null = getFilterValue(childColumn.props.field);
                        filterElement = <XInputDecimalBase value={numberValue} onChange={(value: number | null) => setFilterValue(childColumn.props.field, value, undefined, undefined, childColumn.props.autoFilter)} {...params}/>
                    }
                }
            }

            // ************** dataType **************
            // depending on the dataType of the column, suitable match modes are displayed in filter
            let dataType: "text" | "numeric" | "date" = "text";
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

            // *********** filterMatchModeOptions ***********
            // we use the same match mode lists like the default lists in primereact, but in case of ManyToOne assoc we add match mode for autocomplete
            let filterMatchModeOptions: ColumnFilterMatchModeOptions[] | undefined = undefined;
            if (showFilterMenu) {
                // copy of primereact code (ColumnFilter.js)
                //filterMatchModeOptions = primeReactContext.filterMatchModeOptions![dataType].map((key) => ({ label: prLocaleOption(key), value: key }));
                filterMatchModeOptions = (primeReactContext && primeReactContext.filterMatchModeOptions![dataType].map((key) => ({ label: prLocaleOption(key), value: key }))) ||
                                            PrimeReact.filterMatchModeOptions![dataType].map((key) => ({ label: prLocaleOption(key), value: key }));

                if (isAutoCompleteInFilterEnabled(childColumn.props)) {
                    filterMatchModeOptions.push({label: xLocaleOption('xAutoComplete'), value: XFilterMatchMode.X_AUTO_COMPLETE});
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
                           filterElement={filterElement} dataType={dataType} showFilterMenu={showFilterMenu}
                           filterMatchModeOptions={filterMatchModeOptions} showClearButton={showClearButton} onFilterMatchModeChange={undefined /*onFilterMatchModeChange*/}
                           body={body} headerStyle={headerStyle} align={align}/>;
        }
    );

    // align-items-center centruje vertikalne (posuva smerom dolu do stredu)
    // x-lazy-datatable-label-right-compensation - vyvazuje label, aby item-y v strede isli aspon priblizne do stredu
    return (
        <div>
            <div className="flex justify-content-center align-items-center">
                {props.label ? <div className="x-lazy-datatable-label">{props.label}</div> : null}
                {ftsInputValue ? <XFtsInput value={ftsInputValue} onChange={(value: XFtsInputValue) => setFtsInputValue(value)}/> : null}
                {props.showFilterButtons ? <XButton key="filter" icon={isMobile ? "pi pi-search" : undefined} label={!isMobile ? xLocaleOption('filter') : undefined} onClick={onClickFilter} /> : null}
                {props.showFilterButtons ? <XButton key="resetTable" icon={isMobile ? "pi pi-ban" : undefined} label={!isMobile ? xLocaleOption('resetTable') : undefined} onClick={onClickResetTable} /> : null}
                {props.optionalCustomFilters ? <XOcfDropdown optionalCustomFilters={props.optionalCustomFilters} value={optionalCustomFilter} onChange={(value: XOptionalCustomFilter | undefined) => setOptionalCustomFilter(value)} className="m-1"/> : null}
                {props.multilineSwitch ? <XMultilineSwitch value={multilineSwitchValue} onChange={(switchValue: XMultilineRenderType) => {
                        setMultilineSwitchValue(switchValue);
                        setupExpandedRows(value, switchValue);
                    }} className="m-1"/> : null}
                {props.headerElementRight}
                {props.label && !isMobile ? <div className="x-lazy-datatable-label-right-compensation"/> : null}
            </div>
            <div className="flex justify-content-center">
                <DataTable value={value.rowList} dataKey={dataKey}
                           expandedRows={expandedRows} rowExpansionTemplate={props.rowExpansionTemplate ? rowExpansionTemplate : undefined}
                           paginator={props.paginator} pageLinkSize={pageLinkSize}
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
                {props.appButtonsForRow ? props.appButtonsForRow.map((xAppButton: XAppButtonForRow) => <XButton key={xAppButton.key} icon={xAppButton.icon} label={xAppButton.label} onClick={() => onClickAppButtonForRow(xAppButton.onClick)} style={xAppButton.style}/>) : null}
                {props.appButtons}
                {props.searchBrowseParams !== undefined ? <XButton key="choose" label={xLocaleOption('chooseRow')} onClick={onClickChoose}/> : null}
                {exportRows ? <XExportRowsDialog key="exportRowsDialog" dialogState={exportRowsDialogState} hideDialog={() => setExportRowsDialogState({dialogOpened: false})}/> : null}
            </div>
            {hasContentTypeHtml() ? <Editor style={{display: 'none'}} showHeader={false}/> : null /* we want to import css if needed (<style type="text/css" data-primereact-style-id="editor">) */}
        </div>
    );
}

XLazyDataTable.defaultProps = {
    paginator: true,
    rows: 10,
    filterDisplay: "row",
    autoFilter: false,
    showFilterButtons: true,
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

export type XAutoCompleteInFilterProps = {
    // copy of some props in XAutoComplete
    assocField?: string; // overrides default splitting of field prop (example: if field is "assocA.assocB.attrC", default assocField is "assocA.assocB", using this prop we can set assocField="assocA")
    filter?: XCustomFilter;
    sortField?: string | DataTableSortMeta[];
    // copy of some props in XAutoCompleteBase
    lazyLoadMaxRows?: number; // max pocet zaznamov ktore nacitavame pri suggestionsLoad = lazy
    field?: string | string[]; // field ktory zobrazujeme v input-e (niektory z fieldov objektu z value/suggestions)
    searchBrowse?: JSX.Element; // ak je zadany, moze uzivatel vyhladavat objekt podobne ako pri XSearchButton (obchadza tym suggestions)
    valueForm?: JSX.Element; // formular na editaciu aktualne vybrateho objektu; ak je undefined, neda sa editovat
    minLength?: number; // Minimum number of characters to initiate a search (default 1)
    scrollHeight?: string; // Maximum height of the suggestions panel.
};

export type XContentType = "multiline" | "html" | undefined;

export interface XLazyColumnProps {
    field: string;
    header?: any;
    align?: "left" | "center" | "right";
    dropdownInFilter?: boolean;
    dropdownFilter?: XCustomFilter;
    dropdownSortField?: string;
    autoComplete?: XAutoCompleteInFilterProps | true; // if autoComplete = true, the autocomplete is created automatically according to "field"
    //autoCompleteEnabled: true | false | "forStringOnly"; // default is "forStringOnly" (autocomplete enabled only on attributes of string type)
    showFilterMenu?: boolean;
    betweenFilter?: XBetweenFilterProp | "noBetween"; // creates 2 inputs from to, only for type date/datetime/decimal/number implemented, "row"/"column" - position of inputs from to
    autoFilter: boolean; // if true, filtering starts immediately after setting filter value (user does not have to click the button Filter) (default false)
    width?: string; // for example 150px or 10rem or 10% (value 10 means 10rem)
    contentType?: XContentType; // multiline (output from InputTextarea) - wraps the content; html (output from Editor) - for rendering raw html
    fieldSetId?: string; // in case that we render json attribute (output from XFieldSet), here is id of XFieldSet (saved in x_field_set_meta), fieldSet metadata is needed to get labels of field set attributes
                        // note: better solution would be take fieldSetId from json attribute from model, but we would have to create decorator for this purpose...
    aggregateType?: XAggregateFunction;
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
    //autoCompleteEnabled: "forStringOnly",
    columnViewStatus: true,  // XViewStatus.ReadWrite
    autoFilter: false
};
