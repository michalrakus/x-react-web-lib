import {XLazyColumn, XLazyDataTable} from "../components/XLazyDataTable";
import React from "react";
import {XBrowseMetaForm} from "./XBrowseMetaForm";
import {XBrowseMeta} from "../serverApi/XBrowseMetadata";

export const XBrowseMetaBrowse = (props: {}) => {

    const onEdit = (selectedRow: XBrowseMeta) => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        (props as any).openForm(<XBrowseMetaForm id={selectedRow.idXBrowseMeta}/>);
    }

    return (
        <XLazyDataTable entity="XBrowseMeta" rows={15} onEdit={onEdit} removeRow={true} displayed={(props as any).displayed}>
            <XLazyColumn field="idXBrowseMeta" header="ID"/>
            <XLazyColumn field="entity" header="Entity" width="250"/>
            <XLazyColumn field="browseId" header="Browse ID" width="250"/>
            <XLazyColumn field="rows" header="Rows"/>
        </XLazyDataTable>
    );
}
