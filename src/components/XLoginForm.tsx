import {XToken} from "./XToken";
import {InputText} from "primereact/inputtext";
import React, {useState} from "react";
import {Password} from "primereact/password";
import {Button} from "primereact/button";
import {XUtils} from "./XUtils";
import {
    XUserAuthenticationRequest,
    XUserAuthenticationResponse
} from "../serverApi/XUserAuthenticationIfc";

export const XLoginForm = (props: {setXToken: (xToken: XToken | null) => void; onLogin?: () => void; customUserService?: string;}) => {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const onClickLogIn = async () => {

        const xUserAuthenticationRequest: XUserAuthenticationRequest = {username: username, password: password};
        const xUserAuthenticationResponse: XUserAuthenticationResponse = await XUtils.fetchOne('userAuthentication', xUserAuthenticationRequest);

        if (xUserAuthenticationResponse.authenticationOk) {
            //console.log("Autentifikacia uspesne zbehla");
            //console.log(xUserAuthenticationResponse.xUser);
            let customUser = undefined;
            if (props.customUserService) {
                customUser = await XUtils.fetchOne(props.customUserService, {username: username}, {username: username, password: password});
            }
            // zatial si ulozime len username/password (koli http basic autentifikacii)
            props.setXToken({username: username, password: password, xUser: customUser});
            // metoda pouzivana v XLoginDialog
            if (props.onLogin) {
                props.onLogin();
            }
        }
        else {
            alert("Invalid Username/Password");
        }
    }

    return(
        <div className="flex flex-column align-items-center">
            <h2>Please log in</h2>
            <div className="field grid">
                <label htmlFor="userName" className="col-fixed" style={{width:'10.5rem'}}>Username</label>
                <InputText id="userName" value={username} onChange={(e: any) => setUsername(e.target.value)} maxLength={64}/>
            </div>
            <div className="field grid">
                <label htmlFor="password" className="col-fixed" style={{width:'10.5rem'}}>Password</label>
                <Password id="password" value={password} onChange={(e: any) => setPassword(e.target.value)} feedback={false} maxLength={64}/>
            </div>
            <Button label="Log in" onClick={onClickLogIn} />
        </div>
    )
}