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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      creditos: {
        Row: {
          created_at: string
          creditos_recebidos_kwh: number | null
          creditos_utilizados_kwh: number | null
          id: string
          mes_referencia: string
          saldo_anterior_kwh: number | null
          saldo_atual_kwh: number | null
          unidade_id: string
          user_id: string
          validade: string | null
        }
        Insert: {
          created_at?: string
          creditos_recebidos_kwh?: number | null
          creditos_utilizados_kwh?: number | null
          id?: string
          mes_referencia: string
          saldo_anterior_kwh?: number | null
          saldo_atual_kwh?: number | null
          unidade_id: string
          user_id?: string
          validade?: string | null
        }
        Update: {
          created_at?: string
          creditos_recebidos_kwh?: number | null
          creditos_utilizados_kwh?: number | null
          id?: string
          mes_referencia?: string
          saldo_anterior_kwh?: number | null
          saldo_atual_kwh?: number | null
          unidade_id?: string
          user_id?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creditos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          arquivo_url: string | null
          consumo_kwh: number | null
          created_at: string
          energia_compensada_kwh: number | null
          energia_injetada_kwh: number | null
          id: string
          mes_referencia: string
          unidade_id: string
          user_id: string
          valor_total: number | null
          vencimento: string | null
        }
        Insert: {
          arquivo_url?: string | null
          consumo_kwh?: number | null
          created_at?: string
          energia_compensada_kwh?: number | null
          energia_injetada_kwh?: number | null
          id?: string
          mes_referencia: string
          unidade_id: string
          user_id?: string
          valor_total?: number | null
          vencimento?: string | null
        }
        Update: {
          arquivo_url?: string | null
          consumo_kwh?: number | null
          created_at?: string
          energia_compensada_kwh?: number | null
          energia_injetada_kwh?: number | null
          id?: string
          mes_referencia?: string
          unidade_id?: string
          user_id?: string
          valor_total?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faturas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
        ]
      }
      geracao_solar: {
        Row: {
          created_at: string
          energia_injetada_kwh: number | null
          geracao_kwh: number
          id: string
          mes_referencia: string
          observacoes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          energia_injetada_kwh?: number | null
          geracao_kwh: number
          id?: string
          mes_referencia: string
          observacoes?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          energia_injetada_kwh?: number | null
          geracao_kwh?: number
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rateios: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          percentual: number
          unidade_id: string
          user_id: string
          vigencia_inicio: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual: number
          unidade_id: string
          user_id?: string
          vigencia_inicio: string
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual?: number
          unidade_id?: string
          user_id?: string
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "rateios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_consumidoras: {
        Row: {
          ativa: boolean
          created_at: string
          endereco: string | null
          geradora: boolean
          id: string
          nome: string
          numero_uc: string
          percentual_rateio: number | null
          titular: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          endereco?: string | null
          geradora?: boolean
          id?: string
          nome: string
          numero_uc: string
          percentual_rateio?: number | null
          titular?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          endereco?: string | null
          geradora?: boolean
          id?: string
          nome?: string
          numero_uc?: string
          percentual_rateio?: number | null
          titular?: string | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
