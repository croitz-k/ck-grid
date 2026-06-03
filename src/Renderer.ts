import { StateManager } from './StateManager';

export class Renderer {
  private container: HTMLElement;
  private state: StateManager;
  
  private gridBody: HTMLDivElement;
  private headerContainer: HTMLDivElement;
  private footerContainer: HTMLDivElement;
  private canvas: HTMLDivElement;
  private scroller: HTMLDivElement;
  private selectionBorder: HTMLDivElement;
  
  private cellPool: HTMLDivElement[] = [];
  private activeCells: Map<string, HTMLDivElement> = new Map();

  constructor(container: HTMLElement, state: StateManager) {
    this.container = container;
    this.state = state;

    // 0. Ensure container is prepared for flex layout
    this.container.innerHTML = '';
    this.container.classList.add('ck-grid-container');
    
    // Explicitly set container styles to prevent collapse
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.overflow = 'hidden';
    this.container.style.position = 'relative';
    // If container has no height, give it a default min-height
    if (!this.container.style.height && this.container.clientHeight === 0) {
      this.container.style.height = '400px';
    }

    // 1. Grid Body (Scrollable data area)
    this.gridBody = document.createElement('div');
    this.gridBody.classList.add('ck-grid-body');
    Object.assign(this.gridBody.style, {
      position: 'relative',
      flex: '1',
      overflow: 'auto',
      backgroundColor: '#fff',
      minHeight: '0' // Critical for flex child scrolling
    });

    // 2. Scroller (Invisible, defines scroll boundaries)
    this.scroller = document.createElement('div');
    Object.assign(this.scroller.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      visibility: 'hidden',
      pointerEvents: 'none'
    });

    // 3. Canvas (The actual cell container)
    this.canvas = document.createElement('div');
    this.canvas.classList.add('ck-grid-canvas');
    Object.assign(this.canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none'
    });

    // 4. Header (Sticky inside gridBody)
    this.headerContainer = document.createElement('div');
    this.headerContainer.classList.add('ck-grid-header');
    Object.assign(this.headerContainer.style, {
      position: 'sticky',
      top: '0',
      left: '0',
      zIndex: '1000',
      backgroundColor: '#f5f5f5'
    });

    // 5. Footer (Fixed below gridBody)
    this.footerContainer = document.createElement('div');
    this.footerContainer.classList.add('ck-grid-footer');
    Object.assign(this.footerContainer.style, {
      flexShrink: '0',
      height: `${this.state.footerHeight}px`,
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #ccc',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      zIndex: '1001',
      boxSizing: 'border-box'
    });

    this.selectionBorder = document.createElement('div');
    this.selectionBorder.classList.add('ck-grid-selection-border');
    this.canvas.appendChild(this.selectionBorder);

    this.gridBody.appendChild(this.headerContainer);
    this.gridBody.appendChild(this.canvas);
    this.gridBody.appendChild(this.scroller);
    
    this.container.appendChild(this.gridBody);
    this.container.appendChild(this.footerContainer);

    this.gridBody.addEventListener('scroll', () => {
      this.render();
    });

    // Sync rendering on container resize
    new ResizeObserver(() => this.render()).observe(this.container);

    this.initialRender();
  }

  public get body() { return this.gridBody; }

  private initialRender() {
    this.updateCanvasSize();
    this.renderHeaders();
    this.renderFooter();
    this.render();
  }

  private updateCanvasSize() {
    const w = `${this.state.totalWidth}px`;
    const h = `${this.state.totalHeight + this.state.headerHeight}px`;
    
    this.scroller.style.width = w;
    this.scroller.style.height = h;
    this.canvas.style.width = w;
    this.canvas.style.height = h;
  }

  private renderHeaders() {
    this.headerContainer.innerHTML = '';
    this.headerContainer.style.height = `${this.state.headerHeight}px`;
    this.headerContainer.style.width = `${this.state.totalWidth}px`;

    let left = 0;
    this.state.columns.forEach((col, index) => {
      const headerCell = document.createElement('div');
      headerCell.classList.add('ck-grid-header-cell');
      headerCell.dataset.index = index.toString();
      headerCell.style.left = `${left}px`;
      headerCell.style.width = `${col.width}px`;
      headerCell.style.height = `${this.state.headerHeight}px`;
      
      const textSpan = document.createElement('span');
      textSpan.textContent = col.headerName;
      headerCell.appendChild(textSpan);

      if (this.state.sortColumn === col.field) {
        const indicator = document.createElement('span');
        indicator.classList.add('ck-grid-sort-indicator');
        const isAsc = this.state.sortDirection === 'asc';
        indicator.innerHTML = isAsc 
          ? `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 14l5-5 5 5H7z" fill="currentColor"/></svg>` 
          : `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 10l5 5 5-5H7z" fill="currentColor"/></svg>`;
        headerCell.appendChild(indicator);
      }

      const resizeHandle = document.createElement('div');
      resizeHandle.classList.add('ck-grid-header-resize-handle');
      resizeHandle.dataset.index = index.toString();
      headerCell.appendChild(resizeHandle);

      this.headerContainer.appendChild(headerCell);
      left += (col.width || 100);
    });
  }

  private renderFooter() {
    if (!this.state.pagination) {
      this.footerContainer.style.display = 'none';
      return;
    }
    this.footerContainer.style.display = 'flex';
    this.updateFooterContent();
  }

  public updateFooterContent() {
    if (!this.state.pagination) return;

    const totalRows = this.state.data.length;
    const currentPage = this.state.state.currentPage;
    const totalPages = this.state.totalPages;
    const pageSize = this.state.state.pageSize;

    this.footerContainer.innerHTML = `
      <div style="flex: 1; font-weight: bold; color: #444;">
        Total: ${totalRows.toLocaleString()} rows
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="ck-grid-page-btn" data-action="prev" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
        <span style="min-width: 80px; text-align: center;">Page <strong>${currentPage}</strong> / ${totalPages}</span>
        <button class="ck-grid-page-btn" data-action="next" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        <select class="ck-grid-page-size" style="padding: 2px 4px; border-radius: 4px; border: 1px solid #ccc;">
          ${[50, 100, 200, 500].map(size => `<option value="${size}" ${pageSize === size ? 'selected' : ''}>${size} rows</option>`).join('')}
        </select>
      </div>
    `;

    this.footerContainer.querySelector('[data-action="prev"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.state.setPage(currentPage - 1);
      this.fullRefresh();
    });
    this.footerContainer.querySelector('[data-action="next"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.state.setPage(currentPage + 1);
      this.fullRefresh();
    });
    this.footerContainer.querySelector('.ck-grid-page-size')?.addEventListener('change', (e) => {
      e.stopPropagation();
      const newSize = parseInt((e.target as HTMLSelectElement).value);
      this.state.setPageSize(newSize);
      this.fullRefresh();
    });

    this.footerContainer.addEventListener('mousedown', (e) => e.stopPropagation());
    this.footerContainer.addEventListener('click', (e) => e.stopPropagation());
  }

  private fullRefresh() {
    this.updateCanvasSize();
    this.updateFooterContent();
    this.gridBody.scrollTop = 0;
    this.render();
  }

  public refresh() {
    this.updateCanvasSize();
    this.renderHeaders();
    this.renderFooter();
    this.render();
  }

  public render() {
    const scrollTop = this.gridBody.scrollTop;
    const scrollLeft = this.gridBody.scrollLeft;
    const viewportHeight = this.gridBody.clientHeight;
    const viewportWidth = this.gridBody.clientWidth;

    this.headerContainer.style.transform = `translateX(${-scrollLeft}px)`;

    this.updateSelectionBorder();

    const pagedData = this.state.pagedData;
    const startRow = Math.floor(Math.max(0, scrollTop - this.state.headerHeight) / this.state.rowHeight);
    const endRow = Math.ceil((scrollTop + viewportHeight) / this.state.rowHeight);
    
    const visibleCols: number[] = [];
    let currentX = 0;
    this.state.columns.forEach((col, index) => {
      const colWidth = col.width || 100;
      if (currentX + colWidth > scrollLeft && currentX < scrollLeft + viewportWidth) {
        visibleCols.push(index);
      }
      currentX += colWidth;
    });

    const newActiveKeys = new Set<string>();

    for (let r = startRow; r <= endRow; r++) {
      if (r < 0 || r >= pagedData.length) continue;
      
      for (const c of visibleCols) {
        const key = `${r}-${c}`;
        newActiveKeys.add(key);
        
        let cell = this.activeCells.get(key);
        if (!cell) {
          this.renderCell(r, c, key);
        } else {
          this.updateCellPosition(cell, r, c);
        }
      }
    }

    for (const [key, cell] of this.activeCells.entries()) {
      if (newActiveKeys.has(key)) {
        const parts = key.split('-');
        this.refreshCell(cell, parseInt(parts[0]), parseInt(parts[1]));
      } else {
        cell.style.display = 'none';
        this.cellPool.push(cell);
        this.activeCells.delete(key);
      }
    }
  }

  private updateSelectionBorder() {
    const selection = this.state.state.selection;
    if (!selection) {
      this.selectionBorder.style.display = 'none';
      return;
    }

    this.selectionBorder.style.display = 'block';

    const minRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
    const maxRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
    const minCol = Math.min(selection.start.colIndex, selection.end.colIndex);
    const maxCol = Math.max(selection.start.colIndex, selection.end.colIndex);

    let left = 0;
    for (let i = 0; i < minCol; i++) {
      left += (this.state.columns[i].width || 100);
    }

    let width = 0;
    for (let i = minCol; i <= maxCol; i++) {
      width += (this.state.columns[i].width || 100);
    }

    const top = minRow * this.state.rowHeight + this.state.headerHeight;
    const height = (maxRow - minRow + 1) * this.state.rowHeight;

    this.selectionBorder.style.top = `${top}px`;
    this.selectionBorder.style.left = `${left}px`;
    this.selectionBorder.style.width = `${width}px`;
    this.selectionBorder.style.height = `${height}px`;
  }

  private refreshCell(cell: HTMLDivElement, rowIndex: number, colIndex: number) {
    const col = this.state.columns[colIndex];
    const pagedData = this.state.pagedData;
    const rowData = pagedData[rowIndex];
    const state = this.state.state;
    const isEditingThisCell = state.focusedCell && state.focusedCell.rowIndex === rowIndex && state.focusedCell.colIndex === colIndex && state.isEditing;
    
    const rawValue = rowData ? rowData[col.field] : '';
    let displayValue = (rawValue !== undefined && rawValue !== null) ? rawValue.toString() : '';
    
    if (col.formatter && rowData) {
      displayValue = col.formatter({ value: rawValue, data: rowData, rowIndex });
    }

    const finalValue = isEditingThisCell ? '' : displayValue;
    if (cell.textContent !== finalValue) {
      cell.textContent = finalValue;
    }

    cell.style.backgroundColor = '';
    cell.style.color = '';
    cell.style.fontWeight = '';
    cell.style.textAlign = '';

    if (col.cellStyle && rowData) {
      const styles = col.cellStyle({ value: rawValue, data: rowData, rowIndex });
      Object.assign(cell.style, styles);
    }

    this.updateCellHighlight(cell, rowIndex, colIndex);
  }

  private updateCellPosition(cell: HTMLDivElement, rowIndex: number, colIndex: number) {
    const col = this.state.columns[colIndex];
    let left = 0;
    for (let i = 0; i < colIndex; i++) {
      left += (this.state.columns[i].width || 100);
    }

    cell.style.top = `${rowIndex * this.state.rowHeight + this.state.headerHeight}px`;
    cell.style.left = `${left}px`;
    cell.style.width = `${col.width}px`;
    cell.style.height = `${this.state.rowHeight}px`;
  }

  private renderCell(rowIndex: number, colIndex: number, key: string) {
    let cell = this.cellPool.pop();
    if (!cell) {
      cell = document.createElement('div');
      cell.classList.add('ck-grid-cell');
      cell.style.pointerEvents = 'auto';
      this.canvas.appendChild(cell);
    }

    cell.style.display = 'flex';
    this.updateCellPosition(cell, rowIndex, colIndex);
    this.refreshCell(cell, rowIndex, colIndex);
    this.activeCells.set(key, cell);
    return cell;
  }

  private updateCellHighlight(cell: HTMLDivElement, rowIndex: number, colIndex: number) {
    const state = this.state.state;
    const focused = state.focusedCell;
    const selection = state.selection;

    cell.classList.remove('focused', 'selected');

    if (focused && focused.rowIndex === rowIndex && focused.colIndex === colIndex) {
      cell.classList.add('focused');
    }

    if (selection) {
      const minRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
      const maxRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
      const minCol = Math.min(selection.start.colIndex, selection.end.colIndex);
      const maxCol = Math.max(selection.start.colIndex, selection.end.colIndex);

      if (rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol) {
        cell.classList.add('selected');
      }
    }
  }
}
