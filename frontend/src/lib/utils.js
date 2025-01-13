export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  
  // Check if the message was sent today
  const isToday = date.toDateString() === now.toDateString();
  
  // Format the time
  const options = { hour: 'numeric', minute: 'numeric', hour12: true };
  const time = date.toLocaleString('en-US', options);
  
  if (isToday) {
    return time;
  }
  
  // Check if the message was sent yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return `Yesterday, ${time}`;
  }
  
  // Format the date for older messages
  const dateOptions = { month: 'short', day: 'numeric' };
  const formattedDate = date.toLocaleString('en-US', dateOptions);
  
  return `${formattedDate}, ${time}`;
};

// Function to test backend connectivity
export const testBackendConnection = async () => {
  try {
    // Try to ping the backend server
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
