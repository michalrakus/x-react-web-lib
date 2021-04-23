import React, {ReactChild, useEffect, useRef, useState} from "react";
import {FindResult} from "../serverApi/FindResult";
import {FindParam} from "../serverApi/FindParam";
import {XUtils} from "./XUtils";
import {Button} from "primereact/button";
import {DataTable} from "primereact/datatable";
import {Column} from "primereact/column";

// TODO - nedokoncena nepouzivana ne-lazy DataTable
export const XDataTable = (props: {entity: string; dataKey: string; onSelect: (selectedRow: any) => void; children: ReactChild[];}) => {
    const dataTableEl = useRef<any>(null);
    const [value, setValue] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    // parameter [] zabezpeci ze sa metoda zavola len po prvom renderingu (a nie po kazdej zmene stavu (zavolani setNieco()))
    useEffect(() => {
        loadData();
        console.log("XDataTable - data loaded (simple)");
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const onClickFilter = () => {

        console.log("zavolany onClickFilter");

        loadData();
    };

    const loadData = () => {
        //loadDataBase({first: first, rows: rows, filters: filters, multiSortMeta: multiSortMeta, entity: props.entity, fields: getFields()});
    }

    const loadDataBase = async (findParam: FindParam) => {
        console.log("zavolany loadDataBase - startIndex = " + findParam.first + ", endIndex = " + ((findParam.first ?? 0) + (findParam.rows ?? 0)) + ", filters = " + JSON.stringify(findParam.filters) + ", multiSortMeta = " + JSON.stringify(findParam.multiSortMeta) + ", fields = " + JSON.stringify(findParam.fields));
        setLoading(true);
        const findResult = await findByFilter(findParam);
        setValue(findResult.rowList ?? []);
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

        props.onSelect(event.data);
    }

    const onClickSelect = () => {
        console.log("zavolany onClickSelect");

        if (selectedRow !== null) {
            props.onSelect(selectedRow);
        }
        else {
            console.log("Nie je vyselectovany ziaden zaznam.");
        }
    }

    return (
        <div>
            <Button label="Filter" onClick={onClickFilter} />
            <DataTable value={value} dataKey={props.dataKey}
                       loading={loading}
                       sortMode="multiple" removableSort={true}
                       selectionMode="single" selection={selectedRow} onSelectionChange={onSelectionChange}
                       onRowDoubleClick={onRowDoubleClick}
                       ref={dataTableEl}>
                {React.Children.map(
                    props.children,
                    function(child) {
                        // ak chceme zmenit child element, tak treba bud vytvorit novy alebo vyklonovat
                        // priklad je na https://soshace.com/building-react-components-using-children-props-and-context-api/
                        // (vzdy musime robit manipulacie so stlpcom, lebo potrebujeme pridat filter={true} sortable={true}
                        const childColumn = child as any as {props: {field: string; header?: any;}}; // nevedel som to krajsie...
                        return <Column field={childColumn.props.field} header={childColumn.props.header} filter={true} sortable={true}/>;
                    }
                )}
            </DataTable>
            <Button label="Select" onClick={onClickSelect} />
        </div>
    );
}

export const XColumn = (props: {field: string; header?: any;}) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}
