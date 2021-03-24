import {XLazyColumn, XLazyDataTable} from "../components/XLazyDataTable";
import React from "react";
import {XUser} from "../serverApi/XUser";
import {XUserForm} from "./XUserForm";
import {XUtils} from "../components/XUtils";

export const XUserBrowse = (props: {}) => {

    const onAddRow = () => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        (props as any).openForm(<XUserForm/>);
    }

    const onEdit = (selectedRow: XUser) => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        (props as any).openForm(<XUserForm id={selectedRow.idXUser}/>);
    }

    return (
        <XLazyDataTable entity="XUser" rows={10} onAddRow={onAddRow} onEdit={onEdit} removeRow={true} displayed={(props as any).displayed}>
            <XLazyColumn field="idXUser" header="ID"/>
            <XLazyColumn field="username" header="Username" width="160"/>
            <XLazyColumn field="password" header="Password" width="160"/>
            <XLazyColumn field="name" header="Name" width="240"/>
        </XLazyDataTable>
    );
}
// zatial nepouzivane - prichystane do buducnosti
// ak by sme mali class komponenty, dal by sa pouzit decorator, pri formularoch mame class komponenty
XUtils.registerAppBrowse(<XUserBrowse/>, "XUser");
