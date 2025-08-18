// Netlify Function for Admin Authentication
// This function handles admin route protection

const adminAuth = async (event, context) => {
  // Only run on admin routes
  if (!event.path.startsWith('/admin')) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Not an admin route' })
    };
  }

  try {
    // Get authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'No authorization header provided',
          redirect: '/admin/login'
        })
      };
    }

    // Check if it's a valid admin token
    // You can implement your own token validation logic here
    const token = authHeader.replace('Bearer ', '');
    
    // For now, we'll do a basic check
    // In production, you should validate against your database or JWT
    if (!token || token === 'invalid') {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid admin token',
          redirect: '/admin/login'
        })
      };
    }

    // If we reach here, the user is authenticated
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        message: 'Admin authenticated',
        authorized: true
      })
    };

  } catch (error) {
    console.error('Admin auth error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Authentication check failed',
        redirect: '/admin/login'
      })
    };
  }
};

// Handle different HTTP methods
const handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: ''
    };
  }

  // Handle GET requests for admin routes
  if (event.httpMethod === 'GET') {
    return await adminAuth(event, context);
  }

  // Handle other methods
  return {
    statusCode: 405,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      error: 'Method Not Allowed',
      message: 'Only GET and OPTIONS methods are allowed'
    })
  };
};

module.exports = { handler }; 