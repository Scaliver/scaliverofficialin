export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      auction_bids: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          bid_increment: number
          created_at: string
          created_by: string | null
          current_bid: number
          current_bidder_id: string | null
          description: string | null
          ends_at: string
          id: string
          image_url: string | null
          paid: boolean
          starting_price: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          bid_increment?: number
          created_at?: string
          created_by?: string | null
          current_bid?: number
          current_bidder_id?: string | null
          description?: string | null
          ends_at: string
          id?: string
          image_url?: string | null
          paid?: boolean
          starting_price?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          bid_increment?: number
          created_at?: string
          created_by?: string | null
          current_bid?: number
          current_bidder_id?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          image_url?: string | null
          paid?: boolean
          starting_price?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          max_multiplier: number
          multipliers_enabled: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_multiplier?: number
          multipliers_enabled?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_multiplier?: number
          multipliers_enabled?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coin_packages: {
        Row: {
          amount: number
          bonus: number
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          bonus?: number
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          bonus?: number
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      crypto_deposit_logs: {
        Row: {
          amount: number | null
          created_at: string
          crypto_order_id: string | null
          details: Json
          error_message: string | null
          id: string
          order_reference: string | null
          status: string
          step: string
          transaction_hash: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          crypto_order_id?: string | null
          details?: Json
          error_message?: string | null
          id?: string
          order_reference?: string | null
          status?: string
          step: string
          transaction_hash?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          crypto_order_id?: string | null
          details?: Json
          error_message?: string | null
          id?: string
          order_reference?: string | null
          status?: string
          step?: string
          transaction_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crypto_orders: {
        Row: {
          amount: number
          amount_paid: number | null
          bonus_coins: number | null
          completed_at: string | null
          created_at: string
          credited: boolean
          currency: string
          error_message: string | null
          expires_at: string | null
          external_order_id: string | null
          id: string
          metadata: Json | null
          network: string
          notes: string | null
          order_reference: string
          player_id: string | null
          product_id: string | null
          redirect_path: string | null
          request_type: string
          status: string
          tier_id: string | null
          total_coins: number | null
          transaction_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
          zone_id: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          bonus_coins?: number | null
          completed_at?: string | null
          created_at?: string
          credited?: boolean
          currency?: string
          error_message?: string | null
          expires_at?: string | null
          external_order_id?: string | null
          id?: string
          metadata?: Json | null
          network?: string
          notes?: string | null
          order_reference: string
          player_id?: string | null
          product_id?: string | null
          redirect_path?: string | null
          request_type?: string
          status?: string
          tier_id?: string | null
          total_coins?: number | null
          transaction_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
          zone_id?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          bonus_coins?: number | null
          completed_at?: string | null
          created_at?: string
          credited?: boolean
          currency?: string
          error_message?: string | null
          expires_at?: string | null
          external_order_id?: string | null
          id?: string
          metadata?: Json | null
          network?: string
          notes?: string | null
          order_reference?: string
          player_id?: string | null
          product_id?: string | null
          redirect_path?: string | null
          request_type?: string
          status?: string
          tier_id?: string | null
          total_coins?: number | null
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      crypto_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_overrides: {
        Row: {
          hidden: boolean
          manual_rank: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          hidden?: boolean
          manual_rank?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          hidden?: boolean
          manual_rank?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: string
          contact_number: string
          created_at: string
          id: string
          payment_request_id: string | null
          player_name: string | null
          price: number
          product_id: string
          product_name: string
          smm_order_id: string | null
          status: string
          updated_at: string
          user_game_id: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          amount: string
          contact_number: string
          created_at?: string
          id?: string
          payment_request_id?: string | null
          player_name?: string | null
          price: number
          product_id: string
          product_name: string
          smm_order_id?: string | null
          status?: string
          updated_at?: string
          user_game_id: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          amount?: string
          contact_number?: string
          created_at?: string
          id?: string
          payment_request_id?: string | null
          player_name?: string | null
          price?: number
          product_id?: string
          product_name?: string
          smm_order_id?: string | null
          status?: string
          updated_at?: string
          user_game_id?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          amount: string
          bonus: string | null
          created_at: string
          id: string
          is_active: boolean
          price: number
          product_id: string
          provider_id: string | null
          provider_product_id: string | null
          quantity: number | null
          smm_service_id: string | null
          sort_order: number
        }
        Insert: {
          amount: string
          bonus?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price: number
          product_id: string
          provider_id?: string | null
          provider_product_id?: string | null
          quantity?: number | null
          smm_service_id?: string | null
          sort_order?: number
        }
        Update: {
          amount?: string
          bonus?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price?: number
          product_id?: string
          provider_id?: string | null
          provider_product_id?: string | null
          quantity?: number | null
          smm_service_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_tiers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "smm_apis"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          game_code: string | null
          id: string
          image_url: string | null
          in_stock: boolean
          instructions: string[] | null
          is_social_media: boolean
          is_stackable: boolean
          max_quantity: number
          name: string
          requires_char_name: boolean
          requires_player_id: boolean
          requires_server_id: boolean
          server_mode: string
          server_options: Json
          slug: string
          sort_order: number
          sub_category: string | null
          updated_at: string
          username_check_required: boolean
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          game_code?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          instructions?: string[] | null
          is_social_media?: boolean
          is_stackable?: boolean
          max_quantity?: number
          name: string
          requires_char_name?: boolean
          requires_player_id?: boolean
          requires_server_id?: boolean
          server_mode?: string
          server_options?: Json
          slug: string
          sort_order?: number
          sub_category?: string | null
          updated_at?: string
          username_check_required?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          game_code?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          instructions?: string[] | null
          is_social_media?: boolean
          is_stackable?: boolean
          max_quantity?: number
          name?: string
          requires_char_name?: boolean
          requires_player_id?: boolean
          requires_server_id?: boolean
          server_mode?: string
          server_options?: Json
          slug?: string
          sort_order?: number
          sub_category?: string | null
          updated_at?: string
          username_check_required?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      redeem_code_redemptions: {
        Row: {
          code_id: string
          coins_credited: number
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          coins_credited: number
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          coins_credited?: number
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      redeem_codes: {
        Row: {
          code: string
          coins: number
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          coins: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          coins?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      reseller_prices: {
        Row: {
          created_at: string
          id: string
          price: number
          tier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          tier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          tier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_alerts: {
        Row: {
          alert_type: string
          created_at: string
          created_by: string | null
          cta_label: string
          id: string
          image_url: string | null
          is_active: boolean
          message: string
          redirect_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          message: string
          redirect_url?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          message?: string
          redirect_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      smm_apis: {
        Row: {
          api_key: string
          api_type: string
          api_url: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          api_key: string
          api_type?: string
          api_url: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_type?: string
          api_url?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      upi_payment_requests: {
        Row: {
          amount: number
          auction_id: string | null
          bonus_coins: number | null
          created_at: string
          id: string
          is_social_media: boolean | null
          player_id: string | null
          player_name: string | null
          product_id: string | null
          product_name: string | null
          product_pack: string | null
          provider_id: string | null
          provider_product_id: string | null
          redirect_path: string | null
          request_type: string
          smm_quantity: number | null
          smm_service_id: string | null
          status: string
          tier_id: string | null
          total_coins: number | null
          updated_at: string
          user_email: string | null
          user_id: string | null
          utr_number: string
          zone_id: string | null
        }
        Insert: {
          amount: number
          auction_id?: string | null
          bonus_coins?: number | null
          created_at?: string
          id?: string
          is_social_media?: boolean | null
          player_id?: string | null
          player_name?: string | null
          product_id?: string | null
          product_name?: string | null
          product_pack?: string | null
          provider_id?: string | null
          provider_product_id?: string | null
          redirect_path?: string | null
          request_type?: string
          smm_quantity?: number | null
          smm_service_id?: string | null
          status?: string
          tier_id?: string | null
          total_coins?: number | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          utr_number: string
          zone_id?: string | null
        }
        Update: {
          amount?: number
          auction_id?: string | null
          bonus_coins?: number | null
          created_at?: string
          id?: string
          is_social_media?: boolean | null
          player_id?: string | null
          player_name?: string | null
          product_id?: string | null
          product_name?: string | null
          product_pack?: string | null
          provider_id?: string | null
          provider_product_id?: string | null
          redirect_path?: string | null
          request_type?: string
          smm_quantity?: number | null
          smm_service_id?: string | null
          status?: string
          tier_id?: string | null
          total_coins?: number | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          utr_number?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      user_contacts: {
        Row: {
          address: string | null
          created_at: string
          id: string
          phone: string | null
          phone_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_credit_crypto_wallet: {
        Args: { p_amount: number; p_note?: string; p_user_id: string }
        Returns: Json
      }
      admin_set_crypto_order_status: {
        Args: { p_new_status: string; p_order_id: string }
        Returns: Json
      }
      credit_crypto_wallet: {
        Args: { p_amount: number; p_order_reference: string; p_user_id: string }
        Returns: boolean
      }
      debit_crypto_wallet: {
        Args: { p_amount: number; p_reference: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_crypto_deposit: {
        Args: {
          p_amount: number
          p_order_reference: string
          p_payload?: Json
          p_source?: string
          p_status?: string
          p_transaction_hash: string
          p_user_id: string
        }
        Returns: Json
      }
      process_order_payment: {
        Args: {
          p_amount: number
          p_description: string
          p_order_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      redeem_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user" | "reseller"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "reseller"],
    },
  },
} as const
