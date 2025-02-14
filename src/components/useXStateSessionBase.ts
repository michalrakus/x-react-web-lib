import {Dispatch, SetStateAction, useState} from "react";
import {XUtils} from "./XUtils";

// this base version enables to use custom version of function that computes initialState
// (in usual case useXStateSession shoud be used)
export function useXStateSessionBase<T>(key: string, initialStateFunction: () => T): [T, Dispatch<SetStateAction<T>>] {

    const [value, setValue] = useState<T>(initialStateFunction);

    const setValueIntoSession: Dispatch<SetStateAction<T>> = (value: SetStateAction<T>) => {
        setValue(value);
        XUtils.saveValueIntoStorage(key, value);
    };

    return [value, setValueIntoSession];
}
