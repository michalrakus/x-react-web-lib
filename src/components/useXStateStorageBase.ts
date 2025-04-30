import {Dispatch, SetStateAction, useState} from "react";
import {XStorageType, XUtils} from "./XUtils";

// this base version enables to use custom version of function that computes initialState
// (in usual case useXStateStorage shoud be used)
export function useXStateStorageBase<T>(xStorageType: XStorageType, key: string, initialStateFunction: () => T): [T, Dispatch<SetStateAction<T>>] {

    const [value, setValue] = useState<T>(initialStateFunction);

    const setValueIntoSession: Dispatch<SetStateAction<T>> = (value: SetStateAction<T>) => {
        setValue(value);
        XUtils.saveValueIntoStorage(xStorageType, key, value);
    };

    return [value, setValueIntoSession];
}
