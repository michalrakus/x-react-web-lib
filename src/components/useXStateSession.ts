import {Dispatch, SetStateAction, useState} from "react";
import {XUtils} from "./XUtils";
import {useXStateSessionBase} from "./useXStateSessionBase";

// TODO - initialState sholud be value | function returning T, and the function should be called in function "initialStateFunction"
export function useXStateSession<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>] {

    return useXStateSessionBase(key, () => XUtils.getValueFromStorage(key, initialState));
}
