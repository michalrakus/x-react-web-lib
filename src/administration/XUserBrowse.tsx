import {XLazyColumn, XLazyDataTable} from "../components/XLazyDataTable";
import React from "react";
import {XUser} from "../serverApi/XUser";
import {XUserForm} from "./XUserForm";
import {XUtils} from "../components/XUtils";

export const XUserBrowse = (props: {}) => {

    const onEdit = (selectedRow: XUser) => {

        // onExitForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        (props as any).onExitForm(<XUserForm entity="XUser" id={selectedRow.idXUser}/>);
    }

    const onAddRow = () => {

        // onExitForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        (props as any).onExitForm(<XUserForm entity="XUser"/>);
    }

    return (
        <XLazyDataTable entity="XUser" rows={10} onAddRow={onAddRow} onEdit={onEdit} removeRow={true} displayed={(props as any).displayed}>
            <XLazyColumn field="idXUser" header="ID"/>
            <XLazyColumn field="username" header="Username"/>
            <XLazyColumn field="password" header="Password"/>
            <XLazyColumn field="name" header="Name"/>
        </XLazyDataTable>
    );
}
// zatial nepouzivane - prichystane do buducnosti
// ak by sme mali class komponenty, dal by sa pouzit decorator, pri formularoch mame class komponenty
XUtils.registerBrowse(<XUserBrowse/>, "XUser");
