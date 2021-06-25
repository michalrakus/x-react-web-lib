import React from 'react';
import {Dialog} from "primereact/dialog";
import {XToken} from "./XToken";
import {XLoginForm} from "./XLoginForm";

export const XLoginDialog = (props: {dialogOpened: boolean; setXToken: (xToken: XToken | null) => void; onHideDialog: (ok: boolean) => void; customUserService?: string;}) => {

    // bez tejto metody by pri opetovnom otvoreni dialogu ponechal povodne hodnoty
    const onShow = () => {
    }

    const onLogin = () => {
        props.onHideDialog(true);
    }

    // poznamka: renderovanie vnutornych komponentov Dialogu sa zavola az po otvoreni dialogu
    return (
        <Dialog visible={props.dialogOpened} onShow={onShow} onHide={() => props.onHideDialog(false)}>
            <XLoginForm setXToken={props.setXToken} onLogin={onLogin} customUserService={props.customUserService}/>
        </Dialog>
    );
}
