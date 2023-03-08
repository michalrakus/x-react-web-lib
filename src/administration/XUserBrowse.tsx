import {XLazyColumn, XLazyDataTable} from "../components/XLazyDataTable";
import React from "react";
import {XUser} from "../serverApi/XUser";
import {XUserForm} from "./XUserForm";
import {XUtils} from "../components/XUtils";

export const XUserBrowse = (props: {}) => {

    const onAddRow = () => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        (props as any).openForm(<XUserForm object={{enabled: true}}/>);
    }

    const onEdit = (selectedRow: XUser) => {

        // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
        (props as any).openForm(<XUserForm id={selectedRow.idXUser}/>);
    }

    const onRemoveRow = async (selectedRow: XUser): Promise<boolean> => {
        if (selectedRow.username === XUtils.getUsername()) {
            alert("Can not remove current user.");
            return false;
        }

        // v deme nedovolime zmenit uzivatelov ktori sa pouzivaju na skusanie dema
        if (XUtils.demo() && (selectedRow.username === 'jozko' || selectedRow.username === 'xman')) {
            alert("Users jozko, xman can not be removed.");
            return false;
        }

        if (window.confirm('Are you sure to remove the selected row?')) {
            await XUtils.removeRow("XUser", selectedRow);
            return true;
        }
        return false;
    }

    return (
        <XLazyDataTable entity="XUser" rows={10} onAddRow={onAddRow} onEdit={onEdit} removeRow={onRemoveRow} displayed={(props as any).displayed}>
            <XLazyColumn field="idXUser" header="ID"/>
            <XLazyColumn field="username" header="Username" width="17rem"/>
            <XLazyColumn field="name" header="Name" width="17rem"/>
            <XLazyColumn field="enabled" header="Enabled"/>
        </XLazyDataTable>
    );
}
// zatial nepouzivane - prichystane do buducnosti
// ak by sme mali class komponenty, dal by sa pouzit decorator, pri formularoch mame class komponenty
XUtils.registerAppBrowse(<XUserBrowse/>, "XUser");
