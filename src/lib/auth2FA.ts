import { supabase } from './supabase';
import { toast } from 'sonner';

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  token: string;
  backupCode?: string;
}

export interface AdminSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  last_activity: string;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: 'login_success' | 'login_failed' | 'logout' | '2fa_enabled' | '2fa_disabled' | 'password_changed' | 'suspicious_activity';
  ip_address?: string;
  user_agent?: string;
  details: any;
  created_at: string;
}

class Auth2FAService {
  private static instance: Auth2FAService;

  public static getInstance(): Auth2FAService {
    if (!Auth2FAService.instance) {
      Auth2FAService.instance = new Auth2FAService();
    }
    return Auth2FAService.instance;
  }

  // Generate 2FA secret and QR code
  async setup2FA(userId: string): Promise<TwoFactorSetup | null> {
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to setup 2FA');
      }

      const data = await response.json();
      return data.setup;
    } catch (error) {
      console.error('2FA setup error:', error);
      toast.error('Failed to setup 2FA');
      return null;
    }
  }

  // Verify 2FA token and enable 2FA
  async enable2FA(userId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId, token })
      });

      if (!response.ok) {
        throw new Error('Failed to enable 2FA');
      }

      const data = await response.json();
      if (data.success) {
        toast.success('2FA enabled successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('2FA enable error:', error);
      toast.error('Failed to enable 2FA');
      return false;
    }
  }

  // Disable 2FA
  async disable2FA(userId: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId, password })
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      const data = await response.json();
      if (data.success) {
        toast.success('2FA disabled successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('2FA disable error:', error);
      toast.error('Failed to disable 2FA');
      return false;
    }
  }

  // Verify 2FA token during login
  async verify2FA(userId: string, verification: TwoFactorVerification): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, ...verification })
      });

      if (!response.ok) {
        throw new Error('Failed to verify 2FA');
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  }

  // Check if user has 2FA enabled
  async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('is_enabled')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking 2FA status:', error);
        return false;
      }

      return data?.is_enabled || false;
    } catch (error) {
      console.error('2FA status check error:', error);
      return false;
    }
  }

  // Generate backup codes
  async generateBackupCodes(userId: string): Promise<string[]> {
    try {
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to generate backup codes');
      }

      const data = await response.json();
      return data.backupCodes;
    } catch (error) {
      console.error('Backup codes generation error:', error);
      toast.error('Failed to generate backup codes');
      return [];
    }
  }

  // Admin session management
  async createAdminSession(userId: string, ipAddress?: string, userAgent?: string): Promise<AdminSession | null> {
    try {
      const response = await fetch('/api/auth/admin/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId, ipAddress, userAgent })
      });

      if (!response.ok) {
        throw new Error('Failed to create admin session');
      }

      const data = await response.json();
      return data.session;
    } catch (error) {
      console.error('Admin session creation error:', error);
      return null;
    }
  }

  // Validate admin session
  async validateAdminSession(sessionToken: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/admin/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionToken })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid;
    } catch (error) {
      console.error('Admin session validation error:', error);
      return false;
    }
  }

  // Revoke admin session
  async revokeAdminSession(sessionToken: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/admin/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sessionToken })
      });

      if (!response.ok) {
        throw new Error('Failed to revoke admin session');
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Admin session revocation error:', error);
      return false;
    }
  }

  // Get active admin sessions
  async getAdminSessions(userId: string): Promise<AdminSession[]> {
    try {
      const { data, error } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Admin sessions fetch error:', error);
      return [];
    }
  }

  // Log security event
  async logSecurityEvent(
    userId: string,
    eventType: SecurityEvent['event_type'],
    details: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          ip_address: ipAddress,
          user_agent: userAgent,
          details
        });

      if (error) {
        console.error('Error logging security event:', error);
      }
    } catch (error) {
      console.error('Security event logging error:', error);
    }
  }

  // Get security events
  async getSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching security events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Security events fetch error:', error);
      return [];
    }
  }

  // Change password with security logging
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password change error:', error);
        toast.error('Failed to change password');
        return false;
      }

      // Log security event
      await this.logSecurityEvent(
        userId,
        'password_changed',
        { timestamp: new Date().toISOString() },
        undefined,
        navigator.userAgent
      );

      toast.success('Password changed successfully');
      return true;
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
      return false;
    }
  }

  // Enhanced admin login with 2FA
  async adminLogin(email: string, password: string, twoFactorToken?: string): Promise<{
    success: boolean;
    requires2FA?: boolean;
    userId?: string;
    sessionToken?: string;
    error?: string;
  }> {
    try {
      // First, authenticate with email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Authentication failed' };
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role)) {
        await supabase.auth.signOut();
        return { success: false, error: 'Access denied' };
      }

      // Check if 2FA is enabled
      const is2FAEnabled = await this.is2FAEnabled(data.user.id);

      if (is2FAEnabled) {
        if (!twoFactorToken) {
          return { success: false, requires2FA: true, userId: data.user.id };
        }

        // Verify 2FA token
        const is2FAValid = await this.verify2FA(data.user.id, { token: twoFactorToken });
        if (!is2FAValid) {
          await supabase.auth.signOut();
          return { success: false, error: 'Invalid 2FA token' };
        }
      }

      // Create admin session
      const adminSession = await this.createAdminSession(
        data.user.id,
        undefined, // IP address will be set on server side
        navigator.userAgent
      );

      if (!adminSession) {
        await supabase.auth.signOut();
        return { success: false, error: 'Failed to create admin session' };
      }

      // Log successful admin login
      await this.logSecurityEvent(
        data.user.id,
        'login_success',
        { 
          loginType: 'admin',
          with2FA: is2FAEnabled,
          timestamp: new Date().toISOString()
        },
        undefined,
        navigator.userAgent
      );

      return {
        success: true,
        userId: data.user.id,
        sessionToken: adminSession.session_token
      };
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  // Enhanced admin logout
  async adminLogout(sessionToken?: string): Promise<boolean> {
    try {
      // Revoke admin session if provided
      if (sessionToken) {
        await this.revokeAdminSession(sessionToken);
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        return false;
      }

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('admin_session_token');

      return true;
    } catch (error) {
      console.error('Admin logout error:', error);
      return false;
    }
  }

  // Session timeout management
  async refreshAdminSession(sessionToken: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/admin/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionToken })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }
}

export const auth2FA = Auth2FAService.getInstance();