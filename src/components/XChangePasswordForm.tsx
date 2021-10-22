import {XToken} from "./XToken";
import React, {useState} from "react";
import {XUtils} from "./XUtils";
import {Password} from "primereact/password";
import {Button} from "primereact/button";
import {InputText} from "primereact/inputtext";

export const XChangePasswordForm = (props: {setXToken: (xToken: XToken | null) => void;}) => {

    const [passwordCurrent, setPasswordCurrent] = useState("");
    const [passwordNew, setPasswordNew] = useState("");
    const [passwordNewConfirm, setPasswordNewConfirm] = useState("");

    const onClickSave = async () => {

        // passwordCurrent overime voci token-u, token sa bude pri requeste overovat voci DB
        let xToken: XToken | null = XUtils.getXToken();
        if (xToken === null) {
            alert("Unexpected error, user not logged in.");
            return;
        }

        if (passwordCurrent !== xToken.password) {
            alert("Current password invalid.");
            return;
        }

        if (passwordNew === '') {
            alert("New password is required.");
            return;
        }

        if (passwordNew !== passwordNewConfirm) {
            alert("New password and confirmed new password are not equal.");
            return;
        }

        // v deme nedovolime zmenit hesla
        if (XUtils.demo() && (xToken.username === 'jozko' || xToken.username === 'xman')) {
            alert("Password for users jozko, xman can not be changed.");
            return;
        }

        try {
            await XUtils.post('userChangePassword', {username: xToken.username, passwordNew: passwordNew});
        }
        catch (e) {
            XUtils.showErrorMessage("Change password failed.", e);
            return;
        }

        // request bol uspesny, heslo je zmenene, zapiseme si ho do token-u
        props.setXToken({username: xToken.username, password: passwordNew});

        alert('Password successfully changed.');

        setPasswordCurrent('');
        setPasswordNew('');
        setPasswordNewConfirm('');
    }

    return(
        // autoComplete="new-password" - bez tohto chrome predplna user/password, ak si user da ulozit user/password (pre danu url)
        <div>
            <div className="x-form-row">
                <div className="x-form-col">
                    <div className="flex justify-content-center">
                        <h2>Change password</h2>
                    </div>
                    <div className="field grid">
                        <label className="col-fixed" style={{width:'14rem'}}>User</label>
                        <InputText value={XUtils.getXToken()?.username} readOnly={true}/>
                    </div>
                    <div className="field grid">
                        <label className="col-fixed" style={{width:'14rem'}}>Current password</label>
                        <Password value={passwordCurrent} onChange={(e: any) => setPasswordCurrent(e.target.value)} feedback={false} maxLength={64} autoComplete="new-password"/>
                    </div>
                    <div className="field grid">
                        <label className="col-fixed" style={{width:'14rem'}}>New password</label>
                        <Password value={passwordNew} onChange={(e: any) => setPasswordNew(e.target.value)} feedback={false} maxLength={64} autoComplete="new-password"/>
                    </div>
                    <div className="field grid">
                        <label className="col-fixed" style={{width:'14rem', whiteSpace:'nowrap'}}>Confirm new password</label>
                        <Password value={passwordNewConfirm} onChange={(e: any) => setPasswordNewConfirm(e.target.value)} feedback={false} maxLength={64} autoComplete="new-password"/>
                    </div>
                </div>
            </div>
            <div className="flex justify-content-center">
                <Button label="Save" onClick={onClickSave} />
            </div>
        </div>
    )
}