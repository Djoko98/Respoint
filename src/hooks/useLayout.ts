import { useEffect } from 'react';
import { useLayoutStore } from '../store/useLayoutStore';
import { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { ZoneContext } from '../context/ZoneContext';

export const useLayout = () => {
  const { user } = useContext(UserContext);
  const { currentZone } = useContext(ZoneContext);
  const store = useLayoutStore();

  // Load layout when zone changes
  useEffect(() => {
    if (user && currentZone) {
      console.log('Loading layout for zone:', currentZone.id);
      store.loadLayoutForZone(user.id, currentZone.id);
    }
  }, [user?.id, currentZone?.id]);

  const saveLayout = async () => {
    if (!user) {
      console.error('No user for saving layout');
      return;
    }
    
    try {
      await store.saveLayout(user.id);
      console.log('Layout saved successfully');
    } catch (error) {
      console.error('Error saving layout:', error);
      throw error;
    }
  };

  return {
    tables: store.tables,
    walls: store.walls,
    labels: store.labels,
    updateTable: store.updateTable,
    addTable: store.addTable,
    removeTable: store.removeTable,
    updateWall: store.updateWall,
    addWall: store.addWall,
    removeWall: store.removeWall,
    updateLabel: store.updateLabel,
    addLabel: store.addLabel,
    removeLabel: store.removeLabel,
    clearLayout: store.clearLayout,
    saveLayout,
    isSaving: store.isSaving,
    currentZoneId: store.currentZoneId
  };
};
