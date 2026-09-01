// Hand-written to match supabase/migrations/20260702000000_init_schema.sql.
// Regenerate with `supabase gen types typescript` once the project is linked.

export type LogType =
  | "environmental"
  | "watering"
  | "nutrition"
  | "observation"
  | "transplant"
  | "training"
  | "sanidad"
  | "cosecha";

export type PlantType = "autofloreciente" | "fotoperiodica";

// De dónde salió la planta. Un esqueje no germina: enraíza y arranca el
// ciclo con tejido adulto (ver src/lib/grows/cycle.ts).
export type PlantOrigin = "semilla" | "esqueje";

export type SubstrateType = "tierra" | "coco" | "hidroponia" | "mix";

export type GrowEnvironment = "interior" | "exterior" | "invernadero";

export type LightType = "led" | "hps" | "cfl" | "natural" | "otro";

export type Variety =
  | "indica"
  | "sativa"
  | "hibrida_sativa"
  | "hibrida_indica";

export type PartnerSubmissionStatus = "pending" | "approved" | "rejected";

export interface EnvironmentalLogData {
  temperature_c?: number;
  humidity_pct?: number;
  ec?: number;
  ph?: number;
}

export interface WateringLogData {
  volume_l: number;
}

export interface NutritionLogData {
  product: string;
  dose: string;
}

export interface ObservationLogData {
  notes: string;
}

export interface TransplantLogData {
  new_volume_l: number;
}

export interface TrainingLogData {
  technique: string;
  notes?: string;
}

export interface SanidadLogData {
  issue: string;
  severity: "leve" | "moderada" | "severa";
  notes?: string;
}

export interface HarvestLogData {
  dry_weight_g: number;
  wet_weight_g?: number;
  notes?: string;
}

// Cualquier log puede llevar fotos (paths en Storage), ortogonal a su tipo.
export interface WithPhotos {
  photos?: string[];
}

export type LogData = (
  | EnvironmentalLogData
  | WateringLogData
  | NutritionLogData
  | ObservationLogData
  | TransplantLogData
  | TrainingLogData
  | SanidadLogData
  | HarvestLogData
) &
  WithPhotos;

export interface Database {
  public: {
    Tables: {
      grows: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          genetics: string;
          plant_type: PlantType;
          origin: PlantOrigin;
          variety: Variety | null;
          plant_count: number;
          substrate: SubstrateType;
          environment: GrowEnvironment;
          light_type: LightType | null;
          light_schedule: string | null;
          space_id: string | null;
          start_date: string;
          initial_pot_volume_l: number;
          current_pot_volume_l: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          genetics: string;
          plant_type?: PlantType;
          origin?: PlantOrigin;
          variety?: Variety | null;
          plant_count?: number;
          substrate?: SubstrateType;
          environment?: GrowEnvironment;
          light_type?: LightType | null;
          light_schedule?: string | null;
          space_id?: string | null;
          start_date: string;
          initial_pot_volume_l: number;
          current_pot_volume_l?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["grows"]["Insert"]>;
        Relationships: [];
      };
      logs: {
        Row: {
          id: string;
          grow_id: string;
          user_id: string;
          plant_id: string | null;
          type: LogType;
          log_date: string;
          data: LogData | Record<string, never>;
          created_at: string;
        };
        Insert: {
          id?: string;
          grow_id: string;
          user_id?: string;
          plant_id?: string | null;
          type: LogType;
          log_date?: string;
          data: LogData;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "logs_grow_id_fkey";
            columns: ["grow_id"];
            isOneToOne: false;
            referencedRelation: "grows";
            referencedColumns: ["id"];
          },
        ];
      };
      plants: {
        Row: {
          id: string;
          grow_id: string;
          user_id: string;
          label: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          grow_id: string;
          user_id?: string;
          label: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "plants_grow_id_fkey";
            columns: ["grow_id"];
            isOneToOne: false;
            referencedRelation: "grows";
            referencedColumns: ["id"];
          },
        ];
      };
      spaces: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          width_cm: number;
          depth_cm: number;
          height_cm: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          width_cm: number;
          depth_cm: number;
          height_cm?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["spaces"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["push_subscriptions"]["Insert"]
        >;
        Relationships: [];
      };
      sent_reminders: {
        Row: {
          id: string;
          grow_id: string;
          kind: string;
          dedupe_key: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          grow_id: string;
          kind: string;
          dedupe_key: string;
          sent_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sent_reminders"]["Insert"]
        >;
        Relationships: [];
      };
      partners: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          city: string | null;
          province: string | null;
          url: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string;
          description?: string | null;
          city?: string | null;
          province?: string | null;
          url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["partners"]["Insert"]>;
        Relationships: [];
      };
      partner_submissions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          description: string | null;
          city: string | null;
          province: string | null;
          url: string | null;
          status: PartnerSubmissionStatus;
          review_note: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          category?: string;
          description?: string | null;
          city?: string | null;
          province?: string | null;
          url?: string | null;
          status?: PartnerSubmissionStatus;
          review_note?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["partner_submissions"]["Insert"]
        >;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          reprocann_expires_on: string | null;
          forum_alias: string | null;
          forum_dms_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          reprocann_expires_on?: string | null;
          forum_alias?: string | null;
          forum_dms_enabled?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          sender_alias: string;
          recipient_alias: string;
          // Cifrado de extremo a extremo: el servidor nunca ve el texto. Los
          // alias sí van en claro — son seudónimos y el trigger los necesita.
          ciphertext: string;
          iv: string;
          read_at: string | null;
          // Borrado unilateral: cada parte oculta su propia copia de la fila.
          deleted_by_sender_at: string | null;
          deleted_by_recipient_at: string | null;
          created_at: string;
        };
        // sender_alias/recipient_alias los fuerza un trigger SECURITY DEFINER
        // desde user_settings: por eso son opcionales en el Insert.
        Insert: {
          id?: string;
          sender_id?: string;
          recipient_id: string;
          sender_alias?: string;
          recipient_alias?: string;
          ciphertext: string;
          iv: string;
          read_at?: string | null;
          deleted_by_sender_at?: string | null;
          deleted_by_recipient_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["direct_messages"]["Insert"]
        >;
        Relationships: [];
      };
      forum_threads: {
        // author_id es null si el autor borró su cuenta (on delete set null):
        // el mensaje queda publicado bajo su author_alias.
        Row: {
          id: string;
          author_id: string | null;
          author_alias: string;
          title: string;
          body: string;
          category: string;
          created_at: string;
          updated_at: string;
        };
        // author_alias lo fuerza un trigger desde user_settings.forum_alias:
        // por eso es opcional en el Insert. category tiene default 'general'
        // en la DB.
        Insert: {
          id?: string;
          author_id?: string;
          author_alias?: string;
          title: string;
          body: string;
          category?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["forum_threads"]["Insert"]
        >;
        Relationships: [];
      };
      forum_posts: {
        // author_id null = autor con cuenta borrada (igual que forum_threads).
        Row: {
          id: string;
          thread_id: string;
          author_id: string | null;
          author_alias: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          author_id?: string;
          author_alias?: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["forum_posts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "forum_posts_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "forum_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      // Clave pública de cada usuario (E2E de los mensajes privados). No es
      // secreta: cualquier miembro la necesita para poder cifrarle.
      user_public_keys: {
        Row: {
          user_id: string;
          public_key: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          public_key: string;
          created_at?: string;
        };
        // Sin update ni delete en la base: rotar la pública dejaría ilegible
        // el historial del otro lado de cada conversación.
        Update: never;
        Relationships: [];
      };
      // Los sobres cerrados: la clave privada envuelta y la clave maestra en
      // dos copias (una la abre la contraseña, la otra la frase de
      // recuperación). Sin esos secretos, esto es ruido.
      user_key_vault: {
        Row: {
          user_id: string;
          public_key: string;
          wrapped_private_key: string;
          wrapped_private_key_iv: string;
          password_salt: string;
          password_wrapped_mk: string;
          password_wrapped_mk_iv: string;
          recovery_salt: string;
          recovery_wrapped_mk: string;
          recovery_wrapped_mk_iv: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          public_key: string;
          wrapped_private_key: string;
          wrapped_private_key_iv: string;
          password_salt: string;
          password_wrapped_mk: string;
          password_wrapped_mk_iv: string;
          recovery_salt: string;
          recovery_wrapped_mk: string;
          recovery_wrapped_mk_iv: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["user_key_vault"]["Insert"]
        >;
        Relationships: [];
      };
      // Alias de cuentas borradas: reservados para siempre (sus mensajes del
      // foro siguen publicados bajo ese nombre). Solo service role la toca.
      retired_aliases: {
        Row: {
          alias_lower: string;
          retired_at: string;
        };
        Insert: {
          alias_lower: string;
          retired_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["retired_aliases"]["Insert"]
        >;
        Relationships: [];
      };
      sent_user_reminders: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          dedupe_key: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          dedupe_key: string;
          sent_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sent_user_reminders"]["Insert"]
        >;
        Relationships: [];
      };
      analyses: {
        Row: {
          id: string;
          user_id: string;
          grow_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          grow_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analyses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "analyses_grow_id_fkey";
            columns: ["grow_id"];
            isOneToOne: false;
            referencedRelation: "grows";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      log_type: LogType;
      plant_type: PlantType;
      plant_origin: PlantOrigin;
      variety: Variety;
      // sanidad added via ALTER TYPE; reflected in LogType above.
      substrate_type: SubstrateType;
      grow_environment: GrowEnvironment;
      light_type: LightType;
    };
    CompositeTypes: Record<string, never>;
  };
}
