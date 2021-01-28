import {XToken} from "./XToken";
import {useState} from "react";
import {XUtils} from "./XUtils";

export default function useXToken(): [XToken | null, (xToken: XToken | null) => void] {

    const getXToken = () : XToken | null => {
        let xToken: XToken | null = null;
        const tokenString = sessionStorage.getItem('xToken');
        if (tokenString !== null) {
            xToken = JSON.parse(tokenString);
        }
        return xToken;
    };

    const [xToken, setXToken] = useState(getXToken());
    XUtils.setXToken(xToken);

    const saveXToken = (xToken: XToken | null) => {
        if (xToken !== null) {
            sessionStorage.setItem('xToken', JSON.stringify(xToken));
        }
        else {
            sessionStorage.removeItem('xToken');
        }
        XUtils.setXToken(xToken);
        setXToken(xToken);
    };

    return [xToken, saveXToken];
}
