import {Dispatch, SetStateAction} from "react";
import {useXStateStorage} from "./useXStateStorage";

// TODO - initialState sholud be value | function returning T, and the function should be called in function "initialStateFunction"
export function useXStateLocal<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>] {

    return useXStateStorage<T>("local", key, initialState);
}
