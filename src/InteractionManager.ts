import { StateManager } from './StateManager';
import { Renderer } from './Renderer';
import { EditorManager } from './EditorManager';
import { CellPosition } from './types';

export class InteractionManager {
  private container: HTMLElement;
  private scrollContainer: HTMLElement;
  private state: StateManager;
  private renderer: Renderer;
  private editor: EditorManager;

  private isResizing = false;
  private resizeColIndex = -1;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  private isSelecting = false;
  private selectionStart: CellPosition | null = null;

  constructor(container: HTMLElement, state: StateManager, renderer: Renderer, editor: EditorManager) {
    this.container = container;
    this.scrollContainer = renderer.body;
    this.state = state;
    this.renderer = renderer;
    this.editor = editor;

    this.container.tabIndex = 0;
    this.container.style.outline = 'none';

    this.initEvents();
  }

  private initEvents() {
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.container.addEventListener('click', (e) => {
      // Don't steal focus if clicking on footer controls
      if ((e.target as HTMLElement).closest('.ck-grid-footer')) return;
      this.container.focus();
    });
    this.container.addEventListener('dblclick', this.handleDblClick.bind(this));
    this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.container.addEventListener('copy', this.handleCopy.bind(this));
    this.container.addEventListener('paste', this.handlePaste.bind(this));
    this.container.addEventListener('contextmenu', this.handleContextMenu.bind(this));

    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private getCellAt(clientX: number, clientY: number): CellPosition | null {
    const rect = this.scrollContainer.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;

    if (relativeY < this.state.headerHeight) return null;

    const x = relativeX + this.scrollContainer.scrollLeft;
    const y = relativeY + this.scrollContainer.scrollTop;

    const rowIndex = Math.floor((y - this.state.headerHeight) / this.state.rowHeight);
    
    let colIndex = -1;
    let currentX = 0;
    const visibleCols = this.state.visibleColumns;
    for (let i = 0; i < visibleCols.length; i++) {
      const w = visibleCols[i].width || 100;
      if (x >= currentX && x < currentX + w) {
        colIndex = i;
        break;
      }
      currentX += w;
    }

    if (rowIndex >= 0 && rowIndex < this.state.pagedData.length && colIndex >= 0) {
      return { rowIndex, colIndex };
    }
    return null;
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    
    if (target.classList.contains('ck-grid-header-resize-handle')) {
      this.isResizing = true;
      this.resizeColIndex = parseInt(target.dataset.index!);
      this.resizeStartX = e.clientX;
      const visibleCols = this.state.visibleColumns;
      this.resizeStartWidth = visibleCols[this.resizeColIndex].width || 100;
      e.preventDefault();
      return;
    }

    if (target.closest('.ck-grid-header')) {
      const headerCell = target.closest('.ck-grid-header-cell') as HTMLElement;
      if (headerCell) {
        const colIndex = parseInt(headerCell.dataset.index!);
        const col = this.state.visibleColumns[colIndex];
        if (col && col.sortable !== false) {
          this.state.sortByColumn(col.field);
          this.renderer.refresh();
        }
      }
      return;
    }

    const pos = this.getCellAt(e.clientX, e.clientY);
    if (pos) {
      if (e.shiftKey && this.state.state.focusedCell) {
        this.state.setSelection({
          start: this.state.state.focusedCell,
          end: pos
        });
      } else {
        this.state.setFocusedCell(pos);
        this.state.setSelection({ start: pos, end: pos });
        this.isSelecting = true;
        this.selectionStart = pos;
      }
      this.renderer.render();
      this.container.focus();
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.isResizing) {
      const deltaX = e.clientX - this.resizeStartX;
      const newWidth = Math.max(20, this.resizeStartWidth + deltaX);
      const visibleCols = this.state.visibleColumns;
      const colField = visibleCols[this.resizeColIndex].field;
      const actualColIdx = this.state.columns.findIndex(c => c.field === colField);
      this.state.updateColumnWidth(actualColIdx, newWidth);
      this.renderer.refresh();
      return;
    }

    if (this.isSelecting && this.selectionStart) {
      const pos = this.getCellAt(e.clientX, e.clientY);
      if (pos) {
        this.state.setSelection({
          start: this.selectionStart,
          end: pos
        });
        this.renderer.render();
      }
    }
  }

  private handleMouseUp() {
    this.isResizing = false;
    this.isSelecting = false;
    this.selectionStart = null;
  }

  private handleDblClick(e: MouseEvent) {
    const pos = this.getCellAt(e.clientX, e.clientY);
    if (pos) {
      this.editor.startEditing(pos);
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.editor.isEditing) return;

    const focus = this.state.state.focusedCell;
    if (!focus) return;

    let { rowIndex, colIndex } = focus;
    const visibleCols = this.state.visibleColumns;

    if (e.ctrlKey && e.key === 'z') {
      if (this.state.undo()) {
        this.renderer.render();
      }
      e.preventDefault();
      return;
    }

    const selection = this.state.state.selection;
    let endPos = selection ? { ...selection.end } : { ...focus };

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      this.editor.startEditing(focus, e.key);
      e.preventDefault();
      return;
    }

    if (e.shiftKey) {
      switch (e.key) {
        case 'ArrowUp': endPos.rowIndex = Math.max(0, endPos.rowIndex - 1); break;
        case 'ArrowDown': endPos.rowIndex = Math.min(this.state.pagedData.length - 1, endPos.rowIndex + 1); break;
        case 'ArrowLeft': endPos.colIndex = Math.max(0, endPos.colIndex - 1); break;
        case 'ArrowRight': endPos.colIndex = Math.min(visibleCols.length - 1, endPos.colIndex + 1); break;
        case 'PageUp': endPos.rowIndex = Math.max(0, endPos.rowIndex - 20); break;
        case 'PageDown': endPos.rowIndex = Math.min(this.state.pagedData.length - 1, endPos.rowIndex + 20); break;
        case 'Home': endPos.colIndex = 0; if (e.ctrlKey) endPos.rowIndex = 0; break;
        case 'End': endPos.colIndex = visibleCols.length - 1; if (e.ctrlKey) endPos.rowIndex = this.state.pagedData.length - 1; break;
      }
      this.state.setSelection({ start: focus, end: endPos });
      this.ensureVisible(endPos);
      this.renderer.render();
      e.preventDefault();
      return;
    }

    switch (e.key) {
      case 'F2':
        this.editor.startEditing(focus);
        e.preventDefault();
        return;
      case 'ArrowUp': rowIndex = Math.max(0, rowIndex - 1); break;
      case 'ArrowDown': rowIndex = Math.min(this.state.pagedData.length - 1, rowIndex + 1); break;
      case 'ArrowLeft': colIndex = Math.max(0, colIndex - 1); break;
      case 'ArrowRight': colIndex = Math.min(visibleCols.length - 1, colIndex + 1); break;
      case 'PageUp': rowIndex = Math.max(0, rowIndex - 20); break;
      case 'PageDown': rowIndex = Math.min(this.state.pagedData.length - 1, rowIndex + 20); break;
      case 'Home': colIndex = 0; if (e.ctrlKey) rowIndex = 0; break;
      case 'End': colIndex = visibleCols.length - 1; if (e.ctrlKey) rowIndex = this.state.pagedData.length - 1; break;
      case 'Tab':
        if (e.shiftKey) colIndex = Math.max(0, colIndex - 1);
        else colIndex = Math.min(visibleCols.length - 1, colIndex + 1);
        break;
      case 'Enter': 
        if (rowIndex === this.state.pagedData.length - 1) {
          this.state.addRow();
          this.renderer.refresh();
        }
        rowIndex = Math.min(this.state.pagedData.length - 1, rowIndex + 1); 
        break;
      case 'ArrowDown':
        if (rowIndex === this.state.pagedData.length - 1) {
          this.state.addRow();
          this.renderer.refresh();
        }
        rowIndex = Math.min(this.state.pagedData.length - 1, rowIndex + 1);
        break;
    }

    if (rowIndex !== focus.rowIndex || colIndex !== focus.colIndex) {
      const newPos = { rowIndex, colIndex };
      this.state.setFocusedCell(newPos);
      this.state.setSelection({ start: newPos, end: newPos });
      this.ensureVisible(newPos);
      this.renderer.render();
      e.preventDefault();
    }
  }

  private handleCopy(e: ClipboardEvent) {
    const selection = this.state.state.selection;
    if (!selection || !e.clipboardData) return;

    const minRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
    const maxRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
    const minCol = Math.min(selection.start.colIndex, selection.end.colIndex);
    const maxCol = Math.max(selection.start.colIndex, selection.end.colIndex);

    let rows = [];
    const visibleCols = this.state.visibleColumns;
    for (let r = minRow; r <= maxRow; r++) {
      let row = [];
      const gridRow = this.state.getRowByViewIndex(r);
      if (gridRow) {
        for (let c = minCol; c <= maxCol; c++) {
          const col = visibleCols[c];
          row.push(gridRow.data[col.field]);
        }
      }
      rows.push(row.join('\t'));
    }

    e.clipboardData.setData('text/plain', rows.join('\n'));
    e.preventDefault();
  }

  private handlePaste(e: ClipboardEvent) {
    const state = this.state.state;
    const focus = state.focusedCell;
    const selection = state.selection;
    if (!focus || !e.clipboardData) return;

    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    const pastedRows = text.split(/\r?\n/).map(row => row.split('\t'));
    const changes: any[] = [];
    const visibleCols = this.state.visibleColumns;

    // Determine target range and starting point
    let targetRowIndexes: number[] = [];
    let startColIndex: number;

    if (selection) {
      const minRow = Math.min(selection.start.rowIndex, selection.end.rowIndex);
      const maxRow = Math.max(selection.start.rowIndex, selection.end.rowIndex);
      for (let i = minRow; i <= maxRow; i++) targetRowIndexes.push(i);
      startColIndex = Math.min(selection.start.colIndex, selection.end.colIndex);
    } else {
      targetRowIndexes = [focus.rowIndex];
      startColIndex = focus.colIndex;
    }

    targetRowIndexes.forEach((viewRowIdx, rOffset) => {
      // Use pasted row based on index, loop back if selection is larger than copied data
      const sourceRowData = pastedRows[rOffset % pastedRows.length];
      const gridRow = this.state.getRowByViewIndex(viewRowIdx);
      
      if (gridRow) {
        sourceRowData.forEach((cellText, cIdx) => {
          const targetColIdx = startColIndex + cIdx;
          
          if (targetColIdx < visibleCols.length) {
            const col = visibleCols[targetColIdx];
            if (col.editable === false) return;

            const oldValue = gridRow.data[col.field];
            if (oldValue !== cellText) {
              changes.push({
                rowId: gridRow.id,
                field: col.field,
                oldValue: oldValue,
                newValue: cellText
              });
              gridRow.data[col.field] = cellText;
            }
          }
        });
      }
    });

    if (changes.length > 0) {
      this.state.pushAction({ changes });
      this.renderer.render();
    }
    e.preventDefault();
  }

  private handleContextMenu(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('.ck-grid-header')) return;

    e.preventDefault();
    
    const pos = this.getCellAt(e.clientX, e.clientY);
    if (pos) {
      if (!this.state.isCellInSelection(pos)) {
        this.state.setFocusedCell(pos);
        this.state.setSelection({ start: pos, end: pos });
      }
      this.renderer.render();
    } else {
      // If we clicked outside cells (but not on header), don't show the menu
      return;
    }

    const actions = [
      { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
      { label: 'Paste', shortcut: 'Ctrl+V', action: () => {
        // For security reasons, web browsers often restrict programmatic paste access.
        // We prompt the user to use the native keyboard shortcut.
        alert('Please use Ctrl+V to paste for security reasons.');
      } },
      { label: 'divider', action: () => {} },
      { label: 'Undo', shortcut: 'Ctrl+Z', action: () => {
        if (this.state.undo()) this.renderer.render();
      } },
      { label: 'divider', action: () => {} },
      { label: 'Export CSV', action: () => {
        const csv = this.state.csvExport();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'export.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } }
    ];

    this.renderer.showContextMenu(e.clientX, e.clientY, actions);
  }

  private ensureVisible(pos: CellPosition) {
    const rowTop = pos.rowIndex * this.state.rowHeight + this.state.headerHeight;
    const rowBottom = rowTop + this.state.rowHeight;
    
    let colLeft = 0;
    const visibleCols = this.state.visibleColumns;
    for (let i = 0; i < pos.colIndex; i++) {
      colLeft += (visibleCols[i].width || 100);
    }
    const colRight = colLeft + (visibleCols[pos.colIndex].width || 100);

    const scrollTop = this.scrollContainer.scrollTop;
    const scrollLeft = this.scrollContainer.scrollLeft;
    const viewportHeight = this.scrollContainer.clientHeight;
    const viewportWidth = this.scrollContainer.clientWidth;

    if (rowTop < scrollTop + this.state.headerHeight) {
      this.scrollContainer.scrollTop = rowTop - this.state.headerHeight;
    } else if (rowBottom > scrollTop + viewportHeight) {
      this.scrollContainer.scrollTop = rowBottom - viewportHeight;
    }

    if (colLeft < scrollLeft) {
      this.scrollContainer.scrollLeft = colLeft;
    } else if (colRight > scrollLeft + viewportWidth) {
      this.scrollContainer.scrollLeft = colRight - viewportWidth;
    }
  }
}
