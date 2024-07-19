import React, {Component} from "react";
import {SourceCodeLinkEntity} from "./SourceCodeLinkEntity";
import {XEditColumnDialog, XEditColumnDialogValues} from "./XEditColumnDialog";
import * as _ from "lodash";
import {XBrowseMeta, XColumnMeta} from "../serverApi/XBrowseMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XEntity} from "../serverApi/XEntityMetadata";
import {XUtils} from "./XUtils";
import {XEditModeHandlers, XLazyColumn, XLazyDataTable} from "./XLazyDataTable/XLazyDataTable";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";

export interface XEditBrowseProps {
    entity: string;
    browseId?: string;
}

// TODO - pouzit extends XEditBrowseBase, ako je tomu pri CarForm?
export class XEditBrowse extends Component<XEditBrowseProps> {

    state: {xBrowseMeta: XBrowseMeta; editMode: boolean; editColumnDialogOpened: boolean;};
    indexForAddColumn?: number;
    addColumn: boolean;
    xEditColumnDialogValues?: XEditColumnDialogValues;

    constructor(props: XEditBrowseProps) {
        super(props);
        console.log("************* XBrowse const entity = " + this.props.entity);

        this.getXBrowseMeta = this.getXBrowseMeta.bind(this);

        const xBrowseMeta: XBrowseMeta = this.getXBrowseMeta();
        this.state = {
            xBrowseMeta: xBrowseMeta,
            editMode: false,
            editColumnDialogOpened: false
        };

        this.addColumn = false;

        this.createDefaultXBrowseMeta = this.createDefaultXBrowseMeta.bind(this);
        this.onEditModeStart = this.onEditModeStart.bind(this);
        this.onEditModeSave = this.onEditModeSave.bind(this);
        this.onEditModeCancel = this.onEditModeCancel.bind(this);
        this.onAddColumn = this.onAddColumn.bind(this);
        this.editColumnDialogOnHide = this.editColumnDialogOnHide.bind(this);
        this.onEditColumn = this.onEditColumn.bind(this);
        this.onRemoveColumn = this.onRemoveColumn.bind(this);
        this.onMoveColumnLeft = this.onMoveColumnLeft.bind(this);
        this.onMoveColumnRight = this.onMoveColumnRight.bind(this);
        this.moveColumn = this.moveColumn.bind(this);
        this.onEdit = this.onEdit.bind(this);
    }

    getXBrowseMeta(): XBrowseMeta {
        let xBrowseMeta: XBrowseMeta = XUtilsMetadata.getXBrowseMeta(this.props.entity, this.props.browseId);
        if (xBrowseMeta === undefined) {
            xBrowseMeta = this.createDefaultXBrowseMeta();
        }
        return xBrowseMeta;
    }

    createDefaultXBrowseMeta(): XBrowseMeta {
        const xColumnMetaList: XColumnMeta[] = [];
        const xEntity: XEntity = XUtilsMetadataCommon.getXEntity(this.props.entity);
        const xFieldList = XUtilsMetadataCommon.getXFieldList(xEntity);
        for (const xField of xFieldList) {
            xColumnMetaList.push({field: xField.name, header: xField.name, dropdownInFilter: false});
        }
        return {entity: this.props.entity, rows: 15, columnMetaList: xColumnMetaList};
    }

    onEditModeStart() {
        // zmeny budeme robit na klonovanych datach - aby sme sa vedeli cez cancel vratit do povodneho stavu
        let xBrowseMetaCloned: XBrowseMeta = _.cloneDeep(this.state.xBrowseMeta);
        this.setState({xBrowseMeta: xBrowseMetaCloned, editMode: true});
    }

    async onEditModeSave() {
        // first we set columnOrder
        const xBrowseMeta = this.state.xBrowseMeta;
        let columnOrder = 0;
        for (const xColumnMeta of xBrowseMeta.columnMetaList) {
            columnOrder++;
            xColumnMeta.columnOrder = columnOrder;
        }

        console.log(xBrowseMeta);
        try {
            await XUtils.post('saveRow', {entity: "XBrowseMeta", object: xBrowseMeta});
        }
        catch (e) {
            XUtils.showErrorMessage("Save row XBrowseMeta failed.", e);
            return; // zostavame v edit mode
        }

        // zmeny ulozime aj do cache formularov
        XUtilsMetadata.setXBrowseMeta(this.props.entity, this.props.browseId, xBrowseMeta);
        this.setState({editMode: false});
    }

    onEditModeCancel() {
        // vratime formular z cache, resp. defaultny formular
        const xBrowseMeta: XBrowseMeta = this.getXBrowseMeta();
        this.setState({editMode: false, xBrowseMeta: xBrowseMeta});
    }

    onAddColumn(field: string) {
        console.log("onAddColumn: " + field);

        this.indexForAddColumn = this.getIndexForColumn(field);
        this.addColumn = true;
        this.xEditColumnDialogValues = {field: "", header: "", dropdownInFilter: false}; // values are used for dialog initialization
        this.setState({editColumnDialogOpened: true});
    }

    editColumnDialogOnHide(xEditColumnDialogValues: XEditColumnDialogValues | null) {
        if (xEditColumnDialogValues !== null) {
            if (this.indexForAddColumn !== undefined) {
                const xBrowseMeta = this.state.xBrowseMeta;
                if (this.addColumn) {
                    xBrowseMeta.columnMetaList.splice(this.indexForAddColumn + 1, 0, {
                        field: xEditColumnDialogValues.field,
                        header: xEditColumnDialogValues.header,
                        dropdownInFilter: xEditColumnDialogValues.dropdownInFilter
                    });
                }
                else {
                    const xColumnMeta: XColumnMeta = xBrowseMeta.columnMetaList[this.indexForAddColumn];
                    xColumnMeta.header = xEditColumnDialogValues.header;
                    xColumnMeta.dropdownInFilter = xEditColumnDialogValues.dropdownInFilter;
                }
                // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
                this.setState({xBrowseMeta: xBrowseMeta, editColumnDialogOpened: false});
                return;
            }
        }
        this.setState({editColumnDialogOpened: false});
    }

    onEditColumn(field: string) {
        console.log("onEditColumn: " + field);

        this.indexForAddColumn = this.getIndexForColumn(field);
        const xBrowseMeta = this.state.xBrowseMeta;
        if (this.indexForAddColumn !== undefined) {
            const xColumnMeta: XColumnMeta = xBrowseMeta.columnMetaList[this.indexForAddColumn];
            this.addColumn = false;
            this.xEditColumnDialogValues = {field: xColumnMeta.field, header: xColumnMeta.header, dropdownInFilter: xColumnMeta.dropdownInFilter ?? false}; // values are used for dialog initialization
            this.setState({editColumnDialogOpened: true});
        }
    }

    onRemoveColumn(field: string) {
        console.log("onRemoveColumn: " + field);
        const index = this.getIndexForColumn(field);
        if (index !== undefined) {
            const xBrowseMeta = this.state.xBrowseMeta;
            xBrowseMeta.columnMetaList.splice(index, 1);
            // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
            this.setState({xBrowseMeta: xBrowseMeta});
        }
    }

    onMoveColumnLeft(field: string) {
        this.moveColumn(field, -1);
    }

    onMoveColumnRight(field: string) {
        this.moveColumn(field, 1);
    }

    moveColumn(field: string, offset: -1 | 1) {
        const index = this.getIndexForColumn(field);
        if (index !== undefined) {
            const xBrowseMeta = this.state.xBrowseMeta;
            XUtilsCommon.arrayMoveElement(xBrowseMeta.columnMetaList, index, offset);
            // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
            this.setState({xBrowseMeta: xBrowseMeta});
        }
    }

    getIndexForColumn(field: string): number | undefined {
        let searchedIndex: number | undefined = undefined;
        const xBrowseMeta = this.state.xBrowseMeta;
        for (const [index, xColumnMeta] of xBrowseMeta.columnMetaList.entries()) {
            if (xColumnMeta.field.localeCompare(field) === 0) {
                searchedIndex = index;
                break;
            }
        }
        return searchedIndex;
    }

    onEdit(selectedRow: any) {

        const formElement = XUtils.getAppForm(this.props.entity);
        if (formElement !== undefined) {
            const xEntity: XEntity = XUtilsMetadataCommon.getXEntity(this.props.entity);
            const id = selectedRow[xEntity.idField];
            // we add property id={selectedRow.<id>} into formElement
            const formElementCloned = React.cloneElement(formElement, {id: id}, formElement.children);
            // openForm pridavame automaticky v XFormNavigator3 pri renderovani komponentu
            (this.props as any).openForm(formElementCloned);
        }
        else {
            console.log(`XBrowse entity = ${this.props.entity}: form not found/registered.`);
        }
    }

    render() {
        const xBrowseMeta = this.state.xBrowseMeta;
        const xEditModeHandlers: XEditModeHandlers = {
            onStart: this.onEditModeStart,
            onSave: this.onEditModeSave,
            onCancel: this.onEditModeCancel,
            onAddColumn: this.onAddColumn,
            onEditColumn: this.onEditColumn,
            onRemoveColumn: this.onRemoveColumn,
            onMoveColumnLeft: this.onMoveColumnLeft,
            onMoveColumnRight: this.onMoveColumnRight
        }
        // for demo example classes
        let entitySourceCodeLink;
        if (xBrowseMeta.entity === "Brand") {
            entitySourceCodeLink = <SourceCodeLinkEntity sourceCodeFile="brand.entity.ts"/>;
        }
        else if (xBrowseMeta.entity === "Car") {
            entitySourceCodeLink = <SourceCodeLinkEntity sourceCodeFile="car.entity.ts"/>;
        }
        let formSourceCode;
        if (entitySourceCodeLink !== undefined) {
            formSourceCode =
                <div className="flex justify-content-center mt-3">
                    <span className="source-code-link">Form is saved in DB (Administration - Browses)</span>
                </div>;
        }
        return (
            <div>
                <XLazyDataTable entity={xBrowseMeta.entity} rows={xBrowseMeta.rows} editMode={this.state.editMode} editModeHandlers={xEditModeHandlers} onEdit={this.onEdit} displayed={(this.props as any).displayed}>
                    {xBrowseMeta.columnMetaList.map(function (xColumnMeta: XColumnMeta, index: number) {
                            return (<XLazyColumn key={index} field={xColumnMeta.field} header={xColumnMeta.header} dropdownInFilter={xColumnMeta.dropdownInFilter} align={xColumnMeta.align} width={xColumnMeta.width}/>);
                        }
                    )}
                </XLazyDataTable>
                {formSourceCode}
                {entitySourceCodeLink}
                <XEditColumnDialog dialogOpened={this.state.editColumnDialogOpened} entity={xBrowseMeta.entity} addColumn={this.addColumn} xEditColumnDialogValues={this.xEditColumnDialogValues} onHideDialog={this.editColumnDialogOnHide}/>
            </div>
        );
    }
}
