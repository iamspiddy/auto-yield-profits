import { supabase } from '@/integrations/supabase/client';

type AdminActionType = 'create' | 'update' | 'delete' | 'approve' | 'reject';
type EntityType = 'user' | 'deposit' | 'withdrawal' | 'profit' | 'referral';

/**
 * Utility for logging admin actions to the database
 */
export const adminLogger = {
  /**
   * Log an administrative action
   * @param adminId - The ID of the admin performing the action
   * @param actionType - The type of action being performed
   * @param entityType - The type of entity being acted upon
   * @param entityId - The ID of the entity being acted upon
   * @param details - Additional details about the action
   * @param ipAddress - The IP address of the admin (optional)
   * @returns The ID of the created log entry, or null if logging failed
   */
  async logAction(
    adminId: string,
    actionType: AdminActionType,
    entityType: EntityType,
    entityId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<string | null> {
    try {
      // Use the log_admin_action RPC function which handles both table creation and insertion
      const { data, error } = await supabase.rpc('log_admin_action', {
        p_admin_id: adminId,
        p_action_type: actionType,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_details: details,
        p_ip_address: ipAddress
      });

      if (error) {
        console.error('Error logging admin action:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error logging admin action:', error);
      return null;
    }
  },

  /**
   * Helper method to log a create action
   */
  async logCreate(
    adminId: string,
    entityType: EntityType,
    entityId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<string | null> {
    return this.logAction(adminId, 'create', entityType, entityId, details, ipAddress);
  },

  /**
   * Helper method to log an update action
   */
  async logUpdate(
    adminId: string,
    entityType: EntityType,
    entityId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<string | null> {
    return this.logAction(adminId, 'update', entityType, entityId, details, ipAddress);
  },

  /**
   * Helper method to log a delete action
   */
  async logDelete(
    adminId: string,
    entityType: EntityType,
    entityId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<string | null> {
    return this.logAction(adminId, 'delete', entityType, entityId, details, ipAddress);
  },

  /**
   * Helper method to log an approve action
   */
  async logApprove(
    adminId: string,
    entityType: EntityType,
    entityId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<string | null> {
    return this.logAction(adminId, 'approve', entityType, entityId, details, ipAddress);
  },

  /**
   * Helper method to log a reject action
   */
  async logReject(
    adminId: string,
    entityType: EntityType,
    entityId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<string | null> {
    return this.logAction(adminId, 'reject', entityType, entityId, details, ipAddress);
  },

  /**
   * Get the client's IP address from the request
   * Note: This is a simplified version and may not work in all environments
   * In a real application, you would get this from the request headers
   */
  getClientIp(): string {
    return '127.0.0.1'; // Placeholder for local development
  }
};