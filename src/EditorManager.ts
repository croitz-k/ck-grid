import { StateManager } from './StateManager';
import { Renderer } from './Renderer';
import { CellPosition } from './types';

export class EditorManager {
  private container: HTMLElement;
  private state: StateManager;
  private renderer: Renderer;
  private editor: HTMLInputElement | null = null;
  private editingCell: CellPosition | null = null;

  constructor(container: HTMLElement, state: StateManager, renderer: Renderer) {
    this.container = container;
    this.state = state;
    this.renderer = renderer;
  }

  public startEditing(pos: CellPosition, initialValue?: string) {
    if (this.editingCell) {
      this.stopEditing();
    }

    this.editingCell = pos;
    this.state.setIsEditing(true);
    
    this.editor = document.createElement('input');
    this.editor.classList.add('ck-grid-editor');
    
    const rowData = this.state.data[pos.rowIndex];
    const col = this.state.columns[pos.colIndex];
    this.editor.value = initialValue !== undefined ? initialValue : (rowData ? rowData[col.field] : '');

    // Position the editor - same as cell
    let left = 0;
    for (let i = 0; i < pos.colIndex; i++) {
      left += (this.state.columns[i].width || 100);
    }

    this.editor.style.top = `${pos.rowIndex * this.state.rowHeight + this.state.headerHeight}px`;
    this.editor.style.left = `${left}px`;
    this.editor.style.width = `${col.width}px`;
    this.editor.style.height = `${this.state.rowHeight}px`;

    const canvas = this.container.querySelector('.ck-grid-canvas');
    if (canvas) {
      canvas.appendChild(this.editor);
    }
    
    this.editor.focus();

    if (initialValue === undefined) {
      this.editor.select();
    }

    // Hide the text of the cell being edited
    this.renderer.render();

    this.editor.addEventListener('blur', () => this.stopEditing(true));
    this.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        this.stopEditing(true);
        this.container.focus();
        // Enter/Tab in editor should ideally move focus, but let's fix F2 first
      } else if (e.key === 'Escape') {
        this.stopEditing(false);
        this.container.focus();
      }
    });
  }

  public stopEditing(save: boolean = false) {
    const editor = this.editor;
    const pos = this.editingCell;

    if (!editor || !pos) return;

    this.editor = null;
    this.editingCell = null;
    this.state.setIsEditing(false);

    if (save) {
      const col = this.state.columns[pos.colIndex];
      if (this.state.data[pos.rowIndex]) {
        const oldValue = this.state.data[pos.rowIndex][col.field];
        const newValue = editor.value;

        if (oldValue !== newValue) {
          this.state.pushAction({
            changes: [{
              rowIndex: pos.rowIndex,
              field: col.field,
              oldValue: oldValue,
              newValue: newValue
            }]
          });
          this.state.data[pos.rowIndex][col.field] = newValue;
        }
      }
    }

    if (editor.parentElement) {
      editor.remove();
    }

    this.renderer.render();
  }

  get isEditing() {
    return !!this.editingCell;
  }
}
