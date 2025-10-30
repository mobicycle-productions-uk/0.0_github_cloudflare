/**
 * Utility functions for ALLY Beat Sheets Worker
 */

/**
 * Create JSON response with CORS headers
 */
export function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  });
}

/**
 * Parse request body safely
 */
export async function parseRequestBody(request) {
  try {
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/json')) {
      return await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const data = {};
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
      return data;
    } else {
      return await request.text();
    }
  } catch (error) {
    throw new Error(`Failed to parse request body: ${error.message}`);
  }
}

/**
 * Validate beat data structure
 */
export function validateBeatData(data) {
  const errors = [];
  
  if (!data) {
    errors.push('Beat data is required');
    return { isValid: false, errors };
  }
  
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Beat title is required');
  }
  
  if (!data.description || data.description.trim().length === 0) {
    errors.push('Beat description is required');
  }
  
  if (data.beat_number !== undefined && (isNaN(data.beat_number) || data.beat_number < 1)) {
    errors.push('Beat number must be a positive integer');
  }
  
  if (data.scene_number !== undefined && (isNaN(data.scene_number) || data.scene_number < 1)) {
    errors.push('Scene number must be a positive integer');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize HTML content for safe display
 */
export function sanitizeHTML(html) {
  if (!html) return '';
  
  // Basic sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(dateString) {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid timestamp';
  }
}

/**
 * Generate unique ID for beats
 */
export function generateBeatId(actNumber, beatNumber) {
  return `act${actNumber}_beat${beatNumber}`;
}

/**
 * Extract act number from various formats
 */
export function parseActNumber(actString) {
  if (typeof actString === 'number') return actString;
  
  const match = String(actString).match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Validate act number
 */
export function isValidActNumber(actNumber) {
  const num = parseActNumber(actNumber);
  return num !== null && num >= 1 && num <= 10; // Reasonable range for act numbers
}

/**
 * Create error response with standard format
 */
export function errorResponse(message, status = 400, details = null) {
  const error = {
    error: true,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    error.details = details;
  }
  
  return jsonResponse(error, status);
}

/**
 * Create success response with standard format
 */
export function successResponse(data, message = 'Success') {
  return jsonResponse({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log with timestamp and service identifier
 */
export function log(level, message, data = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'beat-sheets-worker',
    level,
    message
  };
  
  if (data) {
    logEntry.data = data;
  }
  
  console.log(JSON.stringify(logEntry));
}

/**
 * Truncate text to specified length
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Clean and normalize text content
 */
export function normalizeText(text) {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, '\n');
}

/**
 * Check if string is valid JSON
 */
export function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects with deep merging
 */
export function mergeObjects(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeObjects(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(identifier, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    return true;
  }
  
  getRemainingRequests(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      return this.maxRequests;
    }
    
    const userRequests = this.requests.get(identifier);
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}