import React, { useEffect, useState } from 'react';

interface UnitHistoryProps {
  unitId: string;
}

interface UnitHistoryItem {
  timestamp: string;
  eventType: string;
  description: string;
}

const UnitHistory: React.FC<UnitHistoryProps> = ({ unitId }) => {
  const [historyData, setHistoryData] = useState<UnitHistoryItem[]>([]);

  useEffect(() => {
    // Simulate fetching data based on unitId
    const mockHistory: UnitHistoryItem[] = [
      { timestamp: '2023-10-27 10:00', eventType: 'Inspection Completed', description: 'Passed safety check.' },
      { timestamp: '2023-10-26 14:30', eventType: 'Downtime Started', description: 'Flat tire on front right.' },
      { timestamp: '2023-10-26 16:00', eventType: 'Downtime Ended', description: 'Tire replaced.' },
      { timestamp: '2023-10-25 09:00', eventType: 'Maintenance Performed', description: 'Oil change and filter replacement.' },
    ];
    setHistoryData(mockHistory);
  }, [unitId]); // Fetch data whenever unitId changes

  return (
    <div>
      Displaying history for Unit ID: {unitId}
      <h2>History:</h2>
      <ul>
        {historyData.map((item, index) => (
          <li key={index}>{`${item.timestamp} - ${item.eventType}: ${item.description}`}</li>
        ))}
      </ul>
    </div>
  );
};

export default UnitHistory;