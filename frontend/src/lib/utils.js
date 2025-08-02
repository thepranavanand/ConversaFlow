export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  
  const options = { hour: 'numeric', minute: 'numeric', hour12: true };
  const time = date.toLocaleString('en-US', options);
  
  if (isToday) {
    return time;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return `Yesterday, ${time}`;
  }
  
  const dateOptions = { month: 'short', day: 'numeric' };
  const formattedDate = date.toLocaleString('en-US', dateOptions);
  
  return `${formattedDate}, ${time}`;
};

export const testBackendConnection = async () => {
  try {
    const response = await fetch('http://localhost:5001/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Backend server is reachable');
      return true;
    } else {
      console.error('Backend server returned an error:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Cannot connect to backend server:', error);
    return false;
  }
};
