import React from "react";
import {XBrowseProps, XLazyColumn, XLazyDataTable} from "../components/XLazyDataTable/XLazyDataTable";
import {XParamForm} from "./XParamForm";
import {XCustomFilter} from "../serverApi/FindParam";

export const XParamBrowse = (props: XBrowseProps & {customFilter?: XCustomFilter}) => {

    const onAddRow = () => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        props.openForm!(<XParamForm/>);
    }

    const onEdit = (selectedRow: any) => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        props.openForm!(<XParamForm id={selectedRow.id}/>);
    }

    return (
        <XLazyDataTable entity="XParam" label="Parameters" sortField="id" rows={30} customFilter={props.customFilter}
                        onAddRow={onAddRow} onEdit={onEdit} removeRow={true} displayed={props.displayed}>
            <XLazyColumn field="id" header="ID" width="8rem"/>
            <XLazyColumn field="code" header="Code" width="16rem"/>
            <XLazyColumn field="name" header="Name" width="45rem"/>
            <XLazyColumn field="value" header="Value" width="16rem"/>
        </XLazyDataTable>
    );
}
