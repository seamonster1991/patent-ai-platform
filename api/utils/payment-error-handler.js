import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Error types and severity levels
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SIGNATURE_ERROR: 'SIGNATURE_ERROR',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  CANCELLED_BY_USER: 'CANCELLED_BY_USER',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};

export const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

// Custom Payment Error class
export class PaymentError extends Error {
  constructor(message, type, severity = ERROR_SEVERITY.MEDIUM, details = {}) {
    super(message);
    this.name = 'PaymentError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// Payment Request Controller for network cancellation
export class PaymentRequestController {
  constructor() {
    this.controllers = new Map();
  }

  createController(orderId) {
    const controller = new AbortController();
    this.controllers.set(orderId, controller);
    return controller;
  }

  cancelRequest(orderId) {
    const controller = this.controllers.get(orderId);
    if (controller) {
      controller.abort();
      this.controllers.delete(orderId);
      return true;
    }
    return false;
  }

  cleanup(orderId) {
    this.controllers.delete(orderId);
  }

  cancelAllRequests() {
    for (const [orderId, controller] of this.controllers) {
      controller.abort();
    }
    this.controllers.clear();
  }
}

// Global request controller instance
export const paymentRequestController = new PaymentRequestController();

// Retry payment operation with exponential backoff
export async function retryPaymentOperation(operation, orderId, options = {}) {
  const config = { ...RETRY_CONFIG, ...options };
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = paymentRequestController.createController(`${orderId}_retry_${attempt}`);
      const result = await operation(controller.signal);
      paymentRequestController.cleanup(`${orderId}_retry_${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      paymentRequestController.cleanup(`${orderId}_retry_${attempt}`);

      // Don't retry for certain error types
      if (error.type === ERROR_TYPES.VALIDATION_ERROR ||
          error.type === ERROR_TYPES.AUTHENTICATION_ERROR ||
          error.type === ERROR_TYPES.CANCELLED_BY_USER) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new PaymentError(
    `Payment operation failed after ${config.maxRetries + 1} attempts`,
    ERROR_TYPES.SYSTEM_ERROR,
    ERROR_SEVERITY.HIGH,
    { originalError: lastError, orderId }
  );
}

// Log payment error to database and console
export async function logPaymentError(error, context = {}) {
  const errorLog = {
    error_type: error.type || ERROR_TYPES.SYSTEM_ERROR,
    error_message: error.message,
    severity: error.severity || ERROR_SEVERITY.MEDIUM,
    details: JSON.stringify({
      ...error.details,
      ...context,
      stack: error.stack
    }),
    timestamp: new Date().toISOString(),
    order_id: context.orderId || null,
    user_id: context.userId || null,
    ip_address: context.ipAddress || null,
    user_agent: context.userAgent || null
  };

  try {
    // Log to database
    await supabase
      .from('payment_error_logs')
      .insert(errorLog);
  } catch (dbError) {
    console.error('Failed to log payment error to database:', dbError);
  }

  // Always log to console
  console.error('Payment Error:', {
    ...errorLog,
    timestamp: new Date().toISOString()
  });

  // Send alert for critical errors
  if (error.severity === ERROR_SEVERITY.CRITICAL) {
    await sendCriticalErrorAlert(errorLog);
  }
}

// Handle payment cancellation
export async function handlePaymentCancellation(orderId, reason = 'User cancelled', context = {}) {
  try {
    // Cancel any ongoing requests for this order
    paymentRequestController.cancelRequest(orderId);

    // Update order status to cancelled
    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (updateError) {
      throw new PaymentError(
        'Failed to update order status to cancelled',
        ERROR_TYPES.DATABASE_ERROR,
        ERROR_SEVERITY.HIGH,
        { orderId, updateError }
      );
    }

    // Log cancellation
    await logPaymentError(
      new PaymentError(
        `Payment cancelled: ${reason}`,
        ERROR_TYPES.CANCELLED_BY_USER,
        ERROR_SEVERITY.LOW,
        { orderId, reason }
      ),
      context
    );

    // Clean up any pending transactions
    await cleanupPendingTransactions(orderId);

    return { success: true, orderId, reason };
  } catch (error) {
    await logPaymentError(error, { ...context, orderId });
    throw error;
  }
}

// Clean up pending transactions
export async function cleanupPendingTransactions(orderId) {
  try {
    // Update any pending transactions to cancelled
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .in('status', ['pending', 'processing']);

    if (error) {
      throw new PaymentError(
        'Failed to cleanup pending transactions',
        ERROR_TYPES.DATABASE_ERROR,
        ERROR_SEVERITY.MEDIUM,
        { orderId, error }
      );
    }
  } catch (error) {
    await logPaymentError(error, { orderId });
    throw error;
  }
}

// Validate payment request
export function validatePaymentRequest(req) {
  const errors = [];

  // Check required fields
  const requiredFields = ['amount', 'currency', 'orderId'];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate amount
  if (req.body.amount && (isNaN(req.body.amount) || req.body.amount <= 0)) {
    errors.push('Amount must be a positive number');
  }

  // Validate currency
  if (req.body.currency && !['KRW', 'USD'].includes(req.body.currency)) {
    errors.push('Currency must be KRW or USD');
  }

  // Validate order ID format
  if (req.body.orderId && !/^[a-zA-Z0-9_-]+$/.test(req.body.orderId)) {
    errors.push('Order ID contains invalid characters');
  }

  if (errors.length > 0) {
    throw new PaymentError(
      'Payment request validation failed',
      ERROR_TYPES.VALIDATION_ERROR,
      ERROR_SEVERITY.MEDIUM,
      { validationErrors: errors }
    );
  }

  return true;
}

// Create standardized error response
export function createErrorResponse(error, statusCode = 500) {
  const response = {
    success: false,
    error: {
      type: error.type || ERROR_TYPES.SYSTEM_ERROR,
      message: error.message || 'An unexpected error occurred',
      severity: error.severity || ERROR_SEVERITY.MEDIUM,
      timestamp: new Date().toISOString()
    }
  };

  // Add details for development environment
  if (process.env.NODE_ENV === 'development') {
    response.error.details = error.details;
    response.error.stack = error.stack;
  }

  return { response, statusCode };
}

// Send critical error alert (placeholder for notification system)
async function sendCriticalErrorAlert(errorLog) {
  // This would integrate with your notification system
  // For now, just log to console
  console.error('CRITICAL PAYMENT ERROR ALERT:', errorLog);
  
  // You could integrate with services like:
  // - Email notifications
  // - Slack webhooks
  // - SMS alerts
  // - Error tracking services (Sentry, etc.)
}

// Network timeout wrapper
export function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new PaymentError(
          `Operation timed out after ${timeoutMs}ms`,
          ERROR_TYPES.TIMEOUT_ERROR,
          ERROR_SEVERITY.HIGH
        ));
      }, timeoutMs);
    })
  ]);
}

// Safe async operation wrapper
export async function safeAsyncOperation(operation, context = {}) {
  try {
    return await operation();
  } catch (error) {
    const paymentError = error instanceof PaymentError 
      ? error 
      : new PaymentError(
          error.message || 'Unknown error occurred',
          ERROR_TYPES.SYSTEM_ERROR,
          ERROR_SEVERITY.MEDIUM,
          { originalError: error }
        );

    await logPaymentError(paymentError, context);
    throw paymentError;
  }
}

export default {
  PaymentError,
  PaymentRequestController,
  paymentRequestController,
  retryPaymentOperation,
  logPaymentError,
  handlePaymentCancellation,
  cleanupPendingTransactions,
  validatePaymentRequest,
  createErrorResponse,
  withTimeout,
  safeAsyncOperation,
  ERROR_TYPES,
  ERROR_SEVERITY,
  RETRY_CONFIG
};