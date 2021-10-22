import React, {ReactChild, useEffect, useRef, useState} from 'react';
import {DataTable} from 'primereact/datatable';
import {Column} from 'primereact/column';
import {XButton} from "./XButton";
import {XUtils} from "./XUtils";
import {SearchTableParams} from "./SearchTableParams";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XDropdownDTFilter} from "./XDropdownDTFilter";
import {XEntity, XField} from "../serverApi/XEntityMetadata";
import {dateAsUI, datetimeAsUI, numberAsUI} from "./XUtilsConversions";
import {FindResult} from "../serverApi/FindResult";
import {Filters, FilterValue, FindParam, ResultType, SortMeta} from "../serverApi/FindParam";
import {XButtonIconSmall} from "./XButtonIconSmall";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {CsvParam, ExportParam, ExportType} from "../serverApi/ExportImportParam";
import {XExportRowsDialog} from "./XExportRowsDialog";

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
    rows?: number;
    scrollable: boolean; // default true, ak je false, tak je scrollovanie vypnute (scrollWidth/scrollHeight/formFooterHeight su ignorovane)
    scrollWidth?: string;
    scrollHeight?: string;
    formFooterHeight?: string; // pouziva sa (zatial) len pri deme - zadava sa sem vyska linkov na zdrojaky (SourceCodeLinkForm, SourceCodeLinkEntity) aby ich bolo vidno pri automatickom vypocte vysky tabulky
    shrinkWidth: boolean; // default true - ak je true, nerozsiruje stlpce na viac ako je ich explicitna sirka (nevznikaju "siroke" tabulky na celu dlzku parent elementu)
    onAddRow?: () => void;
    onEdit?: (selectedRow: any) => void;
    removeRow?: ((selectedRow: any) => Promise<boolean>) | boolean;
    appButtons?: any;
    searchTableParams?: SearchTableParams;
    width?: string; // neviem ako funguje (najme pri pouziti scrollWidth/scrollHeight), ani sa zatial nikde nepouziva
    editMode?: boolean;
    editModeHandlers?: XEditModeHandlers;
    displayed?: boolean;
    children: ReactChild[];
}

export const XLazyDataTable = (props: XLazyDataTableProps) => {

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
    const [exportRowsDialogOpened, setExportRowsDialogOpened] = useState<boolean>(false);
    const [exportRowsDialogRowCount, setExportRowsDialogRowCount] = useState<number>(); // param pre dialog
    const [filtersAfterFiltering, setFiltersAfterFiltering] = useState<Filters>(filtersInit); // sem si odkladame stav filtra po kliknuti na button Filter (chceme exportovat presne to co vidno vyfiltrovane)

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

    const dataKey = props.dataKey !== undefined ? props.dataKey : XUtilsMetadata.getXEntity(props.entity).idField;

    const onPage = async (event: any) => {

        //console.log("zavolany onPage");

        setFirst(event.first);
        loadDataBase({resultType: ResultType.RowCountAndPagedRows, first: event.first, rows: rows, filters: filters, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields()});
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
        loadDataBase({resultType: ResultType.RowCountAndPagedRows, first: first, rows: rows, filters: filters, multiSortMeta: event.multiSortMeta, entity: props.entity, fields: getFields()});
    }

    const onClickFilter = () => {

        //console.log("zavolany onClickFilter");

        loadData();
    };

    const loadData = () => {
        loadDataBase({resultType: ResultType.RowCountAndPagedRows, first: first, rows: rows, filters: filters, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields()});
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
        const findParam: FindParam = {resultType: ResultType.OnlyRowCount, first: first, rows: rows, filters: filtersAfterFiltering, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields()};
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
        const exportParam: ExportParam = {exportType: exportType, filters: filtersAfterFiltering, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields(), csvParam: csvParam};
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

    const onCheckboxFilterChange = (field: string, checkboxValue: boolean | null) => {
        // TODO - treba vyklonovat?
        const filtersCloned: Filters = {...filters};
        if (checkboxValue !== null) {
            filtersCloned[field] = {value: checkboxValue ? "1" : "0", matchMode: "equals"};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny stav v checkboxe), zrusime polozku z filtra
            delete filtersCloned[field];
        }
        setFilters(filtersCloned);
    }

    const getCheckboxFilterValue = (field: string) : boolean | null => {
        let checkboxValue: boolean | null = null;
        const filterValue: FilterValue = filters[field];
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

    const xEntity: XEntity = XUtilsMetadata.getXEntity(props.entity);

    // ak nemame scrollWidth/scrollHeight zadane, vyratame scrollWidth/scrollHeight tak aby tabulka "sadla" okna (viewport-u)

    let scrollWidth: string | undefined;
    let scrollHeight: string | undefined;

    if (props.scrollable) {
        scrollWidth = props.scrollWidth;
        if (scrollWidth === undefined || scrollWidth === "default") {
            scrollWidth = 'calc(100vw - 1.4rem)'; // 20px okraje
        }

        scrollHeight = props.scrollHeight;
        if (scrollHeight === undefined || scrollHeight === "default") {
            // vypocet je priblizny, robeny na mobil, desktop bude mat mozno iny
            //const headerHeight = XUtils.toPX0('12.7rem');
            //let footerHeight = XUtils.toPX0('3.7rem') + XUtils.toPX0('3rem'); // table footer (paging) + buttons Add row, Edit, ...
            // na desktope mi nechce odpocitat vysku taskbar-u od window.screen.availHeight, tak to poriesime takymto hack-om:
            // if (!XUtils.isMobile()) {
            //     footerHeight += XUtils.toPX0('6rem'); // priblizna vyska taskbaru (ak mam 2 rady buttonov)
            // }
            let headerFooterHeight = 344.35 - XUtils.toPX0('4.43rem'); // experimentalne zistena vyska header/footer (body - table body) bez formFooterHeight
            // este pridame vysku linkov na zdrojaky, ak treba
            if (props.formFooterHeight !== undefined) {
                headerFooterHeight += XUtils.toPX0(XUtils.processGridBreakpoints(props.formFooterHeight));
            }
            scrollHeight = `calc(100vh - ${headerFooterHeight}px)`;
        }
    }

    let style: React.CSSProperties = {};
    if (scrollWidth !== undefined) {
        style.width = scrollWidth;
    }

    if (props.shrinkWidth) {
        style.maxWidth = 'min-content'; // ak nic nedame (nechame auto), tak (v pripade ak nebudeme mat horizontalny scrollbar) natiahne tabulku na celu sirku stranky, co nechceme
    }

    let tableStyle;
    if (props.width !== undefined) {
        let width: string = props.width;
        if (!isNaN(Number(width))) { // if width is number
            width = width + 'rem';
        }
        tableStyle = {width: width};
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

            // *********** body ***********
            // TODO - mozno by bolo dobre vytvarat body pre kazdy field, nech je to vsetko konzistentne
            let body;
            if (xField.type === "decimal" || xField.type === "date" || xField.type === "datetime" || xField.type === "boolean") {
                body = (rowData: any) => {return bodyTemplate(childColumn.props, rowData, xField);};
            }

            // *********** width/headerStyle ***********
            let width: string | undefined = XUtils.processPropWidth(childColumn.props.width);
            if (width === undefined || width === "default") {
                width = XUtilsMetadata.computeColumnWidth(xField, undefined, headerLabel);
            }
            let headerStyle;
            if (width !== undefined) {
                headerStyle = {width: width};
            }

            // *********** align ***********
            let align = "left"; // default
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

            // *********** style ***********
            let style;
            // TODO - pouzit className a nie style
            if (align === "center" || align === "right") {
                style = {'textAlign': align};
                headerStyle = {...headerStyle, ...style}; // headerStyle overrides style in TH cell
            }

            return <Column field={childColumn.props.field} header={header} filter={true} sortable={true}
                           filterElement={filterElement} body={body} headerStyle={headerStyle} style={style}/>;
        }
    );

    return (
        <div>
            <div className="flex justify-content-center">
                <XButton label="Filter" onClick={onClickFilter} />
            </div>
            <div className="flex justify-content-center">
                <DataTable value={value.rowList} dataKey={dataKey} paginator={true} rows={rows} totalRecords={value.totalRecords}
                           lazy={true} first={first} onPage={onPage} loading={loading}
                           filters={filters} onFilter={onFilter}
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
                <XButton label="Export rows" onClick={onClickExport} />
                {props.appButtons}
                <XExportRowsDialog dialogOpened={exportRowsDialogOpened} rowCount={exportRowsDialogRowCount} onHideDialog={exportRowsDialogOnHide}/>
                {props.searchTableParams !== undefined ? <XButton label="Choose" onClick={onClickChoose}/> : null}
            </div>
        </div>
    );
}

XLazyDataTable.defaultProps = {
    scrollable: true,
    shrinkWidth: true
};

export interface XLazyColumnProps {
    field: string;
    header?: any;
    align?: "left" | "center" | "right";
    dropdownInFilter?: boolean;
    width?: string; // for example 150px or 10rem or 10% (value 10 means 10rem)
}

// TODO - XLazyColumn neni idealny nazov, lepsi je XColumn (ale zatial nechame XLazyColumn)
export const XLazyColumn = (props: XLazyColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}
