export const emptySelectionModel = {
    type: 'include',
    ids: new Set()
};

export const getSelectedRowIds = (selectionModel, rows, getRowId) => {
    if (!selectionModel) {
        return [];
    }

    const rowIds = rows.map(getRowId);

    if (selectionModel.type === 'exclude') {
        return rowIds.filter((rowId) => !selectionModel.ids.has(rowId));
    }

    return rowIds.filter((rowId) => selectionModel.ids.has(rowId));
};
