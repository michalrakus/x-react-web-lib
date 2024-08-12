import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import React, {Component, ReactChild} from "react";
import {XDropdownDT} from "./XDropdownDT";
import {
    DataTable,
    DataTableFilterMeta,
    DataTableFilterMetaData,
    DataTableOperatorFilterMetaData, DataTableSortMeta
} from "primereact/datatable";
import {Column, ColumnBodyOptions} from "primereact/column";
import {XButton} from "./XButton";
import {XInputTextDT} from "./XInputTextDT";
import {XSearchButtonDT} from "./XSearchButtonDT";
import {XAssoc, XEntity, XField} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtils, XViewStatus, XViewStatusOrBoolean} from "./XUtils";
import {XDropdownDTFilter} from "./XDropdownDTFilter";
import {XInputDecimalDT} from "./XInputDecimalDT";
import {XInputDateDT} from "./XInputDateDT";
import {XCheckboxDT} from "./XCheckboxDT";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {FilterMatchMode, FilterOperator} from "primereact/api";
import {XTableFieldChangeEvent} from "./XFieldChangeEvent";
import {XCustomFilter} from "../serverApi/FindParam";
import {XAutoCompleteDT} from "./XAutoCompleteDT";
import {XFormComponentDT} from "./XFormComponentDT";
import {XErrorMap} from "./XErrors";
import {XButtonIconNarrow} from "./XButtonIconNarrow";
import {IconType} from "primereact/utils";
import {ButtonProps} from "primereact/button";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {xLocaleOption} from "./XLocale";
import {XInputIntervalDT} from "./XInputIntervalDT";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";
import {XLazyColumnProps} from "./XLazyDataTable/XLazyDataTable";
import {XInputTextareaDT} from "./XInputTextareaDT";

// typ pre technicky field row.__x_rowTechData (row je item zoznamu editovaneho v XFormDataTable2)
export interface XRowTechData {
    // zoznam komponentov na riadku tabulky (vcetne XDropdownDT, XSearchButtonDT, ...)
    // po kliknuti na Save formulara sa iteruje tento zoznam a vola sa validacia pre kazdy komponent (input)
    // TODO - nebude to vadit react-u napr. koli performance? tento zoznam bude sucastou form.state.object, co nie je uplne idealne
    // (vyhoda ulozenia zoznamu do __x_rowTechData je to ze tento zoznam automaticky vznika a zanika pri inserte/delete noveho riadku
    xFormComponentDTList: Array<XFormComponentDT<any>>;
    // zoznam validacnych chyb (to iste co form.state.errorMap na XFormBase.ts pre hlavny objekt formularu)
    // chyby sem zapisuje automaticka validacia a pripadna custom validacia
    // chyby sa zobrazia (vycervenenie + tooltip) vo formulari zavolanim this.setState({object: this.state.object});
    // chyby sa renderuju (vycervenenie + tooltip) v komponentoch tak ze komponent cita chyby z tohto errorMap
    errorMap: XErrorMap;
}

export interface XDropdownOptionsMap {
    [assocField: string]: any[];
}

// POZNAMKA: parameter width?: string; neviem ako funguje (najme pri pouziti scrollWidth/scrollHeight), ani sa zatial nikde nepouziva
export interface XFormDataTableProps {
    form: XFormBase;
    assocField: string;
    dataKey?: string;
    paginator?: boolean;
    rows?: number;
    filterDisplay: "menu" | "row" | "none";
    sortable: boolean;
    sortField: string;
    scrollable: boolean; // default true, ak je false, tak je scrollovanie vypnute (scrollWidth/scrollHeight/formFooterHeight su ignorovane)
    scrollWidth?: string; // default 100%, hodnota "none" vypne horizontalne scrollovanie
    scrollHeight?: string; // default '200vh', hodnota "none" vypne vertikalne scrollovanie (ale lepsie je nechat '200vh')
    shrinkWidth: boolean; // default true - ak je true, nerozsiruje stlpce na viac ako je ich explicitna sirka (nevznikaju "siroke" tabulky na celu dlzku parent elementu)
    label?: string;
    readOnly?: boolean;
    showAddRemoveButtons?: boolean;
    onClickAddRow?: () => void;
    onClickRemoveRow?: (row: any) => void;
    removeButtonInRow: boolean; // default true, ak je true, na koniec kazdeho row-u sa zobrazi button X na remove (user nemusi selectovat row aby vykonal remove)
    addRowLabel?: string;
    addRowIcon?: IconType<ButtonProps>;
    removeRowLabel?: string;
    removeRowIcon?: IconType<ButtonProps>;
    width?: string;
    children: ReactChild[];
}

export class XFormDataTable2 extends Component<XFormDataTableProps> {

    public static defaultProps = {
        filterDisplay: "none",
        sortable: false,
        sortField: "idFieldOnUpdate",
        scrollable: true,
        scrollWidth: '100%', // hodnota '100%' zapne horizontalne scrollovanie, ak je tabulka sirsia ako parent element (a ten by mal byt max 100vw) (hodnota 'auto' (podobna ako '100%') nefunguje dobre)
        scrollHeight: '200vh', // ak by sme dali 'none' (do DataTable by islo undefined), tak nam nezarovnava header a body (v body chyba disablovany vertikalny scrollbar),
                                // tym ze pouzivame 200vh (max-height pre body), tak realne scrollovanie sa zapne az pri velmi vela riadkoch
        shrinkWidth: true,
        showAddRemoveButtons: true,
        removeButtonInRow: true,
        addRowIcon: "pi pi-plus",
        removeRowIcon: "pi pi-times"
    };

    props: XFormDataTableProps;
    entity?: string;
    dataKey?: string;
    dt: any;

    state: {
        selectedRow: {} | undefined;
        dropdownOptionsMap: XDropdownOptionsMap;
        filters: DataTableFilterMeta;
    };

    constructor(props: XFormDataTableProps) {
        super(props);
        this.props = props;
        this.dataKey = props.dataKey;
        const xEntityForm: XEntity = XUtilsMetadataCommon.getXEntity(props.form.getEntity());
        const xAssocToMany: XAssoc = XUtilsMetadataCommon.getXAssocToMany(xEntityForm, props.assocField);
        this.entity = xAssocToMany.entityName;
        if (this.dataKey === undefined) {
            this.dataKey = XUtilsMetadataCommon.getXEntity(this.entity).idField;
        }
        this.state = {
            selectedRow: undefined,
            dropdownOptionsMap: {},
            filters: this.createInitFilters()
        };
        this.onClickAddRow = this.onClickAddRow.bind(this);
        this.onClickRemoveRowBySelection = this.onClickRemoveRowBySelection.bind(this);
        this.removeRow = this.removeRow.bind(this);
        this.onSelectionChange = this.onSelectionChange.bind(this);
        this.onDropdownOptionsMapChange = this.onDropdownOptionsMapChange.bind(this);
        this.onFilter = this.onFilter.bind(this);
        this.onCheckboxFilterChange = this.onCheckboxFilterChange.bind(this);
        this.getCheckboxFilterValue = this.getCheckboxFilterValue.bind(this);
        this.onDropdownFilterChange = this.onDropdownFilterChange.bind(this);
        this.getDropdownFilterValue = this.getDropdownFilterValue.bind(this);
        this.bodyTemplate = this.bodyTemplate.bind(this);

        props.form.addXFormDataTable(this);

        //props.form.addField(props.assocField + '.*FAKE*'); - vzdy mame aspon 1 field, nie je to potrebne
        for (const child of props.children) {
            const childColumn = child as {props: XFormColumnBaseProps}; // nevedel som to krajsie...
            if (childColumn.props.type !== "custom") {
                const field = props.assocField + '.' + this.getPathForColumn(childColumn.props);
                props.form.addField(field);
            }
        }
    }

    getPathForColumn(columnProps: XFormColumnBaseProps): string {
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as XFormColumnProps);
            return columnPropsInputSimple.field;
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsDropdown = (columnProps as XFormDropdownColumnProps);
            return columnPropsDropdown.assocField + '.' + columnPropsDropdown.displayField;
        }
        else if (columnProps.type === "autoComplete") {
            const columnPropsAutoComplete = (columnProps as XFormAutoCompleteColumnProps);
            return columnPropsAutoComplete.assocField + '.' + columnPropsAutoComplete.displayField;
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as XFormSearchButtonColumnProps);
            return columnPropsSearchButton.assocField + '.' + columnPropsSearchButton.displayField;
        }
        else if (columnProps.type === "textarea") {
            const columnPropsTextarea = (columnProps as XFormTextareaColumnProps);
            return columnPropsTextarea.field;
        }
        else {
            throw "Unknown prop type = " + columnProps.type;
        }
    }

    static getHeader(columnProps: XFormColumnBaseProps, xEntity: XEntity, field: string, xField: XField): string {
        // poznamky - parametre field a xField by sme mohli vyratavat na zaklade columnProps ale kedze ich uz mame, setrime performance a neduplikujeme vypocet
        // nie je to tu uplne idealne nakodene, ale je to pomerne prehladne
        let isNullable: boolean = true;
        let readOnly: boolean = false;
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as XFormColumnProps);
            isNullable = xField.isNullable;
            readOnly = XFormDataTable2.isReadOnlyHeader(columnPropsInputSimple.field, columnProps.readOnly);
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsDropdown = (columnProps as XFormDropdownColumnProps);
            const xAssoc: XAssoc = XUtilsMetadataCommon.getXAssocToOne(xEntity, columnPropsDropdown.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = XFormDataTable2.isReadOnlyHeader(undefined, columnProps.readOnly);
        }
        else if (columnProps.type === "autoComplete") {
            const columnPropsAutoComplete = (columnProps as XFormAutoCompleteColumnProps);
            const xAssoc: XAssoc = XUtilsMetadataCommon.getXAssocToOne(xEntity, columnPropsAutoComplete.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = XFormDataTable2.isReadOnlyHeader(undefined, columnProps.readOnly);
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as XFormSearchButtonColumnProps);
            const xAssoc: XAssoc = XUtilsMetadataCommon.getXAssocToOne(xEntity, columnPropsSearchButton.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = XFormDataTable2.isReadOnlyHeader(undefined, columnProps.readOnly);
        }
        else if (columnProps.type === "textarea") {
            const columnPropsTextarea = (columnProps as XFormTextareaColumnProps);
            isNullable = xField.isNullable;
            readOnly = XFormDataTable2.isReadOnlyHeader(columnPropsTextarea.field, columnProps.readOnly);
        }
        else {
            throw "Unknown prop type = " + columnProps.type;
        }

        let header = columnProps.header ?? field;
        if (!isNullable && !readOnly) {
            header = XUtils.markNotNull(header);
        }
        return header;
    }

    // helper
    static isReadOnlyHeader(path: string | undefined , readOnly: XTableFieldReadOnlyProp | undefined): boolean {
        let isReadOnly: boolean;

        if (path && !XUtilsCommon.isSingleField(path)) {
            // if the length of field is 2 or more, then readOnly
            isReadOnly = true;
        }
            // formReadOnlyBase is called on the level XFormDataTable2
            // else if (this.props.form.formReadOnlyBase("xxx")) {
            //     isReadOnly = true;
        // }
        else if (typeof readOnly === 'boolean') {
            isReadOnly = readOnly;
        }
        else if (typeof readOnly === 'function') {
            isReadOnly = false;
        }
        else {
            // readOnly is undefined
            isReadOnly = false;
        }

        return isReadOnly;
    }

    getEntity(): string {
        if (this.entity === undefined) {
            throw `Unexpected error: this.entity is undefined`;
        }
        return this.entity;
    }

    createInitFilters(): DataTableFilterMeta {

        const initFilters: DataTableFilterMeta = {};

        if (this.props.filterDisplay === "none") {
            return initFilters;
        }

        const xEntity: XEntity = XUtilsMetadataCommon.getXEntity(this.getEntity());

        // TODO - asi by bolo fajn si tieto field, xField niekam ulozit a iterovat ulozene hodnoty, pouziva sa to na viacerych miestach
        for (const child of this.props.children) {
            const childColumn = child as {props: XFormColumnBaseProps}; // nevedel som to krajsie...
            // zatial nepodporujeme filter pre custom stlpce
            if (childColumn.props.type !== "custom") {
                const field: string | undefined = this.getPathForColumn(childColumn.props);
                const xField: XField = XUtilsMetadataCommon.getXFieldByPath(xEntity, field);
                // TODO column.props.dropdownInFilter - pre "menu" by bolo fajn mat zoznam "enumov"
                const filterMatchMode: FilterMatchMode = this.getFilterMatchMode(xField);
                let filterItem: DataTableFilterMetaData | DataTableOperatorFilterMetaData;
                if (this.props.filterDisplay === "menu") {
                    // DataTableOperatorFilterMetaData: operator + filter values
                    filterItem = {
                        operator: FilterOperator.OR,
                        constraints: [{value: null, matchMode: filterMatchMode}]
                    };
                }
                else {
                    // props.filterDisplay === "row"
                    // DataTableFilterMetaData: filter value
                    filterItem = {value: null, matchMode: filterMatchMode};
                }
                initFilters[field] = filterItem;
            }
        }

        return initFilters;
    }

    getFilterMatchMode(xField: XField): FilterMatchMode {
        let filterMatchMode: FilterMatchMode;
        if (xField.type === "string" || xField.type === "jsonb") {
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

    onSelectionChange(event: any): void {
        //console.log("zavolany onSelectionChange");
        //console.log(event.value);

        this.setState({selectedRow: event.value});
    }

    onDropdownOptionsMapChange(dropdownOptionsMap: XDropdownOptionsMap) {
        this.setState({dropdownOptionsMap: dropdownOptionsMap})
    }

    onFilter(event: any) {

        //console.log("zavolany onFilter - this.state.filters = " + JSON.stringify(this.state.filters));
        //console.log("zavolany onFilter - event.filters = " + JSON.stringify(event.filters));

        // tymto zavolanim sa zapise znak zapisany klavesnicou do inputu filtra (ak prikaz zakomentujeme, input filtra zostane prazdny)
        this.setState({filters: event.filters});
    }

    onCheckboxFilterChange(field: string, checkboxValue: boolean | null) {
        // TODO - treba vyklonovat?
        const filtersCloned: DataTableFilterMeta = {...this.state.filters};
        if (checkboxValue !== null) {
            filtersCloned[field] = {value: checkboxValue ? "true" : "false", matchMode: FilterMatchMode.EQUALS};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny stav v checkboxe), zrusime polozku z filtra
            //delete filtersCloned[field];
            filtersCloned[field] = {value: null, matchMode: FilterMatchMode.EQUALS};
        }
        this.setState({filters: filtersCloned});
    }

    getCheckboxFilterValue(field: string) : boolean | null {
        let checkboxValue: boolean | null = null;
        const filterValue: DataTableFilterMetaData = this.state.filters[field] as DataTableFilterMetaData;
        if (filterValue !== undefined && filterValue !== null) {
            if (filterValue.value === 'true') {
                checkboxValue = true;
            }
            else if (filterValue.value === 'false') {
                checkboxValue = false;
            }
        }
        return checkboxValue;
    }

    onDropdownFilterChange(field: string, displayValue: any) {
        // TODO - treba vyklonovat?
        const filtersCloned: DataTableFilterMeta = {...this.state.filters};
        if (displayValue !== XUtils.dropdownEmptyOptionValue) {
            filtersCloned[field] = {value: displayValue, matchMode: FilterMatchMode.EQUALS};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny riadok), zrusime polozku z filtra
            //delete filtersCloned[field];
            filtersCloned[field] = {value: null, matchMode: FilterMatchMode.EQUALS};
        }
        this.setState({filters: filtersCloned});
    }

    getDropdownFilterValue(field: string) : any {
        let dropdownValue: any = XUtils.dropdownEmptyOptionValue;
        const filterValue: DataTableFilterMetaData = this.state.filters[field] as DataTableFilterMetaData;
        if (filterValue !== undefined && filterValue !== null) {
            if (filterValue.value !== null) {
                dropdownValue = filterValue.value;
            }
        }
        return dropdownValue;
    }

/*  pravdepodobne zombie
    onBodyValueChange (field: string, rowData: any, newValue: any) {
        //console.log("onBodyValueChange");

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        rowData[field] = newValue;
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        this.props.form.onObjectDataChange();
    }
*/
    // body={(rowData: any) => bodyTemplate(childColumn.props.field, rowData)}
    bodyTemplate(columnProps: XFormColumnBaseProps, tableReadOnly: boolean, rowData: any, xEntity: XEntity): any {
        let body: any;
        // columnProps.columnViewStatus "ReadOnly" has higher prio then tableReadOnly
        // tableReadOnly has higher prio then property readOnly
        // (viewStatus "Hidden" - column is not rendered (bodyTemplate not called), viewStatus "ReadWrite" (default) - tableReadOnly/columnProps.readOnly is applied)
        let readOnly: XTableFieldReadOnlyProp | undefined;
        if (XUtils.xViewStatus(columnProps.columnViewStatus) === XViewStatus.ReadOnly) {
            readOnly = true;
        }
        else if (tableReadOnly) {
            readOnly = true;
        }
        else {
            readOnly = columnProps.readOnly;
        }
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as XFormColumnProps);
            const xField: XField = XUtilsMetadataCommon.getXFieldByPath(xEntity, columnPropsInputSimple.field);
            if (xField.type === "decimal" || xField.type === "number") {
                body = <XInputDecimalDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else if (xField.type === "date" || xField.type === "datetime") {
                body = <XInputDateDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else if (xField.type === "interval") {
                body = <XInputIntervalDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else if (xField.type === "boolean") {
                body = <XCheckboxDT form={this.props.form} xField={xField} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly}/>;
            }
            else {
                // xField.type === "string", pripadne ine jednoduche typy
                body = <XInputTextDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly}/>;
            }
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsDropdown = (columnProps as XFormDropdownColumnProps);
            body = <XDropdownDT form={this.props.form} entity={this.getEntity()} assocField={columnPropsDropdown.assocField} displayField={columnPropsDropdown.displayField} sortField={columnPropsDropdown.sortField} filter={columnPropsDropdown.filter} dropdownOptionsMap={this.state.dropdownOptionsMap} onDropdownOptionsMapChange={this.onDropdownOptionsMapChange} rowData={rowData} readOnly={readOnly}/>;
        }
        else if (columnProps.type === "autoComplete") {
            const columnPropsAutoComplete = (columnProps as XFormAutoCompleteColumnProps);
            body = <XAutoCompleteDT form={this.props.form} entity={this.getEntity()} assocField={columnPropsAutoComplete.assocField} displayField={columnPropsAutoComplete.displayField} searchBrowse={columnPropsAutoComplete.searchBrowse} assocForm={columnPropsAutoComplete.assocForm} filter={columnPropsAutoComplete.filter} sortField={columnPropsAutoComplete.sortField} fields={columnPropsAutoComplete.fields} suggestions={columnPropsAutoComplete.suggestions} rowData={rowData} readOnly={readOnly}/>;
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as XFormSearchButtonColumnProps);
            body = <XSearchButtonDT form={this.props.form} entity={this.getEntity()} assocField={columnPropsSearchButton.assocField} displayField={columnPropsSearchButton.displayField} searchBrowse={columnPropsSearchButton.searchBrowse} rowData={rowData} readOnly={columnPropsSearchButton.readOnly}/>;
        }
        else if (columnProps.type === "textarea") {
            const columnPropsTextarea = (columnProps as XFormTextareaColumnProps);
            body = <XInputTextareaDT form={this.props.form} entity={this.getEntity()} field={columnPropsTextarea.field} rows={columnPropsTextarea.rows} autoResize={columnPropsTextarea.autoResize} rowData={rowData} readOnly={columnPropsTextarea.readOnly}/>;
        }
        else {
            throw "Unknown prop type = " + columnProps.type;
        }

        return body;
    }

    onClickAddRow(): void {
        if (this.props.onClickAddRow) {
            // custom add row
            this.props.onClickAddRow();
        }
        else {
            // default add row
            this.props.form.onTableAddRow(this.props.assocField, {}, this.dataKey, this.state.selectedRow);
        }
    };

    onClickRemoveRowBySelection(): void {
        if (this.state.selectedRow !== undefined) {
            this.removeRow(this.state.selectedRow);
        }
        else {
            alert("Please select the row.");
        }
    };

    removeRow(row: any) {
        if (this.props.onClickRemoveRow) {
            // custom remove
            this.props.onClickRemoveRow(row);
        }
        else {
            // default remove
            this.props.form.onTableRemoveRow(this.props.assocField, row);
        }
    }

    validate() {
        // zvalidujeme vsetky rows a pripadne chyby zapiseme do specialneho fieldu __x_rowTechData
        const object: XObject = this.props.form.getXObject();
        const rowList: any[] = object[this.props.assocField];
        for (const row of rowList) {
            const xRowTechData: XRowTechData = XFormBase.getXRowTechData(row);
            const xErrorMap: XErrorMap = {};
            for (const xFormComponentDT of xRowTechData.xFormComponentDTList) {
                const errorItem = xFormComponentDT.validate();
                if (errorItem) {
                    //console.log("Mame field = " + errorItem.field);
                    xErrorMap[errorItem.field] = errorItem.xError;
                }
            }
            xRowTechData.errorMap = xErrorMap;
        }
    }

    // getErrorMessages(): string {
    //     let msg: string = "";
    //     const object: XObject = this.props.form.getXObject();
    //     const rowList: any[] = object[this.props.assocField];
    //     for (const row of rowList) {
    //         const xRowTechData: XRowTechData = XFormBase.getXRowTechData(row);
    //         msg += XUtils.getErrorMessages(xRowTechData.errorMap);
    //     }
    //     return msg;
    // }

    // TODO - velmi podobna funkcia ako XFormComponent.isReadOnly() - zjednotit ak sa da
    isReadOnly(): boolean {

        let readOnly: boolean;
        // the purpose of formReadOnly is to put the whole form to read only mode,
        // that's why the formReadOnly has higher prio then property this.props.readOnly
        if (this.props.form.formReadOnlyBase(this.props.assocField)) {
            readOnly = true;
        }
        else if (typeof this.props.readOnly === 'boolean') {
            readOnly = this.props.readOnly;
        }
        // TODO
        // else if (typeof this.props.readOnly === 'function') {
        //     // TODO - tazko povedat ci niekedy bude object === null (asi ano vid metodu getFilterBase)
        //     const object: XObject = this.props.form.state.object;
        //     if (object) {
        //         readOnly = this.props.readOnly(this.props.form.getXObject());
        //     }
        //     else {
        //         readOnly = true;
        //     }
        // }
        else {
            // readOnly is undefined
            readOnly = false;
        }

        return readOnly;
    }

    render() {
        const xEntity: XEntity = XUtilsMetadataCommon.getXEntity(this.getEntity());

        const paginator: boolean = this.props.paginator !== undefined ? this.props.paginator : false;
        let rows: number | undefined = undefined;
        if (paginator) {
            if (this.props.rows !== undefined) {
                rows = this.props.rows;
            }
            else {
                rows = 5; // default
            }
        }
        const filterDisplay: "menu" | "row" | undefined = this.props.filterDisplay !== "none" ? this.props.filterDisplay : undefined;
        let sortField: string | undefined = this.props.sortField;
        if (sortField === "idFieldOnUpdate") {
            // default sortovanie - ak mame insert tak nesortujeme (drzime poradie v akom user zaznam vytvoril), ak mame update tak podla id zosortujeme (nech je to zobrazene vzdy rovnako)
            sortField = (this.props.form.isAddRow() ? undefined : xEntity.idField);
        }
        else if (sortField === "none") {
            sortField = undefined;
        }
        const label = this.props.label !== undefined ? this.props.label : this.props.assocField;
        const readOnly = this.isReadOnly();

        // v bloku function (child) nejde pouzit priamo this, thisLocal uz ide pouzit
        const thisLocal = this;

        const object: XObject | null = this.props.form.state.object;
        const valueList = object !== null ? object[this.props.assocField] : [];

        let scrollWidth: string | undefined = undefined; // vypnute horizontalne scrollovanie
        let scrollHeight: string | undefined = undefined; // vypnute vertikalne scrollovanie

        if (this.props.scrollable) {
            if (this.props.scrollWidth !== "none") {
                scrollWidth = this.props.scrollWidth;
            }
            if (this.props.scrollHeight !== "none") {
                scrollHeight = this.props.scrollHeight;
            }
        }

        let style: React.CSSProperties = {};
        if (scrollWidth !== undefined) {
            style.width = scrollWidth;
        }

        if (this.props.shrinkWidth) {
            style.maxWidth = 'min-content'; // ak nic nedame (nechame auto), tak (v pripade ak nebudeme mat horizontalny scrollbar) natiahne tabulku na celu sirku stranky, co nechceme
        }

        // pri prechode z Primereact 6.x na 9.x sa tableLayout zmenil z fixed na auto a nefungovalo nastavenie sirok stlpcov - docasne teda takto
        let tableStyle: React.CSSProperties = {tableLayout: 'fixed'};
        if (this.props.width !== undefined) {
            let width: string = this.props.width;
            if (!isNaN(Number(width))) { // if width is number
                width = width + 'rem';
            }
            tableStyle = {...tableStyle, width: width};
        }

        // pre lepsiu citatelnost vytvarame stlpce uz tu
        const columnElemList: JSX.Element[] = React.Children.map(
            this.props.children.filter((child: React.ReactChild) => XUtils.xViewStatus((child as {props: XLazyColumnProps}).props.columnViewStatus) !== XViewStatus.Hidden),
            function (child) {
                // ak chceme zmenit child element, tak treba bud vytvorit novy alebo vyklonovat
                // priklad je na https://soshace.com/building-react-components-using-children-props-and-context-api/
                // (vzdy musime robit manipulacie so stlpcom, lebo potrebujeme pridat filter={true} sortable={true}
                const childColumn = child as {props: XFormColumnBaseProps}; // nevedel som to krajsie...
                const childColumnProps = childColumn.props;

                let fieldParam: string | undefined;
                let header: string | undefined;
                let filterElement;
                let showFilterMenu: boolean;
                let width: string | undefined;
                let align: "left" | "center" | "right" | undefined;
                let body;

                if (childColumnProps.type === "custom") {
                    // len jednoduche hodnoty, zatial nebude takmer ziadna podpora
                    const columnPropsCustom = (childColumnProps as XFormCustomColumnProps);
                    fieldParam = columnPropsCustom.field;
                    header = columnPropsCustom.header;
                    filterElement = undefined;
                    showFilterMenu = false;
                    width = XUtils.processPropWidth(columnPropsCustom.width);
                    align = undefined;
                    body = columnPropsCustom.body;
                }
                else {
                    // fieldy ktore su v modeli (existuje xField)

                    // je dolezite, aby field obsahoval cely path az po zobrazovany atribut, lebo podla neho sa vykonava filtrovanie a sortovanie
                    // (aj ked, da sa to prebit na stlpcoch (na elemente Column), su na to atributy)
                    const field: string = thisLocal.getPathForColumn(childColumnProps);

                    // TODO - toto by sa mohlo vytiahnut vyssie, aj v bodyTemplate sa vola metoda XUtilsMetadata.getXFieldByPath
                    const xField: XField = XUtilsMetadataCommon.getXFieldByPath(xEntity, field);

                    // *********** header ***********
                    header = XFormDataTable2.getHeader(childColumnProps, xEntity, field, xField);

                    // *********** filterElement ***********
                    if (thisLocal.props.filterDisplay !== "none") {
                        if (xField.type === "boolean") {
                            const checkboxValue: boolean | null = thisLocal.getCheckboxFilterValue(field);
                            filterElement = <TriStateCheckbox value={checkboxValue} onChange={(e: any) => thisLocal.onCheckboxFilterChange(field, e.value)}/>;
                        }
                        else if (childColumnProps.dropdownInFilter) {
                            const dropdownValue = thisLocal.getDropdownFilterValue(field);
                            filterElement = <XDropdownDTFilter entity={thisLocal.getEntity()} path={field} value={dropdownValue} onValueChange={thisLocal.onDropdownFilterChange}/>
                        }
                    }

                    // *********** showFilterMenu ***********
                    showFilterMenu = false;
                    if (thisLocal.props.filterDisplay !== "none") {
                        if (childColumnProps.showFilterMenu !== undefined) {
                            showFilterMenu = childColumnProps.showFilterMenu;
                        } else {
                            showFilterMenu = true; // default
                            if (thisLocal.props.filterDisplay === "row") {
                                if (xField.type === "boolean" || childColumnProps.dropdownInFilter) {
                                    showFilterMenu = false;
                                }
                            }
                        }
                    }

                    // *********** width/headerStyle ***********
                    width = XUtils.processPropWidth(childColumn.props.width);
                    if (width === undefined || width === "default") {
                        const filterMenuInFilterRow: boolean = thisLocal.props.filterDisplay === "row" && showFilterMenu;
                        const sortableButtonInHeader: boolean = thisLocal.props.sortable;
                        const filterButtonInHeader: boolean = thisLocal.props.filterDisplay === "menu";
                        width = XUtilsMetadata.computeColumnWidth(xField, undefined, filterMenuInFilterRow, childColumnProps.type, header, sortableButtonInHeader, filterButtonInHeader);
                    }

                    // *********** align ***********
                    align = undefined; // default undefined (left)
                    // do buducna
                    // if (childColumnProps.align !== undefined) {
                    //     align = childColumnProps.align;
                    // }
                    // else {
                    // decimal defaultne zarovnavame doprava
                    // if (xField.type === "decimal") {
                    //     align = "right";
                    // }
                    // else
                    if (xField.type === "boolean") {
                        align = "center";
                    }
                    // }

                    // *********** body ***********
                    body = (rowData: any) => {return thisLocal.bodyTemplate(childColumnProps, readOnly, rowData, xEntity);};
                    fieldParam = field;
                }

                // *********** showClearButton ***********
                // pre filterDisplay = "row" nechceme clear button, chceme setrit miesto
                let showClearButton: boolean = thisLocal.props.filterDisplay === "menu";

                let headerStyle: React.CSSProperties = {};
                if (width !== undefined) {
                    headerStyle = {width: width};
                }

                return <Column field={fieldParam} header={header} filter={thisLocal.props.filterDisplay !== "none"} sortable={thisLocal.props.sortable}
                               filterElement={filterElement} showFilterMenu={showFilterMenu} showClearButton={showClearButton}
                               headerStyle={headerStyle} align={align} body={body}/>;
            }
        );

        if (this.props.showAddRemoveButtons && this.props.removeButtonInRow) {
            // je dolezite nastavit sirku header-a, lebo inac ma stlpec sirku 0 a nevidno ho
            columnElemList.push(<Column key="removeButton" headerStyle={{width: '2rem'}} body={(rowData: any) => <XButtonIconNarrow icon="pi pi-times" onClick={() => this.removeRow(rowData)} disabled={readOnly} addMargin={false}/>}/>);
        }

        let addRowLabel: string | undefined = undefined;
        let removeRowLabel: string | undefined = undefined;
        if (this.props.showAddRemoveButtons) {
            // calling xLocaleOption does not work in standard default values initialisation place (public static defaultProps)
            addRowLabel = this.props.addRowLabel ?? xLocaleOption('addRow');
            removeRowLabel = this.props.removeRowLabel ?? xLocaleOption('removeRow');
        }

        return (
            <div>
                <div className="flex justify-content-center">
                    <label>{label}</label>
                    {/*<XButton label="Filter" onClick={onClickFilter} />*/}
                </div>
                <div className="flex justify-content-center">
                    <DataTable ref={(el) => this.dt = el} value={valueList} dataKey={this.dataKey} paginator={paginator} rows={rows}
                               totalRecords={valueList.length}
                               filterDisplay={filterDisplay} filters={this.state.filters} onFilter={this.onFilter}
                               sortMode="multiple" removableSort={true} multiSortMeta={sortField !== undefined ? [{field: sortField, order: 1}] : undefined}
                               selectionMode="single" selection={this.state.selectedRow} onSelectionChange={this.onSelectionChange}
                               className="p-datatable-sm x-form-datatable" resizableColumns columnResizeMode="expand" tableStyle={tableStyle}
                               scrollable={this.props.scrollable} scrollHeight={scrollHeight} style={style}>
                        {columnElemList}
                    </DataTable>
                </div>
                {this.props.showAddRemoveButtons ?
                    <div className="flex justify-content-center">
                        <XButton icon={this.props.addRowIcon} label={addRowLabel} onClick={this.onClickAddRow} disabled={readOnly}/>
                        {this.props.removeButtonInRow ? undefined : <XButton icon={this.props.removeRowIcon} label={removeRowLabel} onClick={this.onClickRemoveRowBySelection} disabled={readOnly}/>}
                    </div>
                    : undefined
                }
            </div>
        );
    }
}

export type XTableFieldOnChange = (e: XTableFieldChangeEvent<any, any>) => void;

export type XTableFieldReadOnlyProp = boolean | ((object: any, tableRow: any) => boolean);

// do buducna (kedze object mame vo formulari pristupny cez this.state.object, tak nepotrebujeme nutne pouzivat funkciu, vystacime si priamo s hodnotou)
//export type XFormColumnViewStatusProp = XViewStatusOrBoolean | ((object: any) => XViewStatusOrBoolean);

// typ property pre vytvorenie filtra na assoc fieldoch (XAutoComplete, XDropdown, ...)
// pouzivame (zatial) parameter typu any aby sme na formulari vedeli pouzit konkretny typ (alebo XObject)
export type XTableFieldFilterProp = XCustomFilter | ((object: any, rowData: any) => XCustomFilter | undefined);

export interface XFormColumnBaseProps {
    type: "inputSimple" | "dropdown" | "autoComplete" | "searchButton" | "textarea" | "custom";
    header?: any;
    readOnly?: XTableFieldReadOnlyProp;
    dropdownInFilter?: boolean; // moze byt len na stlpcoch ktore zobrazuju asociavany atribut (dlzka path >= 2)
    showFilterMenu?: boolean;
    width?: string; // for example 150px or 10rem or 10% (value 10 means 10rem)
    onChange?: XTableFieldOnChange;
    columnViewStatus: XViewStatusOrBoolean;
}

// default props for XFormColumnBaseProps
const XFormColumnBase_defaultProps = {
    columnViewStatus: true
};


export interface XFormColumnProps extends XFormColumnBaseProps {
    field: string;
}

export interface XFormDropdownColumnProps extends XFormColumnBaseProps {
    assocField: string;
    displayField: string;
    sortField?: string;
    filter?: XCustomFilter;
}

export interface XFormAutoCompleteColumnProps extends XFormColumnBaseProps {
    assocField: string;
    displayField: string;
    searchBrowse?: JSX.Element;
    assocForm?: JSX.Element; // na insert/update
    filter?: XTableFieldFilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // ak chceme pri citani suggestions nacitat aj asociovane objekty
    suggestions?: any[]; // ak chceme overridnut suggestions ziskavane cez asociaciu (pozri poznamky v XAutoCompleteDT)
}

export interface XFormSearchButtonColumnProps extends XFormColumnBaseProps {
    assocField: string;
    displayField: string;
    searchBrowse: JSX.Element;
}

export interface XFormTextareaColumnProps extends XFormColumnBaseProps {
    field: string;
    rows: number;
    autoResize?: boolean;
}

// TODO - XFormCustomColumnProps by nemal extendovat od XFormColumnBaseProps, niektore propertiesy nedavaju zmysel
export interface XFormCustomColumnProps extends XFormColumnBaseProps {
    body: React.ReactNode | ((data: any, options: ColumnBodyOptions) => React.ReactNode); // the same type as type of property Column.body
    field?: string; // koli pripadnemu sortovaniu/filtrovaniu
}

export const XFormColumn = (props: XFormColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XFormColumn.defaultProps = {
    ...XFormColumnBase_defaultProps,
    type: "inputSimple"
};

export const XFormDropdownColumn = (props: XFormDropdownColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XFormDropdownColumn.defaultProps = {
    ...XFormColumnBase_defaultProps,
    type: "dropdown"
};

export const XFormAutoCompleteColumn = (props: XFormAutoCompleteColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XFormAutoCompleteColumn.defaultProps = {
    ...XFormColumnBase_defaultProps,
    type: "autoComplete"
};

export const XFormSearchButtonColumn = (props: XFormSearchButtonColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XFormSearchButtonColumn.defaultProps = {
    ...XFormColumnBase_defaultProps,
    type: "searchButton"
};

export const XFormTextareaColumn = (props: XFormTextareaColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XFormTextareaColumn.defaultProps = {
    ...XFormColumnBase_defaultProps,
    type: "textarea",
    rows: 1,
    autoResize: true
};

export const XFormCustomColumn = (props: XFormCustomColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XFormCustomColumn.defaultProps = {
    ...XFormColumnBase_defaultProps,
    type: "custom"
};
