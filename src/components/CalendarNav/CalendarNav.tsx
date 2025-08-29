import React from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CalendarNav: React.FC = () => {
  // Placeholder: prikazuje trenutnu nedelju, danasnji dan je istaknut
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + 1 + i);
    return d;
  });

  return (
    <div className="flex gap-2 overflow-x-auto">
      {week.map((date, idx) => {
        const isToday =
          date.toDateString() === today.toDateString();
        return (
          <div
            key={idx}
            className={`flex flex-col items-center px-3 py-2 rounded-lg ${
              isToday
                ? "bg-gradient-to-b from-primary to-accent text-white text-lg font-bold border-2 border-accent"
                : "bg-gray-800 text-gray-200"
            }`}
          >
            <span className="text-xs">{days[idx]}</span>
            <span>{date.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarNav;
