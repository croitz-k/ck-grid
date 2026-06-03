export interface ColumnDef {
  field: string;
  headerName: string;
  parentHeaderName?: string; // For multi-level headers
  width?: number;
  pinned?: 'left' | 'right';
  sortable?: boolean;
  editable?: boolean;
  hidden?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
  validator?: (value: string) => boolean | string;
  cellStyle?: (params: { value: any; data: any; rowIndex: number }) => Partial<CSSStyleDeclaration>;
  formatter?: (params: { value: any; data: any; rowIndex: number }) => string;
}

export interface GridRow {
  id: string | number;
  data: any;
  originalIndex: number;
}

export interface GridOptions {
  container: HTMLElement;
  columns: ColumnDef[];
  data: any[];
  rowIdField?: string;
  rowHeight?: number;
  headerHeight?: number;
  footerHeight?: number;
  pagination?: boolean;
  pageSize?: number;
  showRowNumber?: boolean;
  rowStyle?: (params: { data: any; rowIndex: number }) => Partial<CSSStyleDeclaration>;
  onCellChange?: (change: CellChange) => void;
  onSelectionChange?: (selection: SelectionRange | null) => void;
  onRowSelect?: (rows: any[]) => void;
}

export interface CellPosition {
  rowIndex: number; // This is the viewRowIndex (index in the currently displayed paged/sorted list)
  colIndex: number;
}

export interface SelectionRange {
  start: CellPosition;
  end: CellPosition;
}

export interface GridState {
  focusedCell: CellPosition | null;
  selection: SelectionRange | null;
  isEditing: boolean;
  currentPage: number;
  pageSize: number;
}

export interface CellChange {
  rowId: string | number;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface GridAction {
  changes: CellChange[];
}
