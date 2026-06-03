import { ColumnDef, GridOptions, CellPosition, SelectionRange, GridState, GridAction } from './types';

export class StateManager {
  private _data: any[];
  private _columns: ColumnDef[];
  private _rowHeight: number;
  private _headerHeight: number;
  private _footerHeight: number;
  private _pagination: boolean;
  private _state: GridState;
  
  private _sortColumn: string | null = null;
  private _sortDirection: 'asc' | 'desc' | null = null;
  private _undoStack: GridAction[] = [];
  private _initialDataOrder: any[] = [];

  constructor(options: GridOptions) {
    this._data = options.data;
    this._initialDataOrder = [...options.data];
    this._columns = options.columns.map(col => ({
      ...col,
      width: col.width || 100,
      sortable: col.sortable !== false
    }));
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

  get data() { return this._data; }
  get columns() { return this._columns; }
  get rowHeight() { return this._rowHeight; }
  get headerHeight() { return this._headerHeight; }
  get footerHeight() { return this._footerHeight; }
  get pagination() { return this._pagination; }
  get state() { return this._state; }
  get sortColumn() { return this._sortColumn; }
  get sortDirection() { return this._sortDirection; }

  get pagedData() {
    if (!this._pagination) return this._data;
    const start = (this._state.currentPage - 1) * this._state.pageSize;
    const end = start + this._state.pageSize;
    return this._data.slice(start, end);
  }

  get totalPages() {
    return Math.ceil(this._data.length / this._state.pageSize);
  }

  setFocusedCell(pos: CellPosition | null) {
    this._state.focusedCell = pos;
  }

  setSelection(range: SelectionRange | null) {
    this._state.selection = range;
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
    return this._columns.reduce((sum, col) => sum + (col.width || 100), 0);
  }

  get totalHeight() {
    return this.pagedData.length * this._rowHeight;
  }

  updateData(newData: any[]) {
    this._data = newData;
    this._initialDataOrder = [...newData];
    this._state.currentPage = 1;
  }

  updateColumnWidth(index: number, width: number) {
    if (this._columns[index]) {
      this._columns[index].width = width;
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
      this._data.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      });
    } else {
      this._data.length = 0;
      this._initialDataOrder.forEach(item => this._data.push(item));
    }
  }

  pushAction(action: GridAction) {
    this._undoStack.push(action);
    if (this._undoStack.length > 100) {
      this._undoStack.shift();
    }
  }

  undo(): boolean {
    const action = this._undoStack.pop();
    if (!action) return false;

    action.changes.forEach(change => {
      if (this._data[change.rowIndex]) {
        this._data[change.rowIndex][change.field] = change.oldValue;
      }
    });

    return true;
  }
}
