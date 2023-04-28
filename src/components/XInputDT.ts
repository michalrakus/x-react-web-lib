import {XField} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XFormComponentDT, XFormComponentDTProps} from "./XFormComponentDT";

export interface XInputDTProps extends XFormComponentDTProps {
    field: string;
}

// spolocna nadtrieda pre jednoduche inputy (nie asociacne)
export abstract class XInputDT<P extends XInputDTProps> extends XFormComponentDT<P> {

    protected xField: XField;

    protected constructor(props: P) {
        super(props);

        this.xField = XUtilsMetadata.getXFieldByPathStr(props.entity, props.field);
    }

    getField(): string {
        return this.props.field;
    }

    isNotNull(): boolean {
        return !this.xField.isNullable;
    }
}
