import { ColumnDef, GridOptions, CellPosition, SelectionRange, GridState, GridAction, GridRow } from './types';

export class StateManager {
  private _rows: GridRow[] = [];
  private _columns: ColumnDef[];
  private _rowHeight: number;
  private _headerHeight: number;
  private _footerHeight: number;
  private _pagination: boolean;
  private _state: GridState;
  private _rowIdField: string | undefined;
  
  private _sortColumn: string | null = null;
  private _sortDirection: 'asc' | 'desc' | null = null;
  private _undoStack: GridAction[] = [];

  private _onCellChange?: (change: any) => void;
  private _onSelectionChange?: (selection: SelectionRange | null) => void;
  private _onRowSelect?: (rows: any[]) => void;

  constructor(options: GridOptions) {
    this._rowIdField = options.rowIdField;
    this.processData(options.data);
    
    this._columns = options.columns.map(col => ({
      ...col,
      width: col.width || 100,
      sortable: col.sortable !== false,
      editable: col.editable !== false,
      hidden: !!col.hidden,
      pinned: col.pinned
    }));

    if (options.showRowNumber) {
      this._columns.unshift({
        field: '__row_number__',
        headerName: '#',
        width: 50,
        sortable: false,
        editable: false,
        hidden: false,
        pinned: 'left',
        formatter: ({ rowIndex }) => {
          if (this._pagination) {
            return ((this._state.currentPage - 1) * this._state.pageSize + rowIndex + 1).toString();
          }
          return (rowIndex + 1).toString();
        }
      });
    }

    this._onCellChange = options.onCellChange;
    this._onSelectionChange = options.onSelectionChange;
    this._onRowSelect = options.onRowSelect;
    
    this._rowHeight = options.rowHeight || 30;
    this._headerHeight = options.headerHeight || 35;
    this._footerHeight = options.footerHeight || 35;
    this._pagination = options.pagination || false;

    this._state = {
      focusedCell: null,
      selection: null,
      isEditing: false,
      currentPage: 1,
      pageSize: options.pageSize || 100
    };
  }

  private processData(data: any[]) {
    this._rows = data.map((item, index) => ({
      id: this._rowIdField ? item[this._rowIdField] : `row-${index}`,
      data: { ...item },
      originalIndex: index
    }));
  }

  get rows() { return this._rows; }
  get columns() { return this._columns; }
  get visibleColumns() { return this._columns.filter(col => !col.hidden); }
  get leftPinnedColumns() { return this.visibleColumns.filter(col => col.pinned === 'left'); }
  get rightPinnedColumns() { return this.visibleColumns.filter(col => col.pinned === 'right'); }
  get centerColumns() { return this.visibleColumns.filter(col => !col.pinned); }

  public isLastLeftPinned(field: string): boolean {
    const leftPinned = this.leftPinnedColumns;
    return leftPinned.length > 0 && leftPinned[leftPinned.length - 1].field === field;
  }

  public isFirstRightPinned(field: string): boolean {
    const rightPinned = this.rightPinnedColumns;
    return rightPinned.length > 0 && rightPinned[0].field === field;
  }
  get rowHeight() { return this._rowHeight; }
  get headerHeight() { return this._headerHeight; }
  get footerHeight() { return this._footerHeight; }
  get pagination() { return this._pagination; }
  get state() { return this._state; }
  get sortColumn() { return this._sortColumn; }
  get sortDirection() { return this._sortDirection; }

  get pagedData() {
    if (!this._pagination) return this._rows;
    const start = (this._state.currentPage - 1) * this._state.pageSize;
    const end = start + this._state.pageSize;
    return this._rows.slice(start, end);
  }

  get totalPages() {
    return Math.ceil(this._rows.length / this._state.pageSize);
  }

  public getRowByViewIndex(viewIndex: number): GridRow | undefined {
    return this.pagedData[viewIndex];
  }

  public getRowById(rowId: string | number): GridRow | undefined {
    return this._rows.find(r => r.id === rowId);
  }

  setFocusedCell(pos: CellPosition | null) {
    this._state.focusedCell = pos;
  }

  setSelection(range: SelectionRange | null) {
    this._state.selection = range;
    if (this._onSelectionChange) {
      this._onSelectionChange(range);
    }

    if (this._onRowSelect) {
      if (!range) {
        this._onRowSelect([]);
      } else {
        const minRow = Math.min(range.start.rowIndex, range.end.rowIndex);
        const maxRow = Math.max(range.start.rowIndex, range.end.rowIndex);
        const selectedRows = [];
        for (let i = minRow; i <= maxRow; i++) {
          const row = this.getRowByViewIndex(i);
          if (row) selectedRows.push(row.data);
        }
        this._onRowSelect(selectedRows);
      }
    }
  }

  setIsEditing(editing: boolean) {
    this._state.isEditing = editing;
  }

  setPage(page: number) {
    this._state.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this._state.focusedCell = null;
    this._state.selection = null;
  }

  setPageSize(size: number) {
    this._state.pageSize = size;
    this._state.currentPage = 1;
    this._state.focusedCell = null;
    this._state.selection = null;
  }

  get totalWidth() {
    return this.visibleColumns.reduce((sum, col) => sum + (col.width || 100), 0);
  }

  get totalHeight() {
    return this.pagedData.length * this._rowHeight;
  }

  updateData(newData: any[]) {
    this.processData(newData);
    this._state.currentPage = 1;
    this._sortColumn = null;
    this._sortDirection = null;
    this._undoStack = [];
  }

  updateColumnWidth(index: number, width: number) {
    if (this._columns[index]) {
      this._columns[index].width = width;
    }
  }

  setColumnVisibility(field: string, visible: boolean) {
    const col = this._columns.find(c => c.field === field);
    if (col) {
      col.hidden = !visible;
    }
  }

  updateOptions(options: Partial<GridOptions>) {
    if (options.rowHeight !== undefined) this._rowHeight = options.rowHeight;
    if (options.headerHeight !== undefined) this._headerHeight = options.headerHeight;
    if (options.footerHeight !== undefined) this._footerHeight = options.footerHeight;
    if (options.pagination !== undefined) this._pagination = options.pagination;
    if (options.pageSize !== undefined) this.setPageSize(options.pageSize);
  }

  sortByColumn(field: string) {
    const focusedId = this._state.focusedCell ? this.getRowByViewIndex(this._state.focusedCell.rowIndex)?.id : null;
    const selectionStartId = this._state.selection ? this.getRowByViewIndex(this._state.selection.start.rowIndex)?.id : null;
    const selectionEndId = this._state.selection ? this.getRowByViewIndex(this._state.selection.end.rowIndex)?.id : null;

    if (this._sortColumn === field) {
      if (this._sortDirection === 'asc') {
        this._sortDirection = 'desc';
      } else if (this._sortDirection === 'desc') {
        this._sortDirection = null;
        this._sortColumn = null;
      } else {
        this._sortDirection = 'asc';
      }
    } else {
      this._sortColumn = field;
      this._sortDirection = 'asc';
    }

    if (this._sortColumn && this._sortDirection) {
      const dir = this._sortDirection === 'asc' ? 1 : -1;
      this._rows.sort((a, b) => {
        const valA = a.data[field];
        const valB = b.data[field];
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      });
    } else {
      this._rows.sort((a, b) => a.originalIndex - b.originalIndex);
    }

    // Re-map focus and selection indexes
    if (focusedId !== null) {
      const newIndex = this.getViewIndexByRowId(focusedId);
      if (newIndex !== -1 && this._state.focusedCell) {
        this._state.focusedCell.rowIndex = newIndex;
      }
    }

    if (selectionStartId !== null && selectionEndId !== null && this._state.selection) {
      const newStartIdx = this.getViewIndexByRowId(selectionStartId);
      const newEndIdx = this.getViewIndexByRowId(selectionEndId);
      if (newStartIdx !== -1 && newEndIdx !== -1) {
        this._state.selection.start.rowIndex = newStartIdx;
        this._state.selection.end.rowIndex = newEndIdx;
      }
    }
  }

  public getViewIndexByRowId(rowId: string | number): number {
    const pagedData = this.pagedData;
    return pagedData.findIndex(r => r.id === rowId);
  }

  public csvExport(): string {
    const headers = this._columns
      .filter(col => col.field !== '__row_number__')
      .map(col => `"${col.headerName}"`)
      .join(',');

    const rows = this._rows.map(row => {
      return this._columns
        .filter(col => col.field !== '__row_number__')
        .map(col => {
          const val = row.data[col.field];
          return `"${(val !== undefined && val !== null) ? val.toString().replace(/"/g, '""') : ''}"`;
        })
        .join(',');
    });

    return [headers, ...rows].join('\n');
  }

  pushAction(action: GridAction) {
    this._undoStack.push(action);
    if (this._undoStack.length > 100) {
      this._undoStack.shift();
    }
    if (this._onCellChange) {
      action.changes.forEach(change => this._onCellChange!(change));
    }
  }

  undo(): boolean {
    const action = this._undoStack.pop();
    if (!action) return false;

    action.changes.forEach(change => {
      const row = this.getRowById(change.rowId);
      if (row) {
        row.data[change.field] = change.oldValue;
      }
    });

    return true;
  }
}
