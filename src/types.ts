export interface ColumnDef {
  field: string;
  headerName: string;
  width?: number;
  pinned?: 'left' | 'right';
  sortable?: boolean;
  cellStyle?: (params: { value: any; data: any; rowIndex: number }) => Partial<CSSStyleDeclaration>;
  formatter?: (params: { value: any; data: any; rowIndex: number }) => string;
}

export interface GridOptions {
  container: HTMLElement;
  columns: ColumnDef[];
  data: any[];
  rowHeight?: number;
  headerHeight?: number;
  footerHeight?: number;
  pagination?: boolean;
  pageSize?: number;
}

export interface CellPosition {
  rowIndex: number;
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
  rowIndex: number;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface GridAction {
  changes: CellChange[];
}
