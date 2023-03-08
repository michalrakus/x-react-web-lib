import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import React, {Component, ReactChild} from "react";
import {XDropdownDT} from "./XDropdownDT";
import {DataTable} from "primereact/datatable";
import {Column} from "primereact/column";
import {XButton} from "./XButton";
import {XInputTextDT} from "./XInputTextDT";
import {XSearchButtonDT} from "./XSearchButtonDT";
import {Filters, FilterValue} from "../serverApi/FindParam";
import {XAssoc, XEntity, XField} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtils} from "./XUtils";
import {XDropdownDTFilter} from "./XDropdownDTFilter";
import {XInputDecimalDT} from "./XInputDecimalDT";
import {XInputDateDT} from "./XInputDateDT";
import {XCheckboxDT} from "./XCheckboxDT";
import {TriStateCheckbox} from "primereact/tristatecheckbox";

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
    scrollable: boolean; // default true, ak je false, tak je scrollovanie vypnute (scrollWidth/scrollHeight/formFooterHeight su ignorovane)
    scrollWidth?: string; // default 100%, hodnota "none" vypne horizontalne scrollovanie
    scrollHeight?: string; // default '200vh', hodnota "none" vypne vertikalne scrollovanie (ale lepsie je nechat '200vh')
    shrinkWidth: boolean; // default true - ak je true, nerozsiruje stlpce na viac ako je ich explicitna sirka (nevznikaju "siroke" tabulky na celu dlzku parent elementu)
    label?: string;
    readOnly?: boolean;
    onClickAddRow?: () => void;
    onClickRemoveRow?: () => void;
    width?: string;
    children: ReactChild[];
}

export class XFormDataTable2 extends Component<XFormDataTableProps> {

    public static defaultProps = {
        scrollable: true,
        scrollWidth: '100%', // hodnota '100%' zapne horizontalne scrollovanie, ak je tabulka sirsia ako parent element (a ten by mal byt max 100vw) (hodnota 'auto' (podobna ako '100%') nefunguje dobre)
        scrollHeight: '200vh', // ak by sme dali 'none' (do DataTable by islo undefined), tak nam nezarovnava header a body (v body chyba disablovany vertikalny scrollbar),
                                // tym ze pouzivame 200vh (max-height pre body), tak realne scrollovanie sa zapne az pri velmi vela riadkoch
        shrinkWidth: true
    };

    props: XFormDataTableProps;
    entity?: string;
    dataKey?: string;
    dt: any;

    state: {
        selectedRow: {} | undefined;
        dropdownOptionsMap: XDropdownOptionsMap;
        filters: Filters;
    };

    constructor(props: XFormDataTableProps) {
        super(props);
        this.props = props;
        this.dataKey = props.dataKey;
        const xEntityForm: XEntity = XUtilsMetadata.getXEntity(props.form.getEntity());
        const xAssocToMany: XAssoc = XUtilsMetadata.getXAssocToMany(xEntityForm, props.assocField);
        this.entity = xAssocToMany.entityName;
        if (this.dataKey === undefined) {
            this.dataKey = XUtilsMetadata.getXEntity(this.entity).idField;
        }
        this.state = {
            selectedRow: undefined,
            dropdownOptionsMap: {},
            filters: {}
        };
        this.onClickAddRowDefault = this.onClickAddRowDefault.bind(this);
        this.onClickRemoveRowDefault = this.onClickRemoveRowDefault.bind(this);
        this.onSelectionChange = this.onSelectionChange.bind(this);
        this.onDropdownOptionsMapChange = this.onDropdownOptionsMapChange.bind(this);
        this.onFilter = this.onFilter.bind(this);
        this.onCheckboxFilterChange = this.onCheckboxFilterChange.bind(this);
        this.getCheckboxFilterValue = this.getCheckboxFilterValue.bind(this);
        this.onDropdownFilterChange = this.onDropdownFilterChange.bind(this);
        this.getDropdownFilterValue = this.getDropdownFilterValue.bind(this);
        this.bodyTemplate = this.bodyTemplate.bind(this);

        //props.form.addField(props.assocField + '.*FAKE*'); - vzdy mame aspon 1 field, nie je to potrebne
        for (const child of props.children) {
            const childColumn = child as any as {props: XFormColumnProps}; // nevedel som to krajsie...
            const field = props.assocField + '.' + XFormDataTable2.getPathForColumn(childColumn.props);
            props.form.addField(field);
        }
    }

    static getPathForColumn(columnProps: XFormColumnProps): string {
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as XFormInputSimpleColumnProps);
            return columnPropsInputSimple.field;
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsDropdown = (columnProps as XFormDropdownColumnProps);
            return columnPropsDropdown.assocField + '.' + columnPropsDropdown.displayField;
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as XFormSearchButtonColumnProps);
            return columnPropsSearchButton.assocField + '.' + columnPropsSearchButton.displayField;
        }
        else {
            throw "Unknown prop type = " + columnProps.type;
        }
    }

    static getHeader(columnProps: XFormColumnProps, xEntity: XEntity, field: string, xField: XField): string {
        // poznamky - parametre field a xField by sme mohli vyratavat na zaklade columnProps ale kedze ich uz mame, setrime performance a neduplikujeme vypocet
        // nie je to tu uplne idealne nakodene, ale je to pomerne prehladne
        let isNullable: boolean = true;
        let readOnly: boolean = false;
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as XFormInputSimpleColumnProps);
            isNullable = xField.isNullable;
            readOnly = XUtils.isReadOnly(columnPropsInputSimple.field, columnProps.readOnly);
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsDropdown = (columnProps as XFormDropdownColumnProps);
            const xAssoc: XAssoc = XUtilsMetadata.getXAssocToOne(xEntity, columnPropsDropdown.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = columnProps.readOnly ?? false;
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as XFormSearchButtonColumnProps);
            const xAssoc: XAssoc = XUtilsMetadata.getXAssocToOne(xEntity, columnPropsSearchButton.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = columnProps.readOnly ?? false;
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

    getEntity(): string {
        if (this.entity === undefined) {
            throw `Unexpected error: this.entity is undefined`;
        }
        return this.entity;
    }

    onSelectionChange(event: any): void {
        console.log("zavolany onSelectionChange");
        console.log(event.value);

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
        const filtersCloned: Filters = {...this.state.filters};
        if (checkboxValue !== null) {
            filtersCloned[field] = {value: checkboxValue ? "true" : "false", matchMode: "equals"};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny stav v checkboxe), zrusime polozku z filtra
            delete filtersCloned[field];
        }
        this.setState({filters: filtersCloned});
    }

    getCheckboxFilterValue(field: string) : boolean | null {
        let checkboxValue: boolean | null = null;
        const filterValue: FilterValue = this.state.filters[field];
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
        const filtersCloned: Filters = {...this.state.filters};
        if (displayValue !== XUtils.dropdownEmptyOptionValue) {
            filtersCloned[field] = {value: displayValue, matchMode: "equals"};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny riadok), zrusime polozku z filtra
            delete filtersCloned[field];
        }
        this.setState({filters: filtersCloned});
    }

    getDropdownFilterValue(field: string) : any {
        let dropdownValue: any = XUtils.dropdownEmptyOptionValue;
        const filterValue: FilterValue = this.state.filters[field];
        if (filterValue !== undefined && filterValue !== null) {
            dropdownValue = filterValue.value;
        }
        return dropdownValue;
    }

    onBodyValueChange (field: string, rowData: any, newValue: any) {
        //console.log("onBodyValueChange");

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        rowData[field] = newValue;
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        this.props.form.onObjectDataChange();
    }

    // body={(rowData: any) => bodyTemplate(childColumn.props.field, rowData)}
    bodyTemplate (columnProps: XFormColumnProps, rowData: any, xEntity: XEntity): any {
        let body: any;
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as XFormInputSimpleColumnProps);
            const xField: XField = XUtilsMetadata.getXFieldByPath(xEntity, columnPropsInputSimple.field);
            if (xField.type === "decimal" || xField.type === "number") {
                body = <XInputDecimalDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={columnPropsInputSimple.readOnly}/>;
            }
            else if (xField.type === "date" || xField.type === "datetime") {
                body = <XInputDateDT form={this.props.form} xField={xField} field={columnPropsInputSimple.field} rowData={rowData} readOnly={columnPropsInputSimple.readOnly}/>;
            }
            else if (xField.type === "boolean") {
                body = <XCheckboxDT form={this.props.form} xField={xField} field={columnPropsInputSimple.field} rowData={rowData} readOnly={columnPropsInputSimple.readOnly}/>;
            }
            else {
                // xField.type === "string", pripadne ine jednoduche typy
                body = <XInputTextDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={columnPropsInputSimple.readOnly}/>;
            }
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsDropdown = (columnProps as XFormDropdownColumnProps);
            body = <XDropdownDT form={this.props.form} entity={this.getEntity()} assocField={columnPropsDropdown.assocField} displayField={columnPropsDropdown.displayField} dropdownOptionsMap={this.state.dropdownOptionsMap} onDropdownOptionsMapChange={this.onDropdownOptionsMapChange} rowData={rowData}/>;
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as XFormSearchButtonColumnProps);
            body = <XSearchButtonDT form={this.props.form} entity={this.getEntity()} assocField={columnPropsSearchButton.assocField} displayField={columnPropsSearchButton.displayField} searchTable={columnPropsSearchButton.searchTable} rowData={rowData} readOnly={columnPropsSearchButton.readOnly}/>;
        }
        else {
            throw "Unknown prop type = " + columnProps.type;
        }

        return body;
    }

    onClickAddRowDefault(): void {
        this.props.form.onTableAddRow(this.props.assocField, {}, this.dataKey, this.state.selectedRow);
    };

    onClickRemoveRowDefault(): void {
        if (this.state.selectedRow !== undefined) {
            this.props.form.onTableRemoveRow(this.props.assocField, this.state.selectedRow);
        }
        else {
            alert("Please select the row.");
        }
    };

    render() {
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
        const label = this.props.label !== undefined ? this.props.label : this.props.assocField;
        const readOnly = this.props.readOnly !== undefined ? this.props.readOnly : false;

        // v bloku function (child) nejde pouzit priamo this, thisLocal uz ide pouzit
        const thisLocal = this;

        const onClickAddRow = this.props.onClickAddRow !== undefined ? this.props.onClickAddRow : this.onClickAddRowDefault;
        const onClickRemoveRow = this.props.onClickRemoveRow !== undefined ? this.props.onClickRemoveRow : this.onClickRemoveRowDefault;

        const object: XObject | null = this.props.form.state.object;
        const valueList = object !== null ? object[this.props.assocField] : [];

        const xEntity: XEntity = XUtilsMetadata.getXEntity(this.getEntity());

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

        let tableStyle;
        if (this.props.width !== undefined) {
            let width: string = this.props.width;
            if (!isNaN(Number(width))) { // if width is number
                width = width + 'rem';
            }
            tableStyle = {width: width};
        }

        // pre lepsiu citatelnost vytvarame stlpce uz tu
        const columnElemList: JSX.Element[] = React.Children.map(
            this.props.children,
            function (child) {
                // ak chceme zmenit child element, tak treba bud vytvorit novy alebo vyklonovat
                // priklad je na https://soshace.com/building-react-components-using-children-props-and-context-api/
                // (vzdy musime robit manipulacie so stlpcom, lebo potrebujeme pridat filter={true} sortable={true}
                const childColumn = child as any as {props: XFormColumnProps}; // nevedel som to krajsie...
                const childColumnProps = childColumn.props;
                // je dolezite, aby field obsahoval cely path az po zobrazovany atribut, lebo podla neho sa vykonava filtrovanie a sortovanie
                // (aj ked, da sa to prebit na stlpcoch (na elemente Column), su na to atributy)
                const field: string = XFormDataTable2.getPathForColumn(childColumnProps);

                // TODO - toto by sa mohlo vytiahnut vyssie, aj v bodyTemplate sa vola metoda XUtilsMetadata.getXFieldByPath
                const xField: XField = XUtilsMetadata.getXFieldByPath(xEntity, field);

                // *********** header ***********
                const header: string = XFormDataTable2.getHeader(childColumnProps, xEntity, field, xField);

                // *********** filterElement ***********
                let filterElement;
                if (xField.type === "boolean") {
                    const checkboxValue: boolean | null = thisLocal.getCheckboxFilterValue(field);
                    filterElement = <TriStateCheckbox value={checkboxValue} onChange={(e: any) => thisLocal.onCheckboxFilterChange(field, e.value)}/>;
                }
                else if (childColumnProps.dropdownInFilter) {
                    const dropdownValue = thisLocal.getDropdownFilterValue(field);
                    filterElement = <XDropdownDTFilter entity={thisLocal.getEntity()} path={field} value={dropdownValue} onValueChange={thisLocal.onDropdownFilterChange}/>
                }

                // *********** width/headerStyle ***********
                let width: string | undefined = XUtils.processPropWidth(childColumn.props.width);
                if (width === undefined || width === "default") {
                    width = XUtilsMetadata.computeColumnWidth(xField, childColumnProps.type, header);
                }
                let headerStyle: React.CSSProperties = {};
                if (width !== undefined) {
                    headerStyle = {width: width};
                }

                // *********** align ***********
                let align = "left"; // default
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

                // *********** style ***********
                let style: React.CSSProperties = {};
                // TODO - pouzit className a nie style
                if (align === "center" || align === "right") {
                    style = {textAlign: align};
                    headerStyle = {...headerStyle, ...style}; // headerStyle overrides style in TH cell
                }

                return <Column field={field} header={header} filter={true} sortable={true} filterElement={filterElement}
                               headerStyle={headerStyle} style={style}
                               body={(rowData: any) => {return thisLocal.bodyTemplate(childColumnProps, rowData, xEntity);}}/>;
            }
        );

        return (
            <div>
                <div className="flex justify-content-center">
                    <label>{label}</label>
                    {/*<XButton label="Filter" onClick={onClickFilter} />*/}
                </div>
                <div className="flex justify-content-center">
                    <DataTable ref={(el) => this.dt = el} value={valueList} dataKey={this.dataKey} paginator={paginator} rows={rows}
                               totalRecords={valueList.length}
                               filters={this.state.filters} onFilter={this.onFilter}
                               sortMode="multiple" removableSort={true}
                               selectionMode="single" selection={this.state.selectedRow} onSelectionChange={this.onSelectionChange}
                               className="p-datatable-sm x-form-datatable" resizableColumns columnResizeMode="expand" tableStyle={tableStyle}
                               scrollable={this.props.scrollable} scrollHeight={scrollHeight} style={style}>
                        {columnElemList}
                    </DataTable>
                </div>
                <div className="flex justify-content-center">
                    <XButton label="Add row" onClick={onClickAddRow}/>
                    <XButton label="Remove row" onClick={onClickRemoveRow}/>
                </div>
            </div>
        );
    }
}

export interface XFormColumnProps {
    type: string;
    header?: any;
    readOnly?: boolean;
    dropdownInFilter?: boolean; // moze byt len na stlpcoch ktore zobrazuju asociavany atribut (dlzka path >= 2)
    width?: string; // for example 150px or 10rem or 10% (value 10 means 10rem)
}

export interface XFormInputSimpleColumnProps extends XFormColumnProps {
    field: string;
}

export interface XFormDropdownColumnProps extends XFormColumnProps {
    assocField: string;
    displayField: string;
}

export interface XFormSearchButtonColumnProps extends XFormColumnProps {
    assocField: string;
    displayField: string;
    searchTable: any;
}

export const XFormColumn = (props: XFormInputSimpleColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XFormColumn.defaultProps = {
    type: "inputSimple"
};

export const XFormDropdownColumn = (props: XFormDropdownColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XFormDropdownColumn.defaultProps = {
    type: "dropdown"
};

export const XFormSearchButtonColumn = (props: XFormSearchButtonColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

XFormSearchButtonColumn.defaultProps = {
    type: "searchButton"
};
