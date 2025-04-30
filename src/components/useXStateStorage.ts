import {Dispatch, SetStateAction, useState} from "react";
import {XStorageType, XUtils} from "./XUtils";
import {useXStateStorageBase} from "./useXStateStorageBase";

// TODO - initialState sholud be value | function returning T, and the function should be called in function "initialStateFunction"
export function useXStateStorage<T>(xStorageType: XStorageType, key: string, initialState: T): [T, Dispatch<SetStateAction<T>>] {

    return useXStateStorageBase(xStorageType, key, () => XUtils.getValueFromStorage(xStorageType, key, initialState));
}
