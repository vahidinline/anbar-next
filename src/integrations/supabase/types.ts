export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          details: Json | null;
          entity: string;
          entity_id: string | null;
          id: string;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          details?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: string;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          details?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          mobile: string | null;
          name: string;
          phone: string | null;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          mobile?: string | null;
          name: string;
          phone?: string | null;
          user_id: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          mobile?: string | null;
          name?: string;
          phone?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      inventory_documents: {
        Row: {
          contact_id: string | null;
          created_at: string;
          description: string | null;
          doc_number: number;
          document_date: string;
          document_type: string;
          id: string;
          product_group_id: string | null;
          product_id: string | null;
          quantity: number;
          unit: string | null;
          user_id: string;
          warehouse_id: string | null;
        };
        Insert: {
          contact_id?: string | null;
          created_at?: string;
          description?: string | null;
          doc_number?: number;
          document_date?: string;
          document_type: string;
          id?: string;
          product_group_id?: string | null;
          product_id?: string | null;
          quantity: number;
          unit?: string | null;
          user_id: string;
          warehouse_id?: string | null;
        };
        Update: {
          contact_id?: string | null;
          created_at?: string;
          description?: string | null;
          doc_number?: number;
          document_date?: string;
          document_type?: string;
          id?: string;
          product_group_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          unit?: string | null;
          user_id?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_documents_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_documents_product_group_id_fkey";
            columns: ["product_group_id"];
            isOneToOne: false;
            referencedRelation: "product_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_documents_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_groups: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          barcode: string | null;
          code: string;
          created_at: string;
          description: string | null;
          die_material: string | null;
          id: string;
          initial_quantity: number;
          is_serial_tracked: boolean;
          name: string;
          notes: string | null;
          product_group_id: string | null;
          tracking_notes: string | null;
          unit: string | null;
          user_id: string;
          warehouse_id: string | null;
        };
        Insert: {
          barcode?: string | null;
          code: string;
          created_at?: string;
          description?: string | null;
          die_material?: string | null;
          id?: string;
          initial_quantity?: number;
          is_serial_tracked?: boolean;
          name: string;
          notes?: string | null;
          product_group_id?: string | null;
          tracking_notes?: string | null;
          unit?: string | null;
          user_id: string;
          warehouse_id?: string | null;
        };
        Update: {
          barcode?: string | null;
          code?: string;
          created_at?: string;
          description?: string | null;
          die_material?: string | null;
          id?: string;
          initial_quantity?: number;
          is_serial_tracked?: boolean;
          name?: string;
          notes?: string | null;
          product_group_id?: string | null;
          tracking_notes?: string | null;
          unit?: string | null;
          user_id?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_product_group_id_fkey";
            columns: ["product_group_id"];
            isOneToOne: false;
            referencedRelation: "product_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      serial_numbers: {
        Row: {
          batch_number: string | null;
          created_at: string;
          id: string;
          inventory_document_id: string | null;
          invoice_number: string | null;
          outgoing_document_id: string | null;
          product_id: string;
          proforma_number: string | null;
          serial_number: string;
          status: string;
          user_id: string;
          warehouse_id: string | null;
        };
        Insert: {
          batch_number?: string | null;
          created_at?: string;
          id?: string;
          inventory_document_id?: string | null;
          invoice_number?: string | null;
          outgoing_document_id?: string | null;
          product_id: string;
          proforma_number?: string | null;
          serial_number: string;
          status?: string;
          user_id: string;
          warehouse_id?: string | null;
        };
        Update: {
          batch_number?: string | null;
          created_at?: string;
          id?: string;
          inventory_document_id?: string | null;
          invoice_number?: string | null;
          outgoing_document_id?: string | null;
          product_id?: string;
          proforma_number?: string | null;
          serial_number?: string;
          status?: string;
          user_id?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "serial_numbers_inventory_document_id_fkey";
            columns: ["inventory_document_id"];
            isOneToOne: false;
            referencedRelation: "inventory_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_outgoing_document_id_fkey";
            columns: ["outgoing_document_id"];
            isOneToOne: false;
            referencedRelation: "inventory_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      warehouses: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_read: { Args: { _user_id: string }; Returns: boolean };
      can_write: { Args: { _user_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "warehouse_keeper" | "sales";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "warehouse_keeper", "sales"],
    },
  },
} as const;
