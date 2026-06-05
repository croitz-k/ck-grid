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
    
    const value = initialValue !== undefined ? initialValue : (row ? row.data[col.field] : '');

    const input = document.createElement('input');
    input.classList.add('ck-grid-editor');
    input.value = value;
    const editor = input;

    this.editor = editor as any;

    // Position the editor - same as cell
    let left = 0;
    for (let i = 0; i < pos.colIndex; i++) {
      left += (visibleCols[i].width || 100);
    }

    editor.style.top = `${pos.rowIndex * this.state.rowHeight + this.state.headerHeight}px`;
    editor.style.left = `${left}px`;
    editor.style.width = `${col.width}px`;
    editor.style.height = `${this.state.rowHeight}px`;

    const canvas = this.container.querySelector('.ck-grid-canvas');
    if (canvas) {
      canvas.appendChild(editor);
    }
    
    editor.focus();

    if (initialValue === undefined && editor instanceof HTMLInputElement) {
      editor.select();
    }

    // Hide the text of the cell being edited
    this.renderer.render();

    editor.addEventListener('mousedown', (e) => e.stopPropagation());
    editor.addEventListener('click', (e) => e.stopPropagation());

    if (col.cellType === 'select') {
      editor.addEventListener('change', () => this.stopEditing(true));
    }

    editor.addEventListener('blur', () => this.stopEditing(true));
    editor.addEventListener('keydown', ((e: KeyboardEvent) => {
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
    }) as EventListener);
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

