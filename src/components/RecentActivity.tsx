
import React from 'react';

interface ActivityItem {
  id: string;
  action: string;
  amount: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  return (
    <div className="mx-4 mb-4">
      <h3 className="text-white text-left text-base font-medium mb-2">Recent Activity</h3>
      <div className="bg-gray-800/50 rounded-xl p-4">
        {activities.length > 0 ? (
          <ul className="space-y-3">
            {activities.map((item) => (
              <li key={item.id} className="flex justify-between items-center">
                <div className="text-left">
                  <p className="text-gray-200 text-sm">{item.action}</p>
                  <p className="text-gray-400 text-xs">{item.timestamp}</p>
                </div>
                <p className="text-tg-light-purple font-medium">{item.amount}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm py-2">No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
