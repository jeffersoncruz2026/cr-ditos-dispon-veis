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
      alertas: {
        Row: {
          created_at: string
          id: string
          mensagem: string | null
          mes_referencia: string | null
          resolvido: boolean
          severidade: string
          tipo: string
          titulo: string
          unidade_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem?: string | null
          mes_referencia?: string | null
          resolvido?: boolean
          severidade?: string
          tipo: string
          titulo: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string | null
          mes_referencia?: string | null
          resolvido?: boolean
          severidade?: string
          tipo?: string
          titulo?: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
        ]
      }
      creditos: {
        Row: {
          created_at: string
          creditos_recebidos_kwh: number | null
          creditos_utilizados_kwh: number | null
          fatura_id: string | null
          id: string
          mes_referencia: string
          saldo_anterior_kwh: number | null
          saldo_atual_kwh: number | null
          unidade_id: string
          updated_at: string
          user_id: string
          validade: string | null
        }
        Insert: {
          created_at?: string
          creditos_recebidos_kwh?: number | null
          creditos_utilizados_kwh?: number | null
          fatura_id?: string | null
          id?: string
          mes_referencia: string
          saldo_anterior_kwh?: number | null
          saldo_atual_kwh?: number | null
          unidade_id: string
          updated_at?: string
          user_id?: string
          validade?: string | null
        }
        Update: {
          created_at?: string
          creditos_recebidos_kwh?: number | null
          creditos_utilizados_kwh?: number | null
          fatura_id?: string | null
          id?: string
          mes_referencia?: string
          saldo_anterior_kwh?: number | null
          saldo_atual_kwh?: number | null
          unidade_id?: string
          updated_at?: string
          user_id?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creditos_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
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
          bandeira_tarifaria: string | null
          consumo_kwh: number | null
          contrib_iluminacao: number | null
          created_at: string
          economia_estimada: number | null
          energia_compensada_kwh: number | null
          energia_injetada_kwh: number | null
          id: string
          mes_referencia: string
          status: string
          tarifa_kwh: number | null
          unidade_id: string
          updated_at: string
          user_id: string
          valor_total: number | null
          vencimento: string | null
        }
        Insert: {
          arquivo_url?: string | null
          bandeira_tarifaria?: string | null
          consumo_kwh?: number | null
          contrib_iluminacao?: number | null
          created_at?: string
          economia_estimada?: number | null
          energia_compensada_kwh?: number | null
          energia_injetada_kwh?: number | null
          id?: string
          mes_referencia: string
          status?: string
          tarifa_kwh?: number | null
          unidade_id: string
          updated_at?: string
          user_id?: string
          valor_total?: number | null
          vencimento?: string | null
        }
        Update: {
          arquivo_url?: string | null
          bandeira_tarifaria?: string | null
          consumo_kwh?: number | null
          contrib_iluminacao?: number | null
          created_at?: string
          economia_estimada?: number | null
          energia_compensada_kwh?: number | null
          energia_injetada_kwh?: number | null
          id?: string
          mes_referencia?: string
          status?: string
          tarifa_kwh?: number | null
          unidade_id?: string
          updated_at?: string
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
      fechamentos_mensais: {
        Row: {
          created_at: string
          fechado_em: string | null
          id: string
          mes_referencia: string
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fechado_em?: string | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          fechado_em?: string | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      geracao_solar: {
        Row: {
          created_at: string
          energia_injetada_kwh: number | null
          geracao_kwh: number
          id: string
          mes_referencia: string
          observacoes: string | null
          updated_at: string
          user_id: string
          usina_id: string | null
        }
        Insert: {
          created_at?: string
          energia_injetada_kwh?: number | null
          geracao_kwh: number
          id?: string
          mes_referencia: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string
          usina_id?: string | null
        }
        Update: {
          created_at?: string
          energia_injetada_kwh?: number | null
          geracao_kwh?: number
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string
          usina_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geracao_solar_usina_id_fkey"
            columns: ["usina_id"]
            isOneToOne: false
            referencedRelation: "usinas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rateio_configuracoes: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          updated_at: string
          user_id: string | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      rateios: {
        Row: {
          configuracao_id: string | null
          created_at: string
          id: string
          observacoes: string | null
          percentual: number
          unidade_id: string
          updated_at: string
          user_id: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          configuracao_id?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual: number
          unidade_id: string
          updated_at?: string
          user_id?: string
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          configuracao_id?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual?: number
          unidade_id?: string
          updated_at?: string
          user_id?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "rateios_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "rateio_configuracoes"
            referencedColumns: ["id"]
          },
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
          cidade: string | null
          classe: string | null
          created_at: string
          distribuidora: string
          endereco: string | null
          geradora: boolean
          id: string
          nome: string
          numero_uc: string
          observacoes: string | null
          percentual_rateio: number | null
          situacao: string
          tipo_ligacao: string | null
          titular: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativa?: boolean
          cidade?: string | null
          classe?: string | null
          created_at?: string
          distribuidora?: string
          endereco?: string | null
          geradora?: boolean
          id?: string
          nome: string
          numero_uc: string
          observacoes?: string | null
          percentual_rateio?: number | null
          situacao?: string
          tipo_ligacao?: string | null
          titular?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          ativa?: boolean
          cidade?: string | null
          classe?: string | null
          created_at?: string
          distribuidora?: string
          endereco?: string | null
          geradora?: boolean
          id?: string
          nome?: string
          numero_uc?: string
          observacoes?: string | null
          percentual_rateio?: number | null
          situacao?: string
          tipo_ligacao?: string | null
          titular?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      usinas: {
        Row: {
          ativa: boolean
          created_at: string
          data_instalacao: string | null
          id: string
          inversor: string | null
          nome: string
          potencia_kwp: number | null
          potencia_modulo_w: number | null
          quantidade_modulos: number | null
          unidade_geradora_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          data_instalacao?: string | null
          id?: string
          inversor?: string | null
          nome: string
          potencia_kwp?: number | null
          potencia_modulo_w?: number | null
          quantidade_modulos?: number | null
          unidade_geradora_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          data_instalacao?: string | null
          id?: string
          inversor?: string | null
          nome?: string
          potencia_kwp?: number | null
          potencia_modulo_w?: number | null
          quantidade_modulos?: number | null
          unidade_geradora_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usinas_unidade_geradora_id_fkey"
            columns: ["unidade_geradora_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aplicar_rateio: {
        Args: {
          _observacoes?: string
          _percentuais: Json
          _vigencia_inicio: string
        }
        Returns: string
      }
      can_write: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authorized: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operador" | "visualizador"
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
    Enums: {
      app_role: ["admin", "operador", "visualizador"],
    },
  },
} as const
