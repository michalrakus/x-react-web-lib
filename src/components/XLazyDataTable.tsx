import React, {ReactChild, useEffect, useRef, useState} from 'react';
import {
    DataTable,
    DataTableFilterMeta,
    DataTableFilterMetaData,
    DataTableOperatorFilterMetaData,
    DataTableSortMeta
} from 'primereact/datatable';
import {Column} from 'primereact/column';
import {XButton} from "./XButton";
import {OperationType, XUtils} from "./XUtils";
import {SearchTableParams, XFieldFilter} from "./SearchTableParams";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XDropdownDTFilter} from "./XDropdownDTFilter";
import {XEntity, XField} from "../serverApi/XEntityMetadata";
import {dateAsUI, datetimeAsUI, numberAsUI} from "./XUtilsConversions";
import {FindResult} from "../serverApi/FindResult";
import {FindParam, ResultType, XCustomFilter} from "../serverApi/FindParam";
import {XButtonIconSmall} from "./XButtonIconSmall";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {CsvParam, ExportParam, ExportType} from "../serverApi/ExportImportParam";
import {XExportRowsDialog} from "./XExportRowsDialog";
import {FilterMatchMode, FilterOperator} from "primereact/api";
import {XOnSaveOrCancelProp} from "./XFormBase";

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

export interface XLazyDataTableProps {
    entity: string;
    dataKey?: string;
    paginator: boolean;
    rows: number;
    filterDisplay: "menu" | "row";
    scrollable: boolean; // default true, ak je false, tak je scrollovanie vypnute (scrollWidth/scrollHeight/formFooterHeight su ignorovane)
    scrollWidth: string; // hodnota "none" vypne horizontalne scrollovanie
    scrollHeight: string; // hodnota "none" vypne vertikalne scrollovanie
    formFooterHeight?: string; // pouziva sa (zatial) len pri deme - zadava sa sem vyska linkov na zdrojaky (SourceCodeLinkForm, SourceCodeLinkEntity) aby ich bolo vidno pri automatickom vypocte vysky tabulky
    shrinkWidth: boolean; // default true - ak je true, nerozsiruje stlpce na viac ako je ich explicitna sirka (nevznikaju "siroke" tabulky na celu dlzku parent elementu)
    onAddRow?: () => void;
    onEdit?: (selectedRow: any) => void;
    removeRow?: ((selectedRow: any) => Promise<boolean>) | boolean;
    onRemoveRow?: XOnSaveOrCancelProp;
    appButtons?: any;
    customFilter?: XCustomFilter; // (programatorsky) filter ktory sa aplikuje na zobrazovane data (uzivatel ho nedokaze zmenit)
    initSortField?: string;
    searchTableParams?: SearchTableParams;
    width?: string; // neviem ako funguje (najme pri pouziti scrollWidth/scrollHeight), ani sa zatial nikde nepouziva
    editMode?: boolean;
    editModeHandlers?: XEditModeHandlers;
    displayed?: boolean;
    children: ReactChild[];
}

export const XLazyDataTable = (props: XLazyDataTableProps) => {

    // must be here, is used in createInitFilters()
    const xEntity: XEntity = XUtilsMetadata.getXEntity(props.entity);

    const createInitFilters = () : DataTableFilterMeta => {

        const initFilters: DataTableFilterMeta = {};

        //let columns = dataTableEl.current.props.children; - does not work
        let columns = props.children;
        for (let column of columns) {
            const xLazyColumn = column as {props: XLazyColumnProps}; // nevedel som to krajsie...
            const field: string = xLazyColumn.props.field;
            const xField: XField = XUtilsMetadata.getXFieldByPath(xEntity, field);
            // TODO column.props.dropdownInFilter - pre "menu" by bolo fajn mat zoznam "enumov"
            const filterMatchMode: FilterMatchMode = getFilterMatchMode(xField);
            initFilters[field] = createFilterItem(props.filterDisplay, {value: null, matchMode: filterMatchMode});
        }

        return initFilters;
    }

    const getFilterMatchMode = (xField: XField) : FilterMatchMode => {
        let filterMatchMode: FilterMatchMode;
        if (xField.type === "string") {
            filterMatchMode = FilterMatchMode.STARTS_WITH;
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

    // premenne platne pre cely component (obdoba member premennych v class-e)
    const dataTableEl = useRef<any>(null);
    let customFilter: XCustomFilter | undefined = props.customFilter;

    const [value, setValue] = useState<FindResult>({rowList: [], totalRecords: 0});
    const [loading, setLoading] = useState(false);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(props.paginator ? props.rows : undefined);
    let filtersInit: DataTableFilterMeta = createInitFilters();
    if (props.searchTableParams !== undefined) {
        const displayFieldFilter: XFieldFilter | undefined = props.searchTableParams.displayFieldFilter;
        if (displayFieldFilter !== undefined) {
            filtersInit[displayFieldFilter.field] = createFilterItem(props.filterDisplay, displayFieldFilter.constraint);
        }
        // ak mame props.searchTableParams.customFilter, pridame ho
        customFilter = XUtils.filterAnd(customFilter, props.searchTableParams.customFilter);
    }
    const [filters, setFilters] = useState<DataTableFilterMeta>(filtersInit); // filtrovanie na "controlled manner" (moze sa sem nainicializovat nejaka hodnota)
    const [multiSortMeta, setMultiSortMeta] = useState<DataTableSortMeta[]>(props.initSortField ? [{field: props.initSortField, order: 1}] : []);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [dataLoaded, setDataLoaded] = useState<boolean>(false); // priznak kde si zapiseme, ci uz sme nacitali data
    const [exportRowsDialogOpened, setExportRowsDialogOpened] = useState<boolean>(false);
    const [exportRowsDialogRowCount, setExportRowsDialogRowCount] = useState<number>(); // param pre dialog
    const [filtersAfterFiltering, setFiltersAfterFiltering] = useState<DataTableFilterMeta>(filtersInit); // sem si odkladame stav filtra po kliknuti na button Filter (chceme exportovat presne to co vidno vyfiltrovane)

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
    const dataKey = props.dataKey !== undefined ? props.dataKey : XUtilsMetadata.getXEntity(props.entity).idField;

    const onPage = async (event: any) => {

        //console.log("zavolany onPage");

        setFirst(event.first);
        loadDataBase({resultType: ResultType.RowCountAndPagedRows, first: event.first, rows: rows, filters: filters, customFilter: customFilter, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields()});
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
        loadDataBase({resultType: ResultType.RowCountAndPagedRows, first: first, rows: rows, filters: filters, customFilter: customFilter, multiSortMeta: event.multiSortMeta, entity: props.entity, fields: getFields()});
    }

    const onClickFilter = () => {

        //console.log("zavolany onClickFilter");

        loadData();
    };

    const loadData = () => {
        loadDataBase({resultType: ResultType.RowCountAndPagedRows, first: first, rows: rows, filters: filters, customFilter: customFilter, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields()});
    }

    const loadDataBase = async (findParam: FindParam) => {
        //console.log("zavolany loadDataBase - startIndex = " + findParam.first + ", endIndex = " + ((findParam.first ?? 0) + (findParam.rows ?? 0)) + ", filters = " + JSON.stringify(findParam.filters) + ", multiSortMeta = " + JSON.stringify(findParam.multiSortMeta) + ", fields = " + JSON.stringify(findParam.fields));
        setLoading(true);
        const findResult = await findByFilter(findParam);
        setValue(findResult);
        setLoading(false);
        // odlozime si filter hodnoty pre pripadny export - deep cloning vyzera ze netreba
        setFiltersAfterFiltering(filters);
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

    const onSelectionChange = (event: any) => {
        //console.log("zavolany onSelectionChange");
        //console.log(event.value);

        setSelectedRow(event.value);
    }

    const onRowDoubleClick = (event: any) => {
        //console.log("zavolany onRowDoubleClick");
        //console.log(event.data);

        if (props.onEdit !== undefined) {
            props.onEdit(event.data);
        }
        else if (props.searchTableParams !== undefined) {
            props.searchTableParams.onChoose(event.data);
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
            alert("Please select the row.");
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
                    XUtils.showErrorMessage("Remove row failed.", e);
                }
                if (reread) {
                    loadData();
                    if (props.onRemoveRow) {
                        props.onRemoveRow(selectedRow, OperationType.Remove);
                    }
                }
            }
            else {
                if (window.confirm('Are you sure to remove the selected row?')) {
                    try {
                        // poznamka: vdaka await bude loadData() bezat az po dobehnuti requestu removeRow
                        await XUtils.removeRow(props.entity, selectedRow);
                    }
                    catch (e) {
                        XUtils.showErrorMessage("Remove row failed.", e);
                    }
                    loadData();
                    if (props.onRemoveRow) {
                        props.onRemoveRow(selectedRow, OperationType.Remove);
                    }
                }
            }
        }
        else {
            alert("Please select the row.");
        }
    }

    const onClickExport = async () => {

        // exportujeme zaznamy zodpovedajuce filtru
        // najprv zistime pocet zaznamov
        const findParam: FindParam = {resultType: ResultType.OnlyRowCount, first: first, rows: rows, filters: filtersAfterFiltering, customFilter: customFilter, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields()};
        //setLoading(true); - iba co preblikuje, netreba nam
        const findResult = await findByFilter(findParam);
        //setLoading(false);

        setExportRowsDialogRowCount(findResult.totalRecords); // param pre dialog
        setExportRowsDialogOpened(true);
    }

    const exportRowsDialogOnHide = async (ok: boolean, exportType: ExportType | undefined, csvParam: CsvParam | undefined) => {

        if (!ok || exportType === undefined) {
            setExportRowsDialogOpened(false);
            return;
        }

        setExportRowsDialogOpened(false);

        // samotny export
        const path = 'lazyDataTableExport';
        if (csvParam && csvParam.useHeaderLine) {
            csvParam.headers = getHeaders();
        }
        const exportParam: ExportParam = {exportType: exportType, filters: filtersAfterFiltering, customFilter: customFilter, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields(), csvParam: csvParam};
        let response;
        try {
            response = await XUtils.fetchBasicJson(path, exportParam);
        }
        catch (e) {
            XUtils.showErrorMessage("Export failed.", e);
            return;
        }
        const fileExt: string = exportType;
        const fileName = `${props.entity}.${fileExt}`;
        // let respJson = await response.json(); - konvertuje do json objektu
        let respBlob = await response.blob();

        // download blob-u (download by mal fungovat asynchronne a "stream-ovo" v spolupraci so servrom)
        let url = window.URL.createObjectURL(respBlob);
        let a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
    }

    const onClickChoose = () => {
        //console.log("zavolany onClickChoose");

        if (selectedRow !== null) {
            if (props.searchTableParams !== undefined) {
                props.searchTableParams.onChoose(selectedRow);
            }
        }
        else {
            console.log("Nie je vyselectovany ziaden zaznam.");
        }
    }

    // ****** checkbox vo filtri ********
    // pouziva sa len pre simple filtrovanie (filterDisplay="row")

    const onCheckboxFilterChange = (field: string, checkboxValue: boolean | null) => {
        // TODO - treba vyklonovat?
        const filtersCloned: DataTableFilterMeta = {...filters};
        if (checkboxValue !== null) {
            filtersCloned[field] = {value: checkboxValue ? "1" : "0", matchMode: FilterMatchMode.EQUALS};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny stav v checkboxe), zrusime polozku z filtra
            //delete filtersCloned[field];
            filtersCloned[field] = {value: null, matchMode: FilterMatchMode.EQUALS};
        }
        setFilters(filtersCloned);
    }

    const getCheckboxFilterValue = (field: string) : boolean | null => {
        let checkboxValue: boolean | null = null;
        const filterValue: DataTableFilterMetaData = filters[field] as DataTableFilterMetaData;
        if (filterValue !== undefined && filterValue !== null) {
            if (filterValue.value === '1') {
                checkboxValue = true;
            }
            else if (filterValue.value === '0') {
                checkboxValue = false;
            }
        }
        return checkboxValue;
    }

    // ****** dropdown vo filtri ********
    // pouziva sa len pre simple filtrovanie (filterDisplay="row")

    const onDropdownFilterChange = (field: string, displayValue: any) => {
        // TODO - treba vyklonovat?
        const filtersCloned: DataTableFilterMeta = {...filters};
        if (displayValue !== XUtils.dropdownEmptyOptionValue) {
            filtersCloned[field] = {value: displayValue, matchMode: FilterMatchMode.EQUALS};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny riadok), zrusime polozku z filtra
            //delete filtersCloned[field];
            filtersCloned[field] = {value: null, matchMode: FilterMatchMode.EQUALS};
        }
        setFilters(filtersCloned);
    }

    const getDropdownFilterValue = (field: string) : any => {
        let dropdownValue: any = XUtils.dropdownEmptyOptionValue;
        const filterValue: DataTableFilterMetaData = filters[field] as DataTableFilterMetaData;
        if (filterValue !== undefined && filterValue !== null) {
            if (filterValue.value !== null) {
                dropdownValue = filterValue.value;
            }
        }
        return dropdownValue;
    }

    const bodyTemplate = (columnProps: XLazyColumnProps, rowData: any, xField: XField): any => {
        const rowDataValue = XUtilsCommon.getValueByPath(rowData, columnProps.field);
        let bodyValue: any = '';
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
        else if (xField.type === "boolean") {
            // TODO - efektivnejsie by bolo renderovat len prislusne ikonky
            bodyValue = <TriStateCheckbox value={rowDataValue} disabled={true}/>
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
                scrollWidth = 'calc(100vw - 1.4rem)'; // 20px okraje
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
                if (props.searchTableParams === undefined) {
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

    let paginatorLeft = undefined;
    let paginatorRight = undefined;
    if (props.editMode === true) {
        paginatorLeft = <div/>; // paginatorLeft pouzivame, aby bol default paginator v strede (bez paginatorLeft je default paginator presunuty dolava)
        paginatorRight = <div>
                            <XButtonIconSmall icon="pi pi-save" onClick={() => props.editModeHandlers?.onSave()} tooltip="Save form"/>
                            <XButtonIconSmall icon="pi pi-times" onClick={() => props.editModeHandlers?.onCancel()} tooltip="Cancel editing"/>
                         </div>;
    }
    else if (props.editMode === false) {
        paginatorLeft = <div/>;
        paginatorRight = <XButtonIconSmall icon="pi pi-pencil" onClick={() => props.editModeHandlers?.onStart()} tooltip="Edit form"/>;
    }
    // else -> editMode is undefined - browse is not editable

    // export pre search button-y zatial vypneme
    const exportRows: boolean = (props.searchTableParams === undefined);

    // pre lepsiu citatelnost vytvarame stlpce uz tu
    const columnElemList: JSX.Element[] = React.Children.map(
        props.children,
        function(child) {
            // ak chceme zmenit child element, tak treba bud vytvorit novy alebo vyklonovat
            // priklad je na https://soshace.com/building-react-components-using-children-props-and-context-api/
            // (vzdy musime robit manipulacie so stlpcom, lebo potrebujeme pridat filter={true} sortable={true}
            const childColumn = child as any as {props: XLazyColumnProps}; // nevedel som to krajsie...
            const xField: XField = XUtilsMetadata.getXFieldByPath(xEntity, childColumn.props.field);

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
            let filterElement;
            if (xField.type === "boolean") {
                const checkboxValue: boolean | null = getCheckboxFilterValue(childColumn.props.field);
                filterElement = <TriStateCheckbox value={checkboxValue} onChange={(e: any) => onCheckboxFilterChange(childColumn.props.field, e.value)}/>;
            }
            else if (childColumn.props.dropdownInFilter) {
                const dropdownValue = getDropdownFilterValue(childColumn.props.field);
                filterElement = <XDropdownDTFilter entity={props.entity} path={childColumn.props.field} value={dropdownValue} onValueChange={onDropdownFilterChange}/>
            }

            // *********** showFilterMenu ***********
            let showFilterMenu: boolean;
            if (childColumn.props.showFilterMenu !== undefined) {
                showFilterMenu = childColumn.props.showFilterMenu;
            }
            else {
                showFilterMenu = true; // default
                if (props.filterDisplay === "row") {
                    if (xField.type === "boolean" || childColumn.props.dropdownInFilter) {
                        showFilterMenu = false;
                    }
                }
            }

            // *********** showClearButton ***********
            // pre filterDisplay = "row" nechceme clear button, chceme setrit miesto
            let showClearButton: boolean = props.filterDisplay === "menu";

            // *********** body ***********
            // TODO - mozno by bolo dobre vytvarat body pre kazdy field, nech je to vsetko konzistentne
            let body;
            if (xField.type === "decimal" || xField.type === "date" || xField.type === "datetime" || xField.type === "boolean") {
                body = (rowData: any) => {return bodyTemplate(childColumn.props, rowData, xField);};
            }

            // *********** width/headerStyle ***********
            let width: string | undefined = XUtils.processPropWidth(childColumn.props.width);
            if (width === undefined || width === "default") {
                // TODO - if filter not used at all, then buttons flags should be false
                const filterMenuInFilterRow: boolean = props.filterDisplay === "row" && showFilterMenu;
                const filterButtonInHeader: boolean = props.filterDisplay === "menu";
                width = XUtilsMetadata.computeColumnWidth(xField, filterMenuInFilterRow, undefined, headerLabel, true, filterButtonInHeader);
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

            return <Column field={childColumn.props.field} header={header} filter={true} sortable={true}
                           filterElement={filterElement} showFilterMenu={showFilterMenu} showClearButton={showClearButton}
                           body={body} headerStyle={headerStyle} align={align}/>;
        }
    );

    return (
        <div>
            <div className="flex justify-content-center">
                <XButton label="Filter" onClick={onClickFilter} />
            </div>
            <div className="flex justify-content-center">
                <DataTable value={value.rowList} dataKey={dataKey} paginator={props.paginator} rows={rows} totalRecords={value.totalRecords}
                           lazy={true} first={first} onPage={onPage} loading={loading}
                           filterDisplay={props.filterDisplay} filters={filters} onFilter={onFilter}
                           sortMode="multiple" removableSort={true} multiSortMeta={multiSortMeta} onSort={onSort}
                           selectionMode="single" selection={selectedRow} onSelectionChange={onSelectionChange}
                           onRowDoubleClick={onRowDoubleClick}
                           ref={dataTableEl} className="p-datatable-sm x-lazy-datatable" resizableColumns columnResizeMode="expand" tableStyle={tableStyle}
                           paginatorLeft={paginatorLeft} paginatorRight={paginatorRight}
                           scrollable={props.scrollable} scrollHeight={scrollHeight} style={style}>
                    {columnElemList}
                </DataTable>
            </div>
            <div className="flex justify-content-center">
                {props.onAddRow !== undefined ? <XButton label="Add row" onClick={onClickAddRow}/> : null}
                {props.onEdit !== undefined ? <XButton label="Edit" onClick={onClickEdit}/> : null}
                {props.removeRow !== undefined && props.removeRow !== false ? <XButton label="Remove row" onClick={onClickRemoveRow}/> : null}
                {exportRows ? <XButton label="Export rows" onClick={onClickExport} /> : null}
                {props.appButtons}
                {props.searchTableParams !== undefined ? <XButton label="Choose" onClick={onClickChoose}/> : null}
                {exportRows ? <XExportRowsDialog dialogOpened={exportRowsDialogOpened} rowCount={exportRowsDialogRowCount} onHideDialog={exportRowsDialogOnHide}/> : null}
            </div>
        </div>
    );
}

XLazyDataTable.defaultProps = {
    paginator: true,
    rows: 10,
    filterDisplay: "row",
    scrollable: true,
    scrollWidth: 'viewport', // nastavi sirku tabulky na (100vw - nieco) (ak bude obsah sirsi, zapne horizontalny scrollbar)
    scrollHeight: 'viewport', // nastavi vysku tabulky na (100vh - nieco) (ak bude obsah vecsi, zapne vertikalny scrollbar)
    shrinkWidth: true
};

export interface XLazyColumnProps {
    field: string;
    header?: any;
    align?: "left" | "center" | "right";
    dropdownInFilter?: boolean;
    showFilterMenu?: boolean;
    width?: string; // for example 150px or 10rem or 10% (value 10 means 10rem)
}

// TODO - XLazyColumn neni idealny nazov, lepsi je XColumn (ale zatial nechame XLazyColumn)
export const XLazyColumn = (props: XLazyColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}
