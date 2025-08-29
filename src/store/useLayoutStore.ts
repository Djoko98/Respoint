import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { layoutsService } from '../services/layoutsService';

export interface TableState {
  id: string;
  x: number;
  y: number;
  rotation: number;
  shape: 'rect' | 'circle';
  width: number;
  height: number;
  seats: number;
  label: string;
}

export interface WallState {
  id: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
}

export interface LabelState {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

interface LayoutState {
  tables: TableState[];
  walls: WallState[];
  labels: LabelState[];
  currentZoneId: string | null;
  isSaving: boolean;
  
  setCurrentZoneId: (id: string | null) => void;
  loadLayoutForZone: (userId: string, zoneId: string) => Promise<void>;
  saveLayout: (userId: string) => Promise<void>;
  updateTable: (table: Partial<TableState> & { id: string }) => void;
  addTable: (table: TableState) => void;
  removeTable: (id: string) => void;
  updateWall: (wall: Partial<WallState> & { id: string }) => void;
  addWall: (wall: WallState) => void;
  removeWall: (id: string) => void;
  updateLabel: (label: Partial<LabelState> & { id: string }) => void;
  addLabel: (label: LabelState) => void;
  removeLabel: (id: string) => void;
  clearLayout: () => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  tables: [],
  walls: [],
  labels: [],
  currentZoneId: null,
  isSaving: false,
  
  setCurrentZoneId: (id) => set({ currentZoneId: id }),

  loadLayoutForZone: async (userId, zoneId) => {
    console.log('Loading layout for zone:', zoneId);
    set({ currentZoneId: zoneId });
    
    try {
      const layout = await layoutsService.getLayoutByZone(zoneId);
      
      if (layout) {
        console.log('Layout loaded:', layout);
        set({
          tables: layout.data.tables || [],
          walls: layout.data.walls || [],
          labels: layout.data.labels || [],
        });
      } else {
        console.log('No layout found, starting fresh');
        set({ tables: [], walls: [], labels: [] });
      }
    } catch (error) {
      console.error('Error loading layout:', error);
      set({ tables: [], walls: [], labels: [] });
    }
  },

  saveLayout: async (userId) => {
    const state = get();
    if (!state.currentZoneId) {
      console.error('❌ No zone selected');
      return;
    }

    if (!userId) {
      console.error('❌ No user ID provided');
      return;
    }

    set({ isSaving: true });
    
    try {
      const layoutData = {
        tables: state.tables,
        walls: state.walls,
        labels: state.labels,
      };
      
      console.log('📤 Saving layout to Supabase:', {
        userId,
        zoneId: state.currentZoneId,
        tableCount: state.tables.length,
        wallCount: state.walls.length,
        labelCount: state.labels.length
      });
      
      await layoutsService.saveLayoutForZone(userId, state.currentZoneId, layoutData);
      console.log('✅ Layout saved successfully');
    } catch (error: any) {
      console.error('❌ Error saving layout:', error);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  updateTable: (updatedTable) => {
    set((state) => ({
      tables: state.tables.map(table =>
        table.id === updatedTable.id ? { ...table, ...updatedTable } : table
      ),
    }));
  },

  addTable: (table) => {
    set((state) => ({
      tables: [...state.tables, table],
    }));
  },

  removeTable: (id) => {
    set((state) => ({
      tables: state.tables.filter(table => table.id !== id),
    }));
  },

  updateWall: (updatedWall) => {
    set((state) => ({
      walls: state.walls.map(wall =>
        wall.id === updatedWall.id ? { ...wall, ...updatedWall } : wall
      ),
    }));
  },

  addWall: (wall) => {
    set((state) => ({
      walls: [...state.walls, wall],
    }));
  },

  removeWall: (id) => {
    set((state) => ({
      walls: state.walls.filter(wall => wall.id !== id),
    }));
  },

  updateLabel: (updatedLabel) => {
    set((state) => ({
      labels: state.labels.map(label =>
        label.id === updatedLabel.id ? { ...label, ...updatedLabel } : label
      ),
    }));
  },

  addLabel: (label) => {
    set((state) => ({
      labels: [...state.labels, label],
    }));
  },

  removeLabel: (id) => {
    set((state) => ({
      labels: state.labels.filter(label => label.id !== id),
    }));
  },

  clearLayout: () => {
    set({ tables: [], walls: [], labels: [] });
  },
})); 