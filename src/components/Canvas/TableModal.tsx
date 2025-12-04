import React, { useState, useContext, useEffect } from "react";
import { LayoutContext, Table } from "../../context/LayoutContext";
import { ReservationContext } from "../../context/ReservationContext";
import { UserContext } from "../../context/UserContext";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";

interface TableModalProps {
  table: Table | null;
  onClose: () => void;
}

const TableModal: React.FC<TableModalProps> = ({ table, onClose }) => {
  const { layout, setLayout } = useContext(LayoutContext);
  const { reservations } = useContext(ReservationContext);
  const { user } = useContext(UserContext);
  
  const [name, setName] = useState("");
  const [seats, setSeats] = useState(4);
  const [status, setStatus] = useState<'available' | 'occupied' | 'inactive'>('available');
  const [color, setColor] = useState("#374151");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (table) {
      setName(table.name || `T${table.number}`);
      setSeats(table.seats || 4);
      setStatus(table.status || 'available');
      setColor(table.color || "#374151");
    }
  }, [table]);

  // Global modal open/close events for consistent backdrop/timeline behavior
  useEffect(() => {
    if (!table) return;
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {} };
  }, [table]);

  if (!table) return null;

  const isAuthenticated = !!user;

  // Find reservations for this table - only show active reservations
  const tableReservations = reservations.filter(
    res => res.tableIds?.includes(table.id) && (res.status === 'waiting' || res.status === 'confirmed')
  );

  const handleSave = () => {
    const updatedTables = layout.tables?.map(t => 
      t.id === table.id 
        ? { ...t, name, seats, status, color }
        : t
    ) || [];
    
    setLayout({ ...layout, tables: updatedTables });
    onClose();
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    const remaining = layout.tables?.filter(t => t.id !== table.id) || [];
    // Resequence numbers to fill gaps
    const sorted = [...remaining].sort((a, b) => a.number - b.number);
    const idToNewNumber: Record<string, number> = {};
    sorted.forEach((t, idx) => {
      idToNewNumber[t.id] = idx + 1;
    });
    const resequenced = remaining.map(t => ({
      ...t,
      number: idToNewNumber[t.id],
      name: `${idToNewNumber[t.id]}`
    }));
    setLayout({ ...layout, tables: resequenced });
    onClose();
  };

  const colorOptions = [
    "#374151", // gray-700
    "#4a5568", // gray-600
    "#059669", // emerald-600
    "#2563eb", // blue-600
    "#7c3aed", // violet-600
    "#dc2626", // red-600
    "#ea580c", // orange-600
    "#ca8a04", // yellow-600
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[12050] flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Table Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Table Info */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Table Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Seats</label>
              <input
                type="number"
                min="1"
                max="20"
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="respoint-select w-full"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Table Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={`w-10 h-10 rounded-lg border-2 transition ${
                    color === colorOption ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          {/* Reservations */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Reservations ({tableReservations.length})
            </h3>
            {tableReservations.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tableReservations.map((reservation) => (
                  <div key={reservation.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{reservation.guestName}</p>
                        <p className="text-gray-400 text-sm">
                          {new Date(reservation.date).toLocaleDateString('en-GB')} at {reservation.time}
                        </p>
                        <p className="text-gray-400 text-sm">{reservation.numberOfGuests} guests</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        reservation.status === 'confirmed' 
                          ? 'bg-green-900 text-green-300'
                          : reservation.status === 'pending'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {reservation.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No reservations for this table</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {isAuthenticated && (
          <div className="flex justify-between gap-3 p-6 border-t border-gray-800">
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 hover:text-red-300 transition"
            >
              Delete Table
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Table"
        message={`Are you sure you want to delete table "${table?.name || 'this table'}"? This action cannot be undone and will affect any existing reservations.`}
        confirmText="Delete Table"
        type="delete"
      />
    </div>
  );
};

export default TableModal; 