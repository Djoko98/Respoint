import React from "react";

interface DashboardProps {
  selectedDate: Date;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedDate }) => {
  // Placeholder for manager dashboard/statistics
  return (
    <div className="fixed left-1/2 top-20 -translate-x-1/2 w-[600px] bg-gray-900 border border-gray-800 rounded shadow-lg z-50 p-6 hidden">
      <div className="text-xl font-bold mb-4 text-white">Manager Dashboard</div>
      <div className="text-gray-300">Statistics and charts will appear here.</div>
    </div>
  );
};

export default Dashboard;
