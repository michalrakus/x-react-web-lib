import {XLazyColumn, XLazyDataTable} from "../components/XLazyDataTable";
import React from "react";
import {XBrowseMetaForm} from "./XBrowseMetaForm";
import {XBrowseMeta} from "../serverApi/XBrowseMetadata";

export const XBrowseMetaBrowse = (props: {}) => {

    const onEdit = (selectedRow: XBrowseMeta) => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        (props as any).openForm(<XBrowseMetaForm id={selectedRow.id}/>);
    }

    return (
        <XLazyDataTable entity="XBrowseMeta" rows={15} onEdit={onEdit} removeRow={true} displayed={(props as any).displayed}>
            <XLazyColumn field="id" header="ID"/>
            <XLazyColumn field="entity" header="Entity" width="17rem"/>
            <XLazyColumn field="browseId" header="Browse ID" width="17rem"/>
            <XLazyColumn field="rows" header="Rows"/>
        </XLazyDataTable>
    );
}
