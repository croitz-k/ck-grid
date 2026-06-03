import { GridOptions } from './types';
import { StateManager } from './StateManager';
import { Renderer } from './Renderer';
import { InteractionManager } from './InteractionManager';
import { EditorManager } from './EditorManager';
import './style.css';

export class CKGrid {
  private state: StateManager;
  private renderer: Renderer;
  private editor: EditorManager;

  constructor(options: GridOptions) {
    this.state = new StateManager(options);
    this.renderer = new Renderer(options.container, this.state);
    this.editor = new EditorManager(options.container, this.state, this.renderer);
    new InteractionManager(options.container, this.state, this.renderer, this.editor);
    
    // Ensure initial state is rendered
    this.renderer.refresh();
  }

  public updateData(data: any[]) {
    this.state.updateData(data);
    this.renderer.refresh();
  }

  public updateOptions(options: Partial<GridOptions>) {
    this.state.updateOptions(options);
    this.renderer.refresh();
  }

  public setColumnVisibility(field: string, visible: boolean) {
    this.state.setColumnVisibility(field, visible);
    this.renderer.refresh();
  }

  public exportCSV(): string {
    return this.state.csvExport();
  }

  public undo() {
    if (this.state.undo()) {
      this.renderer.render();
    }
  }

  public destroy() {
    // Basic cleanup
    this.state.updateData([]);
    this.renderer.body.innerHTML = '';
  }
}
