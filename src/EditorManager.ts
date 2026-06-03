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

    const row = this.state.getRowByViewIndex(pos.rowIndex);
    const visibleCols = this.state.visibleColumns;
    const col = visibleCols[pos.colIndex];

    if (col.editable === false) return;

    this.editingCell = pos;
    this.state.setIsEditing(true);
    
    this.editor = document.createElement('input');
    this.editor.classList.add('ck-grid-editor');
    this.editor.value = initialValue !== undefined ? initialValue : (row ? row.data[col.field] : '');

    // Position the editor - same as cell
    let left = 0;
    for (let i = 0; i < pos.colIndex; i++) {
      left += (visibleCols[i].width || 100);
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
        if (!this.editingCell) { // If validation failed, editingCell remains set
          this.container.focus();
        }
      } else if (e.key === 'Escape') {
        this.stopEditing(false);
        this.container.focus();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation(); // Stop original event from bubbling to container
        this.stopEditing(true);
        
        if (!this.editingCell) {
          // Ensure container is focused so InteractionManager can handle the new event
          this.container.focus();
          
          // Trigger a new navigation event on the container
          const navEvent = new KeyboardEvent('keydown', {
            key: e.key,
            bubbles: true,
            cancelable: true
          });
          this.container.dispatchEvent(navEvent);
        }
      }
    });
  }

  public stopEditing(save: boolean = false) {
    const editor = this.editor;
    const pos = this.editingCell;

    if (!editor || !pos) return;

    const visibleCols = this.state.visibleColumns;
    const col = visibleCols[pos.colIndex];

    if (save) {
      const row = this.state.getRowByViewIndex(pos.rowIndex);
      if (row) {
        const oldValue = row.data[col.field];
        const newValue = editor.value;

        if (oldValue !== newValue) {
          // Validation
          if (col.validator) {
            const validationResult = col.validator(newValue);
            if (validationResult !== true) {
              editor.classList.add('invalid');
              if (typeof validationResult === 'string') {
                editor.title = validationResult;
              }
              editor.focus();
              return; // Keep editing
            }
          }

          this.state.pushAction({
            changes: [{
              rowId: row.id,
              field: col.field,
              oldValue: oldValue,
              newValue: newValue
            }]
          });
          row.data[col.field] = newValue;
        }
      }
    }

    this.editor = null;
    this.editingCell = null;
    this.state.setIsEditing(false);

    if (editor.parentElement) {
      editor.remove();
    }

    this.renderer.render();
  }

  get isEditing() {
    return !!this.editingCell;
  }
}
