import { supabase } from "@/integrations/supabase/client";

type AuditAction = 
  | 'view_users_list'
  | 'view_user_security'
  | 'view_user_contacts'
  | 'view_orders'
  | 'update_wallet'
  | 'update_order_status';

type ResourceType = 'users' | 'orders' | 'wallets' | 'user_contacts' | 'security';

interface AuditLogParams {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const logAction = async ({ action, resourceType, resourceId, details }: AuditLogParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user for audit log');
        return;
      }

      // Use type assertion to handle the dynamic table
      const { error } = await supabase
        .from('audit_logs' as any)
        .insert({
          admin_id: user.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId || null,
          details: details || null,
        } as any);

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (err) {
      console.error('Audit log error:', err);
    }
  };

  return { logAction };
};
