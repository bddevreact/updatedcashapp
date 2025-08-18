// Netlify Edge Function for Admin Route Protection
// This runs at the edge for better performance and security

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only apply to admin routes
  if (!path.startsWith('/admin')) {
    return context.next();
  }

  // Allow access to admin login page
  if (path === '/admin/login') {
    return context.next();
  }

  try {
    // Get admin token from cookies or headers
    const adminToken = request.headers.get('x-admin-token') || 
                      getCookieValue(request, 'adminToken');

    if (!adminToken) {
      // Redirect to admin login
      return new Response('', {
        status: 302,
        headers: {
          'Location': '/admin/login',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // Validate admin token (you can add your validation logic here)
    if (!isValidAdminToken(adminToken)) {
      // Clear invalid token and redirect
      return new Response('', {
        status: 302,
        headers: {
          'Location': '/admin/login',
          'Set-Cookie': 'adminToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // Add security headers for admin routes
    const response = await context.next();
    
    // Add admin-specific security headers
    response.headers.set('X-Admin-Access', 'true');
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error) {
    console.error('Admin protection error:', error);
    
    // On error, redirect to login
    return new Response('', {
      status: 302,
      headers: {
        'Location': '/admin/login',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
};

// Helper function to get cookie value
function getCookieValue(request, name) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return null;
}

// Helper function to validate admin token
function isValidAdminToken(token) {
  // Add your token validation logic here
  // For now, we'll do a basic check
  if (!token || token === 'invalid') {
    return false;
  }
  
  // Check if token starts with expected prefix
  if (!token.startsWith('mock_admin_token_')) {
    return false;
  }
  
  // You can add more validation like:
  // - JWT verification
  // - Database lookup
  // - Expiration check
  
  return true;
} 